const cache = new Map();
const userRateLimit = new Map();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('../db');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ================= MODEL FALLBACK CHAIN =================
// Mỗi model có quota riêng trên free tier → nếu 1 model bị limit, chuyển sang model khác
const MODELS = [
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-2.5-flash',
];

// Track model bị block (tránh gọi lại model đang bị limit)
const modelCooldown = new Map(); // model -> timestamp khi hết cooldown

function getAvailableModel() {
  const now = Date.now();
  for (const model of MODELS) {
    const cooldownUntil = modelCooldown.get(model) || 0;
    if (now >= cooldownUntil) {
      return model;
    }
  }
  // Tất cả đều bị limit → trả model đầu tiên (sẽ dùng fallback offline)
  return null;
}

function blockModel(model, durationMs) {
  modelCooldown.set(model, Date.now() + durationMs);
  console.log(`🚫 Model ${model} bị block ${Math.ceil(durationMs / 1000)}s`);
}

// ================= BOOK CATALOG (compact) =================
function getBooksCatalog() {
  return db.prepare(`
    SELECT b.id, b.title, b.author, b.price, b.stock, b.rating, b.tags, c.name as cat
    FROM books b LEFT JOIN categories c ON b.category_id = c.id
  `).all().map(b =>
    `[${b.id}] "${b.title}" - ${b.author} | ${b.cat} | ${b.price}đ | Kho:${b.stock} | ⭐${b.rating}`
  ).join('\n');
}

// ================= SYSTEM PROMPT =================
// Cache prompt 60s (sách không đổi thường xuyên)
let promptCache = { text: null, time: 0 };

function getSystemPrompt() {
  const now = Date.now();
  if (promptCache.text && now - promptCache.time < 60000) {
    return promptCache.text;
  }

  const prompt = `Bạn là BookBot 📚 - trợ lý AI của nhà sách "Nhà Sách Thông Minh".

QUY TẮC:
- Trả lời tiếng Việt, ngắn gọn, thân thiện, có emoji
- Dùng thông tin sách từ DANH MỤC bên dưới
- Khi cần hành động, thêm ở cuối: |||ACTION:TYPE:data|||

TYPE: SEARCH, ADD_CART, VIEW_CART, CHECKOUT, RECOMMEND, SHOW_BOOK
VD: |||ACTION:SEARCH:harry potter||| hoặc |||ACTION:ADD_CART:9:1|||
Chỉ dùng 1 ACTION duy nhất.

DANH MỤC SÁCH:
${getBooksCatalog()}`;

  promptCache = { text: prompt, time: now };
  return prompt;
}

// ================= CHAT HISTORY =================
let chatHistory = [];

// ================= RETRY WITH MODEL FALLBACK =================
async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function callGemini(message) {
  const maxRetries = 2;
  let lastError = null;

  // Thử từng model available
  for (let modelAttempt = 0; modelAttempt < MODELS.length; modelAttempt++) {
    const modelName = getAvailableModel();
    
    if (!modelName) {
      // Tất cả models đều bị limit
      console.log('⚠️ Tất cả models đều bị rate limit, dùng offline fallback');
      return null;
    }

    for (let retry = 0; retry <= maxRetries; retry++) {
      try {
        console.log(`📡 Gọi ${modelName} (retry ${retry})...`);
        
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: getSystemPrompt(),
        });

        const chat = model.startChat({
          history: chatHistory.slice(-4),
        });

        const result = await chat.sendMessage(message);
        const text = result.response.text();
        
        console.log(`✅ ${modelName} trả lời OK!`);
        return text;
      } catch (e) {
        lastError = e;

        if (e.status === 429) {
          // Lấy thời gian chờ từ API
          let waitSec = 10;
          const retryInfo = e.errorDetails?.find(
            d => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
          );
          if (retryInfo?.retryDelay) {
            waitSec = parseInt(retryInfo.retryDelay) || 10;
          }

          // Check nếu daily quota hết (limit: 0)
          const isDailyLimit = e.message?.includes('limit: 0');
          
          if (isDailyLimit) {
            // Block model này 1 giờ (daily quota hết)
            blockModel(modelName, 3600000);
            break; // Chuyển sang model khác
          }

          if (retry < maxRetries) {
            console.log(`⏳ ${modelName} rate limit → đợi ${waitSec}s`);
            await sleep(waitSec * 1000);
          } else {
            // Hết retry → block model 1 phút, chuyển sang model khác
            blockModel(modelName, 60000);
            break;
          }
        } else {
          // Lỗi khác (không phải rate limit) → throw luôn
          throw e;
        }
      }
    }
  }

  // Tất cả models đều thất bại
  console.error('❌ Tất cả models đều fail:', lastError?.message);
  return null; // Sẽ dùng offline fallback
}

