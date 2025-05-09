const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, required: true }, // itemId_buyerId
  itemId:  { type: String, },
  itemImageUrl:  { type: String, },
  itemTitle:{ type: String, },
  buyerId:  { type: String, },
  buyerName:  { type: String, },
  sellerId:  { type: String,  required: true },
  sellerName:  { type: String, },
  isItemChat: {type: Boolean, default:false },
  messages: [
    {
      senderId:  { type: String,   required: true },
      senderName: { type: String, required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now }
    }
  ],
  lastMessage: { type: String },
  updatedAt: { type: Date, default: Date.now }
});



module.exports = mongoose.model('Chat', chatSchema);

