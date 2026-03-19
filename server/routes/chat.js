const express = require('express');
const router = express.Router();
const { getAIResponse, resetChat } = require('../services/gemini');

// Main chat endpoint
router.post('/', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const response = await getAIResponse(message.trim(), sessionId);
    res.json(response);
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      text: '😅 Xin lỗi, đã có lỗi xảy ra. Bạn thử lại nhé!',
      action: null,
      books: [],
      cartItems: [],
    });
  }
});

// Reset chat session
router.post('/reset', (req, res) => {
  resetChat();
  res.json({ message: 'Chat session reset' });
});

module.exports = router;
