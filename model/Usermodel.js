const { match } = require("assert");
const mongoose = require("mongoose");
const { type } = require("os");
const bcrypt = require("bcryptjs");

const Userschmema = mongoose.Schema(
  {
    firstname: {
      type: String,
      required: [true, "please add a ur firstname"],
    },
    lastname: {
      type: String,
      required: [true, "please add a ur lastname"],
    },

    location: {
      type: String,
      required: [true, "please add a ur lcoation "],
    },
    fullAddress: {
      default:[],
      required: [false],
      type:Array,
    },
    email: {
      type: String,
      required: [true, "Please add your email"],
      unique: true,
      trim: true,
      match: [
        /^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/,
        "Please enter a valid email address",
      ],
    },
    
    password: {
      type: String,
      required: [true, "please add a  password"],
    },
    photo: {
      type: String,
      require: [true, "please add a  photo"],
      default: "",
    },
    phone: {
      type: String,
      
      default: "+234",
    },

    about: {
      type: String,
      default: "Please buy from me, I'm the best seller here  ",
    },

    dob: {
      type: Date,
      default: null,
    
    },
    role: {
      type: String,
      require: [true],
      default: "",
      //buyer, seller, admiin(susepended)
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    idVerified:{
      type: Boolean,
      default: false,

    },

    totalSoldAmount: {
      type: Number,
      default: 0,
      
    },

    totalPurchasedAmount: {
      type: Number,
      default: 0,
    },

    pendingPurchasedAmount: {
      type: Number,
      default: 0,
    },

    pendingSoldAmount: {
      type: Number,
      default: 0,
    },
    pendingWithdrawalAmount: {
      type: Number,
      default: 0,
    },
    totalWithdrawalAmount: {
      type: Number,
      default: 0,
    },
    pendingDisputeAmount: {
      type: Number,
      default: 0,
    },
    successfullDelivery: {
      type: Number,
      default: 0,
    },

    
    userAgent: {
      type: Array,
      default: [],
      require: false,
    },
    ninDetails:{
      type:Array,
      default:[],
      require:false
    },
    verificationRequested: {
      type: Boolean,
      default: false,
    },
   
  },

  {
    timestamps: true,
    minimize: false,
  }
);

//Ecrpt passwprd before saving to db
Userschmema.pre('save', async function(next){
  if(!this.isModified('password')){
    return next()

  }
  //hash password
  const salt = await bcrypt.genSalt(10)
  const hashPassword= await bcrypt.hash(this.password,salt)
  this.password= hashPassword
  next()
})




const user = mongoose.model("user", Userschmema);

module.exports = user;
