const express = require('express');
const router = express.Router();
const db = require('../db');

// Place order
router.post('/', (req, res) => {
  const { customerName, customerPhone, customerAddress, sessionId = 'default' } = req.body;

  // Get cart items
  const cartItems = db.prepare(`
    SELECT ci.*, b.title, b.price, b.stock
    FROM cart_items ci
    JOIN books b ON ci.book_id = b.id
    WHERE ci.session_id = ?
  `).all(sessionId);

  if (cartItems.length === 0) {
    return res.status(400).json({ error: 'Giỏ hàng trống!' });
  }

  const total = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

  // Create order in transaction
  const createOrder = db.transaction(() => {
    const orderResult = db.prepare(`
      INSERT INTO orders (session_id, customer_name, customer_phone, customer_address, total_amount)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, customerName, customerPhone, customerAddress, total);

    const orderId = orderResult.lastInsertRowid;

    for (const item of cartItems) {
      db.prepare('INSERT INTO order_items (order_id, book_id, quantity, price) VALUES (?, ?, ?, ?)')
        .run(orderId, item.book_id, item.quantity, item.price);

      // Update stock
      db.prepare('UPDATE books SET stock = stock - ? WHERE id = ?')
        .run(item.quantity, item.book_id);
    }

    // Clear cart
    db.prepare('DELETE FROM cart_items WHERE session_id = ?').run(sessionId);

    // Log behavior
    db.prepare('INSERT INTO user_behavior (session_id, action, query) VALUES (?, ?, ?)')
      .run(sessionId, 'order', `Order #${orderId}`);

    return orderId;
  });

  const orderId = createOrder();

  res.json({
    orderId,
    total,
    itemCount: cartItems.length,
    message: `🎉 Đặt hàng thành công! Mã đơn hàng: #${orderId}`,
  });
});

// Get order
router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  const items = db.prepare(`
    SELECT oi.*, b.title, b.author, b.cover_color
    FROM order_items oi
    JOIN books b ON oi.book_id = b.id
    WHERE oi.order_id = ?
  `).all(req.params.id);

  res.json({ order, items });
});

module.exports = router;
