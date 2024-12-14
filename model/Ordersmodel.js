const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  orderitems: {
     type: Array ,
     default:[]
  },
  purchased: { type: Boolean, default: false },
  dispatch: { type: Boolean, default: false },
  delivered: { type: Boolean, default: false },
  dispute: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;