// ================= OFFLINE FALLBACK (không cần API) =================
function offlineFallback(userMessage) {
  const msg = userMessage.toLowerCase();

  // Tìm sách
  if (msg.includes('tìm') || msg.includes('search') || msg.includes('có sách')) {
    const keyword = msg.replace(/tìm|search|sách|có|không|nào|cho|tôi|mình|giúp/gi, '').trim();
    const books = searchBooks(keyword || msg);
    return {
      text: books.length > 0 
        ? `📚 Mình tìm được ${books.length} cuốn sách cho bạn nè!`
        : '😅 Không tìm thấy sách phù hợp. Bạn thử từ khóa khác nhé!',
      action: 'SEARCH',
      books,
      cartItems: [],
    };
  }

  // Gợi ý
  if (msg.includes('gợi ý') || msg.includes('hay') || msg.includes('recommend') || msg.includes('đề xuất')) {
    const books = recommendBooks('');
    return {
      text: '🌟 Đây là những cuốn sách hay nhất mà mình muốn gợi ý cho bạn!',
      action: 'RECOMMEND',
      books,
      cartItems: [],
    };
  }

  // Giỏ hàng
  if (msg.includes('giỏ hàng') || msg.includes('cart')) {
    return {
      text: '🛒 Đây là giỏ hàng của bạn:',
      action: 'VIEW_CART',
      books: [],
      cartItems: [],
    };
  }

  // Thể loại cụ thể
  const categories = ['văn học', 'tiểu thuyết', 'khoa học', 'kinh doanh', 'tâm lý', 'lịch sử', 'thiếu nhi', 'manga', 'công nghệ', 'triết học'];
  const matchedCat = categories.find(c => msg.includes(c));
  if (matchedCat) {
    const books = searchBooks(matchedCat);
    return {
      text: `📚 Sách ${matchedCat} hay cho bạn đây!`,
      action: 'SEARCH',
      books,
      cartItems: [],
    };
  }

  // Chào hỏi
  if (msg.includes('chào') || msg.includes('hello') || msg.includes('hi') || msg.includes('xin chào')) {
    const books = recommendBooks('best-seller');
    return {
      text: '👋 Xin chào! Mình là BookBot 📚\n\nMình có thể giúp bạn:\n🔍 Tìm sách theo tên, tác giả\n🌟 Gợi ý sách hay\n💬 Hỏi giá, tồn kho\n🛒 Thêm vào giỏ & đặt hàng\n\nĐây là một số sách hot nè:',
      action: 'RECOMMEND',
      books,
      cartItems: [],
    };
  }

  // Default: gợi ý sách hot
  const books = recommendBooks('');
  return {
    text: '📚 Mình chưa hiểu rõ lắm, nhưng đây là sách hot nhất shop!\n\nBạn có thể thử:\n- "Tìm sách [tên/tác giả]"\n- "Gợi ý sách hay"\n- "Xem giỏ hàng"',
    action: 'RECOMMEND',
    books,
    cartItems: [],
  };
}

// ================= MAIN =================
async function getAIResponse(userMessage, sessionId = 'default') {
  try {
    // ✅ 1. validate
    if (!userMessage || !userMessage.trim()) {
      return fallback();
    }

    const cleanMsg = userMessage.trim();
    const cacheKey = cleanMsg.toLowerCase();

    // ✅ 2. rate limit user (anti spam)
    const now = Date.now();
    const lastCall = userRateLimit.get(sessionId) || 0;

    if (now - lastCall < 1500) {
      return {
        text: "⏳ Bạn thao tác nhanh quá 😅 thử lại sau 1-2s nhé!",
        action: null,
        books: [],
        cartItems: []
      };
    }

    userRateLimit.set(sessionId, now);

    // ✅ 3. cache (giảm call API)
    if (cache.has(cacheKey)) {
      console.log('📦 Cache hit:', cacheKey);
      return cache.get(cacheKey);
    }

    // ✅ 4. gọi Gemini (có fallback chain)
    const aiResponse = await callGemini(cleanMsg);

    let finalRes;

    if (aiResponse) {
      // AI trả lời OK → parse actions
      chatHistory.push(
        { role: "user", parts: [{ text: cleanMsg }] },
        { role: "model", parts: [{ text: aiResponse }] }
      );
      if (chatHistory.length > 8) {
        chatHistory = chatHistory.slice(-8);
      }

      finalRes = handleAction(aiResponse, sessionId, cleanMsg);
    } else {
      // Tất cả models bị limit → offline fallback
      console.log('🔌 Sử dụng offline fallback');
      finalRes = offlineFallback(cleanMsg);
    }

    // ✅ 5. cache 60s
    cache.set(cacheKey, finalRes);
    setTimeout(() => cache.delete(cacheKey), 60000);

    return finalRes;

  } catch (err) {
    console.error("Gemini error:", err.message);
    chatHistory = [];

    // Offline fallback khi có lỗi
    return offlineFallback(userMessage);
  }
}

