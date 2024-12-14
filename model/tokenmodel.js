
const mongoose = require("mongoose");


const Tokenschmema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      require: [true, ],
      ref: 'user',
    },

    verificationToken: {
        type: String,
        default:'',
      },
    
      passresetToken: {
        type: String,
        default:'',
      },
      loginToken: {
        type: String,
        default:'',
      },

      createdAt:{
        type:Date,
        required:true,

      },

      expiresAt:{
        type:Date,
        require:true,

      },
  },


 
);


const Token = mongoose.model("Token", Tokenschmema);

module.exports = Token;
