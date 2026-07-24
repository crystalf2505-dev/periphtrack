const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true }, // e.g. "PERIPH-0001"
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    qty: { type: Number, required: true, default: 0, min: 0 },
    minStock: { type: Number, required: true, default: 10, min: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Item', ItemSchema);
