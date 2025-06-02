const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema({
  sellerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
   
  },
  fees: {
    type: Map,
    of: Number,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },

});

const Delivery = mongoose.model("Delivery", deliverySchema);

module.exports = Delivery;
