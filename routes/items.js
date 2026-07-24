const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');

// GET /api/items — list all items
router.get('/', async (req, res) => {
  try {
    const items = await Item.find().sort({ id: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/items — create a new item (server assigns the ID)
router.post('/', async (req, res) => {
  try {
    const { name, category, location, qty = 0, minStock = 10 } = req.body;
    if (!name || !category || !location) {
      return res.status(400).json({ error: 'name, category, and location are required' });
    }

    const last = await Item.find().sort({ id: -1 }).limit(1);
    let nextNum = 1;
    if (last.length) {
      const match = last[0].id.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const id = `PERIPH-${String(nextNum).padStart(4, '0')}`;

    const item = await Item.create({ id, name, category, location, qty, minStock });

    if (qty > 0) {
      await Transaction.create({
        date: new Date().toISOString().slice(0, 10),
        itemId: id,
        itemName: name,
        action: 'Added',
        qty,
        location,
        note: 'Initial stock',
      });
    }

    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/items/:id — update an item's fields
router.put('/:id', async (req, res) => {
  try {
    const { name, category, location, qty, minStock } = req.body;
    const item = await Item.findOneAndUpdate(
      { id: req.params.id },
      { $set: { name, category, location, qty, minStock } },
      { new: true, runValidators: true, omitUndefined: true }
    );
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/items/:id — remove an item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Item.findOneAndDelete({ id: req.params.id });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/items/:id/stock — stock in or out, and log the transaction
router.post('/:id/stock', async (req, res) => {
  try {
    const { action, qty, note } = req.body; // action: 'in' | 'out'
    const qtyNum = parseInt(qty, 10);
    if (!qtyNum || qtyNum <= 0) {
      return res.status(400).json({ error: 'qty must be greater than 0' });
    }
    if (action !== 'in' && action !== 'out') {
      return res.status(400).json({ error: "action must be 'in' or 'out'" });
    }

    const item = await Item.findOne({ id: req.params.id });
    if (!item) return res.status(404).json({ error: 'Item not found' });

    item.qty = action === 'in' ? item.qty + qtyNum : Math.max(0, item.qty - qtyNum);
    await item.save();

    await Transaction.create({
      date: new Date().toISOString().slice(0, 10),
      itemId: item.id,
      itemName: item.name,
      action: action === 'in' ? 'Added' : 'Removed',
      qty: qtyNum,
      location: item.location,
      note: note || '',
    });

    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
