const mongoose = require("mongoose");

const Reviewschmema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Assuming the model name is 'User'
    },

    rating: {
      type: Number,
      default: "",
    },

    name: {
      type: String,
      default: "",
    },
    comment: {
      type: String,
      default: "",
    },

    itemId: {
      type: String,
      default: "",
    },
  },

  {
    timestamps: true,
    minimize: false,
  }
);

const Review = mongoose.model("Review", Reviewschmema);

module.exports = Review;
