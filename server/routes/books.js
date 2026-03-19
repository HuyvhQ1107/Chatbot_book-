const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all books with pagination
router.get('/', (req, res) => {
  const { page = 1, limit = 20, category } = req.query;
  const offset = (page - 1) * limit;

  let query = `
    SELECT b.*, c.name as category_name, c.icon as category_icon
    FROM books b
    LEFT JOIN categories c ON b.category_id = c.id
  `;
  const params = [];

  if (category) {
    query += ' WHERE b.category_id = ?';
    params.push(category);
  }

  query += ' ORDER BY b.rating DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const books = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM books').get().count;

  res.json({ books, total, page: parseInt(page), limit: parseInt(limit) });
});

// Search books
router.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ books: [] });

  const likeQuery = `%${q}%`;
  const books = db.prepare(`
    SELECT b.*, c.name as category_name
    FROM books b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.title LIKE ? OR b.author LIKE ? OR b.tags LIKE ? OR c.name LIKE ?
    ORDER BY b.rating DESC
    LIMIT 20
  `).all(likeQuery, likeQuery, likeQuery, likeQuery);

  res.json({ books });
});

// Get categories
router.get('/categories', (req, res) => {
  const categories = db.prepare(`
    SELECT c.*, COUNT(b.id) as book_count
    FROM categories c
    LEFT JOIN books b ON b.category_id = c.id
    GROUP BY c.id
    ORDER BY c.id
  `).all();
  res.json({ categories });
});

// Get single book
router.get('/:id', (req, res) => {
  const book = db.prepare(`
    SELECT b.*, c.name as category_name
    FROM books b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.id = ?
  `).get(req.params.id);

  if (!book) return res.status(404).json({ error: 'Book not found' });

  // Get related books
  const related = db.prepare(`
    SELECT b.*, c.name as category_name
    FROM books b
    LEFT JOIN categories c ON b.category_id = c.id
    WHERE b.category_id = ? AND b.id != ?
    ORDER BY b.rating DESC
    LIMIT 4
  `).all(book.category_id, book.id);

  res.json({ book, related });
});

module.exports = router;
