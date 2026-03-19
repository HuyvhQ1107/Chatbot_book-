const express = require('express');
const router = express.Router();
const db = require('../db');

// Get cart items
router.get('/', (req, res) => {
  const sessionId = req.query.sessionId || 'default';
  const items = db.prepare(`
    SELECT ci.id, ci.quantity, b.id as book_id, b.title, b.author, b.price, b.cover_color, b.stock
    FROM cart_items ci
    JOIN books b ON ci.book_id = b.id
    WHERE ci.session_id = ?
  `).all(sessionId);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  res.json({ items, total, count: items.length });
});

// Add to cart
router.post('/', (req, res) => {
  const { bookId, quantity = 1, sessionId = 'default' } = req.body;

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(bookId);
  if (!book) return res.status(404).json({ error: 'Book not found' });
  if (book.stock < quantity) return res.status(400).json({ error: 'Not enough stock' });

  const existing = db.prepare('SELECT * FROM cart_items WHERE session_id = ? AND book_id = ?')
    .get(sessionId, bookId);

  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?')
      .run(quantity, existing.id);
  } else {
    db.prepare('INSERT INTO cart_items (session_id, book_id, quantity) VALUES (?, ?, ?)')
      .run(sessionId, bookId, quantity);
  }

  // Return updated cart
  const items = db.prepare(`
    SELECT ci.id, ci.quantity, b.id as book_id, b.title, b.author, b.price, b.cover_color
    FROM cart_items ci
    JOIN books b ON ci.book_id = b.id
    WHERE ci.session_id = ?
  `).all(sessionId);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  res.json({ items, total, count: items.length, message: `Đã thêm "${book.title}" vào giỏ hàng!` });
});

// Update quantity
router.put('/:id', (req, res) => {
  const { quantity } = req.body;
  const sessionId = req.query.sessionId || 'default';

  if (quantity <= 0) {
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(req.params.id);
  } else {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, req.params.id);
  }

  const items = db.prepare(`
    SELECT ci.id, ci.quantity, b.id as book_id, b.title, b.author, b.price, b.cover_color
    FROM cart_items ci
    JOIN books b ON ci.book_id = b.id
    WHERE ci.session_id = ?
  `).all(sessionId);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  res.json({ items, total, count: items.length });
});

// Remove from cart
router.delete('/:id', (req, res) => {
  const sessionId = req.query.sessionId || 'default';
  db.prepare('DELETE FROM cart_items WHERE id = ?').run(req.params.id);

  const items = db.prepare(`
    SELECT ci.id, ci.quantity, b.id as book_id, b.title, b.author, b.price, b.cover_color
    FROM cart_items ci
    JOIN books b ON ci.book_id = b.id
    WHERE ci.session_id = ?
  `).all(sessionId);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  res.json({ items, total, count: items.length });
});

// Clear cart
router.delete('/', (req, res) => {
  const sessionId = req.query.sessionId || 'default';
  db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(sessionId);
  res.json({ items: [], total: 0, count: 0 });
});

module.exports = router;
