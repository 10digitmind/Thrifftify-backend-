const mongoose = require("mongoose");

const ChatSchema = mongoose.Schema(
  {
    members: {
        type: Array,
        default: [],
     
       
      },
  },

  {
    timestamps: true,
    minimize: false,
  }
);

const Chat = mongoose.model("Chat", ChatSchema);

module.exports = Chat;
