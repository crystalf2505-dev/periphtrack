const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema( //schema for the Transaction model, which records each addition or removal of items from inventory
  {
    date: { //date of the transaction, required
      type: String, 
      required: true 
    }, 
    itemId: { //unique identifier of the item involved in the transaction, required
      type: String, 
      required: true 
    },
    itemName: { //name of the item involved in the transaction, required
      type: String, 
      required: true 
    },
    action: { //type of transaction, either 'Added' or 'Removed', required
      type: String, 
      enum: ['Added', 'Removed'], 
      required: true 
    },
    qty: { //quantity of the item involved in the transaction, required, must be a number and cannot be less than 1
      type: Number, 
      required: true, 
      min: 1 
    },
    location: { //location of the item involved in the transaction, required
      type: String, 
      default: '' 
    },
    note: { //optional note about the transaction, defaults to an empty string if not provided
      type: String, 
      default: '' 
    },
  },
  { timestamps: true } // automatically adds createdAt(when transaction was recorded) and updatedAt(last time it was updated) fields to the schema
);

module.exports = mongoose.model('Transaction', TransactionSchema); //export the Transaction model based on the TransactionSchema, allowing it to be used in other parts of the application
