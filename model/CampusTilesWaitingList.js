const mongoose = require("mongoose");

// Define the schema for a deleted user
const waitingListUserSchema = new mongoose.Schema({

  userName: {
    type: String,
  },

  email: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
  
  },

  addedTime: {
    type: Date,
    default: Date.now,  // Timestamp of deletion
  }

});

// Create a model based on the schema
const waitingList = mongoose.model("WatingList", waitingListUserSchema);

module.exports = waitingList;
