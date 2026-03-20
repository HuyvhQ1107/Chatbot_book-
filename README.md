# 📚 Smart Bookstore — AI Chatbot

An AI-powered chatbot that helps customers search, get recommendations, and purchase books online. Powered by Google Gemini AI..

![Chatbot Demo](https://img.shields.io/badge/Status-Working-brightgreen) ![Node.js](https://img.shields.io/badge/Node.js-18%2B-green) ![License](https://img.shields.io/badge/License-MIT-blue)

---

| Feature                      | Description                                          |
| ---------------------------- | ---------------------------------------------------- |
| 💬 **AI Chat**               | Natural Vietnamese conversation powered by Gemini AI |
| 🔍 **Book Search**           | Search by title, author, or category                 |
| 📚 **Book Recommendations**  | AI suggests books based on preferences and genres    |
| 💰 **Price & Stock Inquiry** | Get detailed price and availability information      |
| 🛒 **Shopping Cart**         | Add books, update quantity, remove items             |
| 📦 **Checkout**              | Fill in information and confirm orders               |
| 🔄 **Auto Fallback**         | 3 AI models + offline mode when rate-limited         |

---

## 🚀Installation & Setup

### Requirements
- [Node.js](https://nodejs.org/) version **18** trở lên
- [Gemini API Key](https://aistudio.google.com/apikey) (Free)

###  1: Clone project

```bash
git clone https://github.com/your-username/chatbotbook.git
cd chatbotbook
```

### Step 2: Install dependencies

```bash
npm install
```

### Bước 3: Create .env file

Copy the example file and add your API key:

```bash
cp .env.example .env
```

 file `.env` và thay thế API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

> 💡 **Get a free API key at: https://aistudio.google.com/apikey

### Step 4: Run the server

```bash
npm run dev
```

### Step 5: Open browser

Truy cập: **http://localhost:3000**

---

## 💬 Usage

Type in the chat box or use quick suggestions:

| Input                         | Bot Action                      |
| ----------------------------- | ------------------------------- |
| `Hello`                       | Greeting + feature introduction |
| `Find book Harry Potter`      | Search and display book cards   |
| `Recommend good books`        | Suggest top-rated books         |
| `Vietnamese literature books` | Filter by category              |
| `Price of Truyện Kiều`        | Show price + stock              |
| `Add to cart`                 | Add book to cart                |
| `View cart`                   | Display shopping cart           |
| `Checkout`                    | Open checkout form              |


---

## 🗂️ Project Structure

```
chatbotbook/
├── server/
│   ├── index.js              # Express server
│   ├── db.js                 # SQLite database + 49 sample books
│   ├── services/
│   │   └── gemini.js         # Gemini AI + fallback chain
│   └── routes/
│       ├── chat.js           # POST /api/chat
│       ├── books.js          # GET /api/books, /search, /categories
│       ├── cart.js           # GET/POST/PUT/DELETE /api/cart
│       └── orders.js         # POST /api/orders
├── public/
│   ├── index.html            # Chat UI
│   ├── css/style.css         # Dark glassmorphism theme
│   └── js/app.js             # Frontend logic
├── .env.example              # Environment variables template
├── .gitignore                # Protect API key
└── package.json
```

---


## 🔧 API Endpoints

| Method   | Endpoint                | Description        |
| -------- | ----------------------- | ------------------ |
| `POST`   | `/api/chat`             | Send chat message  |
| `POST`   | `/api/chat/reset`       | Reset conversation |
| `GET`    | `/api/books`            | Get all books      |
| `GET`    | `/api/books/search?q=`  | Search books       |
| `GET`    | `/api/books/categories` | Get categories     |
| `GET`    | `/api/books/:id`        | Get book details   |
| `GET`    | `/api/cart`             | View cart          |
| `POST`   | `/api/cart`             | Add to cart        |
| `PUT`    | `/api/cart/:id`         | Update quantity    |
| `DELETE` | `/api/cart/:id`         | Remove item        |
| `POST`   | `/api/orders`           | Place order        |


---

## 📝 License

MIT License
