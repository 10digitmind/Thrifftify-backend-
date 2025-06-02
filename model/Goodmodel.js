
const mongoose = require("mongoose");

const Goodschema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Assuming the model name is 'User'
    },
    images: {
      type: [String],
      required: true
    },
    title: {
      type: String,
      default: '',
   
     
    },
    itemDescription: {
      type: String,
      default: '',
      required: true
    },

    producttype: {
      type: String,
      default: '',
      required: true
    },
    category: {
      type: String,
      default: '',
      required: true
    },
    price: {
      type: Number,
      default: 0,
      required: true
    },

    favouritecount: {
      type: Number,
      default: 0,
      required: true
    },

    location: {
      type: String,
      default: '',
     
    },
    brand: {
        type: String,
        default: '',
        require: true
      },
   
      size: {
        type: String,
        default: '',
        require: true
      },
      colour: {
        type: String,
        default: '',
        require: true
      },
      condition: {
        type: String,
        default: '',
        require: true
      },
      aproval: {
        type: Boolean,
        default: false,
        require: true
      },
      purchased: {
        type: Boolean,
        default: false,
        require: true
      },

      delivered: {
        type: Boolean,
        default: false,
        require: true
      },

      dispatch: {
        type: Boolean,
        default: false,
        require: true
      },
      deliverydate: {
        type: String,
        default: '',
        require: true
      },

      dispute: {
        type: Boolean,
        default: false,
        require: true
      },

      sellerdetails:{
        type: Array,
        default:[],
      },

      allusergoods:{
        type:Array,
        default:[]
      }
  },

  {
    timestamps: true,
    minimize: false,
  }
);

const good = mongoose.model("good", Goodschema);

module.exports = good;

