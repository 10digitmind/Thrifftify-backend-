const mongoose = require('mongoose');

const buyerInterestSchema = new mongoose.Schema({
  buyerEmail: { type: String,  },
  itemId: { type: String, },
  timestamp: { type: Date, default: Date.now },
  reminderSent: { type: Boolean, default: false }
});

module.exports = mongoose.model('BuyerInterest', buyerInterestSchema);
