const mongoose = require('mongoose'); // import mongoose for MongoDB interactions

const ItemSchema = new mongoose.Schema( //create a new schema for the Item model
  {
    id: { //unique identifier for each item, required and unique (to prevent duplicates)
      type: String, 
      required: true, 
      unique: true
    },
    name: { //name (description) of the item, required and trimmed (to remove whitespace)
      type: String, 
      required: true, 
      trim: true 
    },
    category: { //category of the item, required and trimmed
      type: String, 
      required: true, 
      trim: true 
    },
    location: { //location of the item, required and trimmed
      type: String, 
      required: true, 
      trim: true 
    },
    qty: { //quantity of the item, required, must be a number and cannot be negative, defaults to 0 if not provided
      type: Number, 
      required: true, 
      default: 0, 
      min: 0 
    },
    minStock: { //minimum stock level for the item, required, must be a number and cannot be negative, defaults to 10 if not provided
      type: Number, 
      required: true, 
      default: 10, 
      min: 0 
    },
  },
  { timestamps: true } // automatically adds createdAt(when item was added) and updatedAt(last time it was updated) fields to the schema
);

module.exports = mongoose.model('Item', ItemSchema); //export the Item model based on the ItemSchema, allowing it to be used in other parts of the application
