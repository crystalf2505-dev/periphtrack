require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const itemsRouter = require('./routes/items');
const transactionsRouter = require('./routes/transactions');

const app = express();
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/periphtrack';

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/items', itemsRouter);
app.use('/api/transactions', transactionsRouter);

// Serve the front-end
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

mongoose
  .connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("MongoDB not available.");
    console.log(err.message);
  });

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
