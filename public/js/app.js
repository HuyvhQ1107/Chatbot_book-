// ═══════════════════════════════════════════════════
// Nhà Sách Thông Minh - Main Application
// ═══════════════════════════════════════════════════

const API_BASE = '';
const SESSION_ID = 'session_' + Math.random().toString(36).substr(2, 9);

// ═══ State ═══
let isWelcomeVisible = true;
let isLoading = false;
let cartCount = 0;

// ═══ DOM Elements ═══
const chatArea = document.getElementById('chatArea');
const messagesContainer = document.getElementById('messages');
const welcomeScreen = document.getElementById('welcomeScreen');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const cartBadge = document.getElementById('cartBadge');
const cartSidebar = document.getElementById('cartSidebar');
const cartOverlay = document.getElementById('cartOverlay');
const cartItems = document.getElementById('cartItems');
const cartEmpty = document.getElementById('cartEmpty');
const cartFooter = document.getElementById('cartFooter');
const totalAmount = document.getElementById('totalAmount');

// ═══ Init ═══
document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  loadCart();
  setupEventListeners();
});

function setupEventListeners() {
  // Send message
  messageInput.addEventListener('input', () => {
    sendBtn.disabled = messageInput.value.trim().length === 0;
  });

  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && messageInput.value.trim()) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener('click', sendMessage);

  // Suggestion chips & quick buttons
  document.querySelectorAll('.suggestion-chip, .quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      messageInput.value = btn.dataset.message;
      sendMessage();
    });
  });

  // Sidebar toggle
  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('active');
  });

  // Cart toggle
  document.getElementById('cartToggle').addEventListener('click', openCart);
  document.getElementById('cartClose').addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);

  // New chat
  document.getElementById('newChatBtn').addEventListener('click', resetChat);

  // Order modal
  document.getElementById('checkoutBtn').addEventListener('click', () => {
    document.getElementById('orderModal').style.display = 'flex';
  });

  document.getElementById('orderModalClose').addEventListener('click', () => {
    document.getElementById('orderModal').style.display = 'none';
  });

  document.getElementById('orderCancel').addEventListener('click', () => {
    document.getElementById('orderModal').style.display = 'none';
  });

  document.getElementById('orderConfirm').addEventListener('click', placeOrder);

  document.getElementById('orderSuccessClose').addEventListener('click', () => {
    document.getElementById('orderSuccessModal').style.display = 'none';
  });

  // Clear cart
  document.getElementById('clearCartBtn').addEventListener('click', clearCart);
}

// ═══ Categories ═══
async function loadCategories() {
  try {
    const res = await fetch(`${API_BASE}/api/books/categories`);
    const data = await res.json();
    const list = document.getElementById('categories-list');

    list.innerHTML = data.categories.map(cat => `
      <button class="category-item" data-message="Tìm sách ${cat.name}">
        <span>${cat.icon}</span>
        <span>${cat.name}</span>
        <span class="cat-count">${cat.book_count}</span>
      </button>
    `).join('');

    // Add click events to category items
    list.querySelectorAll('.category-item').forEach(item => {
      item.addEventListener('click', () => {
        messageInput.value = item.dataset.message;
        sendMessage();
        document.getElementById('sidebar').classList.remove('active');
      });
    });
  } catch (err) {
    console.error('Error loading categories:', err);
  }
}

// ═══ Chat ═══
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || isLoading) return;

  // Hide welcome screen
  if (isWelcomeVisible) {
    welcomeScreen.style.display = 'none';
    isWelcomeVisible = false;
  }

  // Add user message
  addMessage(text, 'user');
  messageInput.value = '';
  sendBtn.disabled = true;

  // Show typing
  isLoading = true;
  const typingEl = addTypingIndicator();

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, sessionId: SESSION_ID }),
    });

    const data = await res.json();

    // Remove typing
    typingEl.remove();
    isLoading = false;

    // Add bot response
    addMessage(data.text, 'bot', data.books, data.cartItems, data.action);

    // Update cart if needed
    if (data.action === 'ADD_CART' || data.action === 'VIEW_CART' || data.action === 'CHECKOUT') {
      loadCart();
    }

    if (data.action === 'CHECKOUT') {
      document.getElementById('orderModal').style.display = 'flex';
    }
  } catch (err) {
    typingEl.remove();
    isLoading = false;
    addMessage('😅 Xin lỗi, đã có lỗi xảy ra. Bạn thử lại nhé!', 'bot');
  }
}

