/*
  Run this once to populate your MongoDB database with the starting
  inventory (from Peripheral_Inventory_Tracker_Copy.xlsx) so the app
  isn't empty the first time you open it.

  Usage:  npm run seed
*/
require('dotenv').config();
const mongoose = require('mongoose');
const Item = require('./models/Item');
const Transaction = require('./models/Transaction');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/periphtrack';

const items = [
  { id: 'PERIPH-0001', name: 'Lenovo TB4 Dock',   category: 'Dock',     location: 'IT Closet',     qty: 24,  minStock: 10 },
  { id: 'PERIPH-0002', name: 'Lenovo USB-C Dock', category: 'Dock',     location: 'IT Closet',     qty: 10,  minStock: 10 },
  { id: 'PERIPH-0003', name: 'Mouse',             category: 'Mouse',    location: 'IT Closet',     qty: 190, minStock: 10 },
  { id: 'PERIPH-0004', name: 'Display Port',      category: 'Cable',    location: 'IT Closet',     qty: 20,  minStock: 10 },
  { id: 'PERIPH-0005', name: 'HDMI',              category: 'Cable',    location: 'IT Closet',     qty: 60,  minStock: 10 },
  { id: 'PERIPH-0006', name: 'Ethernet',          category: 'Cable',    location: 'IT Closet',     qty: 50,  minStock: 10 },
  { id: 'PERIPH-0007', name: 'Keyboard',          category: 'Keyboard', location: 'Computer Room', qty: 237, minStock: 10 },
  { id: 'PERIPH-0008', name: 'Headset',           category: 'Headset',  location: 'IT Closet',     qty: 0,   minStock: 10 },
  { id: 'PERIPH-0009', name: 'HP Monitors',       category: 'Monitor',  location: 'IT Cage',       qty: 70,  minStock: 10 },
  { id: 'PERIPH-0010', name: 'HP Dock',           category: 'Dock',     location: 'IT Cage',       qty: 80,  minStock: 10 },
];

const transactions = [
  { date: '2026-07-09', itemId: 'PERIPH-0001', itemName: 'Lenovo TB4 Dock',   action: 'Added',   qty: 24,  location: 'Computer Room' },
  { date: '2026-07-09', itemId: 'PERIPH-0002', itemName: 'Lenovo USB-C Dock', action: 'Added',   qty: 10,  location: 'Computer Room' },
  { date: '2026-07-09', itemId: 'PERIPH-0003', itemName: 'Mouse',             action: 'Added',   qty: 200, location: 'IT Closet' },
  { date: '2026-07-09', itemId: 'PERIPH-0007', itemName: 'Keyboard',          action: 'Added',   qty: 238, location: 'Computer Room' },
  { date: '2026-07-09', itemId: 'PERIPH-0007', itemName: 'Keyboard',          action: 'Removed', qty: 1,   location: 'Computer Room' },
  { date: '2026-07-09', itemId: 'PERIPH-0003', itemName: 'Mouse',             action: 'Removed', qty: 10,  location: 'IT Cage' },
];

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected. Clearing existing collections...');
  await Item.deleteMany({});
  await Transaction.deleteMany({});

  await Item.insertMany(items);
  await Transaction.insertMany(transactions);

  console.log(`Seeded ${items.length} items and ${transactions.length} transactions.`);
  await mongoose.disconnect();
  console.log('Done.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
