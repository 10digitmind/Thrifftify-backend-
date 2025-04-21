
const mongoose = require("mongoose");
const couponUsageSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    couponCode: String,
    amountApplied: Number,
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    usedAt: { type: Date, default: Date.now },
  });
  
  
  const couponUsage = mongoose.model("couponUsage", couponUsageSchema);
  
  module.exports =  couponUsage;