// ================= PARSE ACTION =================
function handleAction(response, sessionId, userMessage) {
  let text = response;
  let action = null;
  let data = null;

  const match = response.match(/\|\|\|ACTION:([^|]+)\|\|\|/);

  if (match) {
    text = response.replace(match[0], '').trim();
    const parts = match[1].split(':');
    action = parts[0];
    data = parts.slice(1).join(':');
  }

  let books = [];
  let cartItems = [];

  switch (action) {
    case 'SEARCH':
      books = searchBooks(data || userMessage);
      break;

    case 'RECOMMEND':
      books = recommendBooks(data || '');
      break;

    case 'ADD_CART': {
      const [id, qty] = (data || '').split(':');
      if (id) {
        addToCart(sessionId, +id, +qty || 1);
        cartItems = getCartItems(sessionId);
      }
      break;
    }

    case 'VIEW_CART':
    case 'CHECKOUT':
      cartItems = getCartItems(sessionId);
      break;

    case 'SHOW_BOOK':
      books = getBookById(+data);
      break;
  }

  return { text, action, books, cartItems };
}

// ================= DB LOGIC =================

function searchBooks(query = '') {
  const q = `%${query}%`;
  return db.prepare(`
    SELECT b.*, c.name as category_name
    FROM books b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.title LIKE ? OR b.author LIKE ? OR b.tags LIKE ? OR c.name LIKE ?
    ORDER BY b.rating DESC
    LIMIT 10
  `).all(q, q, q, q);
}

function recommendBooks(tag = '') {
  const q = `%${tag}%`;

  let books = db.prepare(`
    SELECT b.*, c.name as category_name
    FROM books b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.tags LIKE ? OR c.name LIKE ?
    ORDER BY rating DESC
    LIMIT 6
  `).all(q, q);

  if (!books.length) {
    books = db.prepare(`
      SELECT b.*, c.name as category_name
      FROM books b
      LEFT JOIN categories c ON b.category_id = c.id
      ORDER BY rating DESC
      LIMIT 6
    `).all();
  }

  return books;
}

function getBookById(id) {
  const book = db.prepare(`
    SELECT b.*, c.name as category_name
    FROM books b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.id = ?
  `).get(id);

  return book ? [book] : [];
}

function addToCart(sessionId, bookId, quantity) {
  const exist = db.prepare(`
    SELECT * FROM cart_items WHERE session_id=? AND book_id=?
  `).get(sessionId, bookId);

  if (exist) {
    db.prepare(`
      UPDATE cart_items SET quantity = quantity + ? WHERE id=?
    `).run(quantity, exist.id);
  } else {
    db.prepare(`
      INSERT INTO cart_items(session_id, book_id, quantity)
      VALUES (?, ?, ?)
    `).run(sessionId, bookId, quantity);
  }
}

function getCartItems(sessionId) {
  return db.prepare(`
    SELECT ci.id, ci.quantity, b.id as book_id, b.title, b.author, b.price, b.cover_color
    FROM cart_items ci
    JOIN books b ON ci.book_id = b.id
    WHERE ci.session_id = ?
  `).all(sessionId);
}

// ================= FALLBACK =================
function fallback() {
  return {
    text: "😅 Lỗi nhẹ rồi, bạn thử lại giúp mình nha!",
    action: null,
    books: [],
    cartItems: []
  };
}

function resetChat() {
  chatHistory = [];
  cache.clear();
  modelCooldown.clear();
}

module.exports = { getAIResponse, resetChat };