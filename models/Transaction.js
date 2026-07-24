const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    itemId: { type: String, required: true },
    itemName: { type: String, required: true },
    action: { type: String, enum: ['Added', 'Removed'], required: true },
    qty: { type: Number, required: true, min: 1 },
    location: { type: String, default: '' },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', TransactionSchema);
