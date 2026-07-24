const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// GET /api/transactions — most recent first
router.get('/', async (req, res) => {
  try {
    const txs = await Transaction.find().sort({ createdAt: -1 }).limit(200);
    res.json(txs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
