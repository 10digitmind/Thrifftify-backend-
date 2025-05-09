const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    roomId: { type: String, required: true }, // Use item ID here
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    itemId: { type: String, required: true }, 
    senderName:{type: String, required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  });
  
  const Message = mongoose.model('Message', messageSchema);

  module.exports = Message;

