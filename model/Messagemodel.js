const mongoose = require("mongoose");

const MessageSchema = mongoose.Schema(
  {
    chatId: {
      type: String,
      default: "",
    },

    senderId: {
      type: String,
      default: "",
    },

    text: {
      type: String,
      default: "",
    },
  },

  {
    timestamps: true,
    minimize: false,
  }
);

const Message = mongoose.model("Message", MessageSchema);

module.exports = Message;