function addMessage(text, sender, books = [], cartItems = [], action = null) {
  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${sender}`;

  const avatar = sender === 'bot' ? '📚' : '👤';
  const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  // Format text with markdown-like styling
  const formattedText = formatText(text);

  msgDiv.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">
      <div class="message-bubble">${formattedText}</div>
      ${books.length > 0 ? renderBookCards(books) : ''}
      ${action === 'VIEW_CART' && cartItems && cartItems.length > 0 ? renderCartInChat(cartItems) : ''}
      <span class="message-time">${time}</span>
    </div>
  `;

  messagesContainer.appendChild(msgDiv);
  scrollToBottom();

  // Attach events for book buttons
  msgDiv.querySelectorAll('.book-add-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const bookId = parseInt(btn.dataset.bookId);
      await addToCartDirect(bookId);
      btn.textContent = '✅ Đã thêm!';
      btn.style.background = 'var(--success)';
      btn.style.color = 'white';
      btn.style.borderColor = 'var(--success)';
      setTimeout(() => {
        btn.textContent = '🛒 Thêm vào giỏ';
        btn.style.background = '';
        btn.style.color = '';
        btn.style.borderColor = '';
      }, 2000);
    });
  });
}

function formatText(text) {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:rgba(99,102,241,0.2);padding:2px 6px;border-radius:4px;font-size:0.85em">$1</code>')
    .replace(/\n/g, '<br>');
}

function renderBookCards(books) {
  if (!books || books.length === 0) return '';

  return `
    <div class="book-cards-container">
      ${books.map(book => `
        <div class="book-card">
          <div class="book-cover" style="background: linear-gradient(135deg, ${book.cover_color}88, ${book.cover_color}44)">
            📖
          </div>
          <div class="book-info">
            <div class="book-title">${book.title}</div>
            <div class="book-author">${book.author}</div>
            <div class="book-meta">
              <div>
                <span class="book-price">${formatPrice(book.price)}</span>
                ${book.original_price ? `<span class="book-original-price">${formatPrice(book.original_price)}</span>` : ''}
              </div>
              <span class="book-rating">⭐ ${book.rating}</span>
            </div>
            <div class="book-stock ${book.stock < 5 ? 'low' : ''}">
              ${book.stock > 0 ? `📦 Còn ${book.stock} cuốn` : '❌ Hết hàng'}
            </div>
            <button class="book-add-btn" data-book-id="${book.id}" ${book.stock <= 0 ? 'disabled' : ''}>
              🛒 Thêm vào giỏ
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderCartInChat(items) {
  if (!items || items.length === 0) return '';
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return `
    <div class="message-bubble" style="background: var(--bg-tertiary); border-color: var(--accent-primary); margin-top: 4px;">
      <strong>🛒 Giỏ hàng của bạn:</strong><br><br>
      ${items.map(i => `📖 <strong>${i.title}</strong><br>` +
        `&nbsp;&nbsp;&nbsp;${i.quantity} x ${formatPrice(i.price)} = <strong>${formatPrice(i.price * i.quantity)}</strong>`
      ).join('<br><br>')}
      <br><br>
      <strong>💰 Tổng cộng: ${formatPrice(total)}</strong>
    </div>
  `;
}

function addTypingIndicator() {
  const div = document.createElement('div');
  div.className = 'message bot';
  div.innerHTML = `
    <div class="message-avatar">📚</div>
    <div class="message-content">
      <div class="message-bubble">
        <div class="typing-indicator">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
  messagesContainer.appendChild(div);
  scrollToBottom();
  return div;
}

function scrollToBottom() {
  chatArea.scrollTop = chatArea.scrollHeight;
}

// ═══ Cart ═══
async function loadCart() {
  try {
    const res = await fetch(`${API_BASE}/api/cart?sessionId=${SESSION_ID}`);
    const data = await res.json();
    updateCartUI(data);
  } catch (err) {
    console.error('Error loading cart:', err);
  }
}

async function addToCartDirect(bookId) {
  try {
    const res = await fetch(`${API_BASE}/api/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, sessionId: SESSION_ID }),
    });
    const data = await res.json();
    updateCartUI(data);

    // Bump animation
    cartBadge.classList.add('bump');
    setTimeout(() => cartBadge.classList.remove('bump'), 400);
  } catch (err) {
    console.error('Error adding to cart:', err);
  }
}

