
const mongoose = require("mongoose");

const Goodschema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    images: [
      {
        url: String,
        id: String // Cloudflare image ID
      }
    ],
    title: {
      type: String,
      default: '',
    },

    itemDescription: {
      type: String,
      required: true,
    },

 
    category: {
      type: String,
      required: true,
    },

    subcategory: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
      default: 0
    },

    location: {
      type: String,
      default: '',
    },

    viewCount: {
      type: Number,
      default: 0
    },

    attributes: {
      type: Map,
      of: String, // or 'Schema.Types.Mixed' if values might not be strings
      default: {}
    },

    // Marketplace control
    approval: {
      type: Boolean,
      default: false
    },
    purchased: {
      type: Boolean,
      default: false
    },
    dispatch: {
      type: Boolean,
      default: false
    },
    delivered: {
      type: Boolean,
      default: false
    },
    deliveryDate: {
      type: String,
      default: ''
    },
    dispute: {
      type: Boolean,
      default: false
    },


  },
  {
    timestamps: true,
    minimize: false,
  }
);

const good = mongoose.model("good", Goodschema);
module.exports = good;


