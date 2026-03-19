# 📚 Nhà Sách Thông Minh — AI Chatbot

Chatbot AI hỗ trợ khách hàng tìm kiếm, gợi ý và mua sách trực tuyến. Powered by **Google Gemini AI**.

![Chatbot Demo](https://img.shields.io/badge/Status-Working-brightgreen) ![Node.js](https://img.shields.io/badge/Node.js-18%2B-green) ![License](https://img.shields.io/badge/License-MIT-blue)

---

## ✨ Tính năng

| Tính năng | Mô tả |
|---|---|
| 💬 **Chat AI** | Trò chuyện tự nhiên bằng tiếng Việt với Gemini AI |
| 🔍 **Tìm sách** | Tìm theo tên, tác giả, thể loại |
| 📚 **Gợi ý sách** | AI gợi ý sách theo sở thích, thể loại |
| 💰 **Hỏi giá/tồn kho** | Trả lời chi tiết về giá, còn bao nhiêu cuốn |
| 🛒 **Giỏ hàng** | Thêm sách, tăng/giảm số lượng, xóa |
| 📦 **Đặt hàng** | Điền thông tin + xác nhận đơn hàng |
| 🔄 **Auto fallback** | 3 model AI + offline mode khi bị rate limit |

---

## 🚀 Cài đặt & Chạy

### Yêu cầu
- [Node.js](https://nodejs.org/) phiên bản **18** trở lên
- [Gemini API Key](https://aistudio.google.com/apikey) (miễn phí)

### Bước 1: Clone project

```bash
git clone https://github.com/your-username/chatbotbook.git
cd chatbotbook
```

### Bước 2: Cài dependencies

```bash
npm install
```

### Bước 3: Tạo file `.env`

Copy file mẫu và điền API key:

```bash
cp .env.example .env
```

Mở file `.env` và thay thế API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

> 💡 **Lấy API key miễn phí tại:** https://aistudio.google.com/apikey

### Bước 4: Chạy server

```bash
npm run dev
```

### Bước 5: Mở trình duyệt

Truy cập: **http://localhost:3000**

---

## 💬 Cách sử dụng

Gõ vào ô chat hoặc bấm nút gợi ý nhanh:

| Bạn gõ | Bot làm gì |
|---|---|
| `Xin chào` | Chào + giới thiệu tính năng |
| `Tìm sách Harry Potter` | Tìm và hiện book cards |
| `Gợi ý sách hay` | Gợi ý top sách rating cao |
| `Sách văn học Việt Nam` | Lọc theo thể loại |
| `Giá sách Truyện Kiều` | Trả lời giá + tồn kho |
| `Thêm vào giỏ hàng` | Thêm sách vào cart |
| `Xem giỏ hàng` | Hiển thị cart |
| `Đặt hàng` | Mở form checkout |

---

## 🗂️ Cấu trúc project

```
chatbotbook/
├── server/
│   ├── index.js              # Express server
│   ├── db.js                 # SQLite database + 49 sách mẫu
│   ├── services/
│   │   └── gemini.js         # Gemini AI + fallback chain
│   └── routes/
│       ├── chat.js           # POST /api/chat
│       ├── books.js          # GET /api/books, /search, /categories
│       ├── cart.js           # GET/POST/PUT/DELETE /api/cart
│       └── orders.js         # POST /api/orders
├── public/
│   ├── index.html            # Giao diện chat
│   ├── css/style.css         # Dark glassmorphism theme
│   └── js/app.js             # Frontend logic
├── .env.example              # Mẫu biến môi trường
├── .gitignore                # Bảo vệ API key
└── package.json
```

---


## 🔧 API Endpoints

| Method | Endpoint | Mô tả |
|---|---|---|
| `POST` | `/api/chat` | Gửi tin nhắn chat |
| `POST` | `/api/chat/reset` | Reset cuộc trò chuyện |
| `GET` | `/api/books` | Danh sách sách |
| `GET` | `/api/books/search?q=` | Tìm kiếm sách |
| `GET` | `/api/books/categories` | Danh sách thể loại |
| `GET` | `/api/books/:id` | Chi tiết sách |
| `GET` | `/api/cart` | Xem giỏ hàng |
| `POST` | `/api/cart` | Thêm vào giỏ |
| `PUT` | `/api/cart/:id` | Cập nhật số lượng |
| `DELETE` | `/api/cart/:id` | Xóa khỏi giỏ |
| `POST` | `/api/orders` | Đặt hàng |

---

## 📝 License

MIT License