function updateCartUI(data) {
  const { items, total, count } = data;
  cartCount = count || 0;
  cartBadge.textContent = cartCount;

  if (items && items.length > 0) {
    cartEmpty.style.display = 'none';
    cartFooter.style.display = 'block';
    totalAmount.textContent = formatPrice(total);

    const itemsHtml = items.map(item => `
      <div class="cart-item" data-id="${item.id}">
        <div class="cart-item-color" style="background: linear-gradient(135deg, ${item.cover_color}88, ${item.cover_color}44)">
          📖
        </div>
        <div class="cart-item-info">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-author">${item.author}</div>
          <div class="cart-item-bottom">
            <span class="cart-item-price">${formatPrice(item.price * item.quantity)}</span>
            <div class="cart-item-qty">
              <button class="qty-btn" onclick="updateCartItem(${item.id}, ${item.quantity - 1})">−</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn" onclick="updateCartItem(${item.id}, ${item.quantity + 1})">+</button>
            </div>
          </div>
        </div>
        <button class="cart-item-remove" onclick="removeCartItem(${item.id})">🗑️</button>
      </div>
    `).join('');

    // Keep the empty element but hidden, replace only the items
    cartItems.innerHTML = `<div id="cartEmpty" class="cart-empty" style="display:none;">
      <span>🛒</span><p>Giỏ hàng trống</p><small>Hãy thêm sách vào giỏ qua chat!</small>
    </div>` + itemsHtml;
  } else {
    cartItems.innerHTML = `<div id="cartEmpty" class="cart-empty">
      <span>🛒</span><p>Giỏ hàng trống</p><small>Hãy thêm sách vào giỏ qua chat!</small>
    </div>`;
    cartFooter.style.display = 'none';
  }
}

async function updateCartItem(id, newQty) {
  try {
    if (newQty <= 0) {
      await removeCartItem(id);
      return;
    }
    const res = await fetch(`${API_BASE}/api/cart/${id}?sessionId=${SESSION_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: newQty }),
    });
    const data = await res.json();
    updateCartUI(data);
  } catch (err) {
    console.error('Error updating cart:', err);
  }
}

async function removeCartItem(id) {
  try {
    const res = await fetch(`${API_BASE}/api/cart/${id}?sessionId=${SESSION_ID}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    updateCartUI(data);
  } catch (err) {
    console.error('Error removing cart item:', err);
  }
}

async function clearCart() {
  try {
    const res = await fetch(`${API_BASE}/api/cart?sessionId=${SESSION_ID}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    updateCartUI(data);
  } catch (err) {
    console.error('Error clearing cart:', err);
  }
}

function openCart() {
  cartSidebar.classList.add('active');
  cartOverlay.classList.add('active');
  loadCart(); // Refresh
}

function closeCart() {
  cartSidebar.classList.remove('active');
  cartOverlay.classList.remove('active');
}

// ═══ Orders ═══
async function placeOrder() {
  const name = document.getElementById('customerName').value.trim();
  const phone = document.getElementById('customerPhone').value.trim();
  const address = document.getElementById('customerAddress').value.trim();

  if (!name || !phone || !address) {
    alert('Vui lòng điền đầy đủ thông tin!');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: name,
        customerPhone: phone,
        customerAddress: address,
        sessionId: SESSION_ID,
      }),
    });

    const data = await res.json();

    // Close order modal
    document.getElementById('orderModal').style.display = 'none';

    // Show success
    document.getElementById('orderSuccessMsg').textContent = `Mã đơn hàng: #${data.orderId} • Tổng: ${formatPrice(data.total)}`;
    document.getElementById('orderSuccessModal').style.display = 'flex';

    // Clear cart UI
    loadCart();
    closeCart();

    // Clear form
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerAddress').value = '';
  } catch (err) {
    console.error('Order error:', err);
    alert('Đặt hàng thất bại. Vui lòng thử lại!');
  }
}

// ═══ Reset Chat ═══
async function resetChat() {
  messagesContainer.innerHTML = '';
  welcomeScreen.style.display = 'flex';
  isWelcomeVisible = true;

  try {
    await fetch(`${API_BASE}/api/chat/reset`, { method: 'POST' });
  } catch (err) {
    console.error('Error resetting chat:', err);
  }

  document.getElementById('sidebar').classList.remove('active');
}

// ═══ Helpers ═══
function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
}
