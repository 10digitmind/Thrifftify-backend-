const { match } = require("assert");
const mongoose = require("mongoose");
const { type } = require("os");
const bcrypt = require("bcryptjs");

const Userschmema = mongoose.Schema(
  {
    firstname: {
      type: String,
     default:""
    },
    lastname: {
      type: String,
     default:''
    },
    username: {
      type: String,
     default:""
    },

    location: {
      type: String,
     default:''
    },
    fullAddress: {
      default:[],
     
      type:Array,
    },
    email: {
      type: String,
      required: [true],
      trim: true,
      match: [
        /^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/,
        "Please enter a valid email address",
      ],
    },
    
    password: {
      type: String,
      required: [false, "please add a  password"],
    },
    photo: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: '+234',
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
    hasInsurance:{
      type: Boolean,
      default: false,
    },
    insurancePaidAt: {
      type: Date,
    },

    isSubscribed: {
      type: Boolean,
      default: false,
    },
    subscriptionPaidAt: {
      type: Date,
    },
    subscriptionExpiresAt: {
      type: Date,
    },
    subscriptionPlan:{
      type:String,
      default:""
    },

    contactType:{
      type:String,
      default:''
    },
    online:{
      type:Boolean,
      default:false
    },
 
    lastSeen:{
      type:Date,
      default:null
    },
    lastSpinDate: { type: String }, // Store as 'YYYY-MM-DD'
    spinPrize: { type: String }, 
    spinPoint: { type: Number, default:40 }, 
    lastLoginDate: { type: String }, 
   
  },

 
  

  {
    timestamps: true,
    minimize: false,
  }
);


// Add a compound index for email or phone to be unique
Userschmema.index(
  { email: 1, phone: 1 },
  { unique: true, partialFilterExpression: { $or: [{ email: { $exists: true, $ne: "" } }, { phone: { $exists: true, $ne: "" } }] } }
);

// Pre-save hook to ensure either email or phone is provided and unique
Userschmema.pre("save", function (next) {
  if (!this.email && !this.phone) {
    return next(new Error("You must provide either an email or a phone number."));
  }
  next();
});

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
