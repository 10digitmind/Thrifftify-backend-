const mongoose = require("mongoose");

// Define the schema for a deleted user
const deletedUserSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",  // Reference to the original User model
  },
  firstname: {
    type: String,
  
  },
  lastname: {
    type: String,
    
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
  
  },
  location: {
    type: String,
  
  },
  reasonForDeletion: {
    type: String, // Optional, track reason for deletion (e.g., "user requested")
  },
  deletionTimestamp: {
    type: Date,
    default: Date.now,  // Timestamp of deletion
  },
  status: {
    type: String,
    enum: ["soft", "hard"],  // Soft deletion (still in database) or hard deletion (removed permanently)
    default: "soft",
  },
});

// Create a model based on the schema
const DeletedUser = mongoose.model("DeletedUser", deletedUserSchema);

module.exports = DeletedUser;
