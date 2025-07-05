const mongoose = require("mongoose");

const StoreSettingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    welcomeMessage: {
      type: String,
      default: "Welcome to my store!",
    },
    theme: {
      type: String,
      default: "soft-gray",
    },
    storeLogo: {
      type: String,
      default: "",
    },
    bannerImage: {
      type: String,
      default: "",
    },
    bgImage: {
      type: String,
      default: "",
    },
    businessPhoneNumber: {
        type: Number,
        default: +234,
      },
      businessPolicy: {
        type: String,
        default: "",
      },
      socialLinks: {
        tiktok:{
            type: String,
            default: "",
          },

          instagram:{
            type: String,
            default: "",
          },
          x:{
            type: String,
            default: "",
          },
          facebook:{
            type: String,
            default: "",
          },
        }
      
  },
  {
    timestamps: true,
    minimize: false,
  }
);

// ✅ Use a meaningful model name like 'StoreSetting'
const StoreSetting = mongoose.model("StoreSetting", StoreSettingSchema);

module.exports = StoreSetting;
