
// const multer = require("multer");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const parser = require("ua-parser-js");
// const generateToken = require("/Users/test/thrifty/backend/utilities/index.js");
// const upload = multer({ dest: "uploads/" });
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../sendemail/sendemail");
const { dispatchEmail } = require("../sendemail/dispatchedemail.js");
const {idVerificationEmail} = require('../sendemail/idVerificationmail.js')
const {contactUs} = require('../sendemail/contactus.js')
const Token = require("../model/tokenmodel.js");
const Good = require("../model/Goodmodel.js");
const Coupon = require('../model/CouponModel.js')
const CouponUsage =require("../model/Couponuseagemodel.js");
const DeletedUser = require('../model/DeletedUser.js')
const Delivery = require('../model/deliverySchema.js');
const StoreSetting = require('../model/StoreSetting.js');
const BuyerInterest = require('../model/BuyerInterets.js')

const Chat = require('../model/chatRoomSchema.js')
const Review = require("../model/Reviews.js");
const crypto = require('crypto')
const CryptoJS = require('crypto-js');
const cloudinary = require("../utills/cloudinary.js");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const Cryptr = require("cryptr");
const cryptr = new Cryptr(process.env.CRYPR_KEY);
const isProduction = process.env.NODE_ENV === "production";
const {
  initializePayment,
  verifyPayment,
} = require("../controllers/Payment.js");
const axios = require("axios");
const Order = require("../model/Ordersmodel.js");
const good = require("../model/Goodmodel.js");

const { title } = require("process");
const path = require('path');

const User = require("../model/Usermodel.js");
const cron = require("node-cron");
const {sendVerificationReminders,listingNotification, postRandomTweet,firstListingNotification,sendEmailVerification,deleteUnverifiedAccounts} = require('../controllers/Cronjobs.js')

const saveDailySignupCount = require('../utills/savedailysignupcount.js')

const countSignupsPerDay = require('../utills/userdailycount.js')
const { OAuth2Client } = require('google-auth-library');
const { json } = require("body-parser");
const client = new OAuth2Client('YOUR_GOOGLE_CLIENT_ID');
const Chatroom = require('../model/chatRoomSchema');

const { v4: uuidv4 } = require('uuid');
//-------------utilities functions
// genrate toeken function
const generateToken = (id) => {
  const sessionId = crypto.randomBytes(16).toString("hex"); // unique per session
  return jwt.sign(
    {
      id,
      sessionId,
      iat: Date.now() // issued at
    },
    process.env.JWT_SECRET,
    { expiresIn: "5h" }
  );
};
//hash token  function
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token.toString()).digest("hex");
};

// create user
const createUser = asyncHandler(async (req, res) => {
  const { username, password, contact } = req.body;

  if (!username || !contact || !password) {
    return res.status(400).json({ message: "Please fill in all required fields." });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least six characters long." });
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^(\+234\d{10}|\d{11})$/;

  let email = null;
  let phone = null;
  let contactType = "";

  if (emailPattern.test(contact)) {
    email = contact.toLowerCase();
    contactType = "email";
  } else if (phonePattern.test(contact)) {
    phone = contact;
    contactType = "phoneNumber";
  } else {
    return res.status(400).json({ message: "Invalid email or phone number format." });
  }



  const query = {};
  if (email) query.email = email;
  if (phone) query.phone = phone;

  const userExists = await User.findOne(query);

  if (userExists) {
    const token = generateToken(userExists._id);
    return res.status(409).json({
      message: "User already registered. Please log in...",
      token,
    });
  }

  const ua = parser(req.headers["user-agent"]);
  const userAgent = [ua.ua];

  const user = await User.create({
    email,
    phone,
    password,
    username,
    contactType,
    userAgent,
  });

  if (!user) {
    return res.status(400).json({ message: "Invalid user data." });
  }

  const token = generateToken(user._id);

  

  res.status(201).json({
    id: user._id,
    email: user.email,
    phone: user.phone,
    username: user.username,
    location: user.location || '',
    photo: user.photo || null,
    role: user.role || "user",
    isVerified: user.isVerified || false,
    dob: user.dob ,
    token,
  });
});





//login user
const loginUser = asyncHandler(async (req, res) => {
 
  try {
    const { emailOrPhone, password } = req.body;

    // Validation
    if (!emailOrPhone || !password) {
      return res.status(400).json("Please provide email/phone and password");
    }

    // Check if input is an email or phone number
    
    const isEmail = /\S+@\S+\.\S+/.test(emailOrPhone); // Simple email regex
    const query = isEmail ? { email: emailOrPhone } : { phone: emailOrPhone };

    const user = await User.findOne( query );
   
  
    if (!user) {
      return res.status(401).json( "Invalid email or password." );
    }

const correctPassword = await bcrypt.compare(password, user.password);

    if (user.role === "suspended" && correctPassword) {
    
      return res.status(401).json("Your account has been suspended. Contact admin ASAP!.");
    }

    if (!correctPassword) {
      return res.status(401).json("Invalid email or password.");
    }

//triger 2fa
  // const ua = parser(req.headers["user-agent"]);

  // const currentUserAgent = [ua.ua];

  // const allowedAgent = user.userAgent.includes(currentUserAgent);

  // if (!allowedAgent) {
  //   //gereate 6digit code
  //   const loginCode = Math.floor(100000 + Math.random() * 90000);
  

  //   // ecyrpt login code before saving database
  //   const encryptedLoginCode = cryptr.encrypt(loginCode.toString());

  //   // Delete existing reset password token if it exists
  //   let userToken = await Token.findOne({ userId: user._id });
  //   if (userToken) {
  //     await userToken.deleteOne();
  //   }
  //   //SAVETOKEN

  //   await new Token({
  //     userId: user._id,
  //     loginToken: encryptedLoginCode,
  //     createdAt: Date.now(),
  //     expiresAt: Date.now() + 60 * (60 * 1000),
  //   }).save();

  //   res.status(401).json(
  //     "New device or browser detected" );
  // }



  const today = new Date().toISOString().split('T')[0];

  if (user.lastLoginDate !== today) {
    user.spinPoint += 20;
    user.lastLoginDate = today;
    await user.save();
  }

    // Generate token
    const token = generateToken(user._id);

    // Send user data along with token
    const { id, lastname, firstname, location, photo, role, isVerified, phone,username } = user;
    res.status(200).json({
      id,
      firstname,
      lastname,
      location,
      emailOrPhone,
      photo,
      role,
      isVerified,
      phone,
      token,
      username
    });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal server error. Please try again later." });
  }
});


//send login code
const sendLoginCode = asyncHandler(async (req, res) => {
  const { email } = req.params;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("user not found ");
  }

  //find user token in the db
  let userToken = await Token.findOne({
    userId: user._id,
    expiresAt: { $gt: Date.now() },
  });

  if (!userToken) {
    res.status(404);
    throw new Error("invalid or expired token  , please login again  ");
  }

  const loginCode = userToken.loginToken;
  const decryptedLoginCode = cryptr.decrypt(loginCode.toString());

  //send email

  // Set email parameters
  const subject = "loginaccess code - Thritify";
  const send_to = email;
  const send_from = process.env.EMAIL_SENDER;
  const reply_to = "noreply@thritify.com";
  const template = 'loginwithcode.';
  const name = user.firstname;
  const link = `${process.env.FRONTEND_USER}/Loginwithcode/${email}/${decryptedLoginCode}`;

  // Send email
  try {
    await sendEmail(
      subject,
      send_to,
      send_from,
      reply_to,
      null,
      template,
      name,
      link,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      decryptedLoginCode,
      null

    );

    // Respond with success message
    res.status(200).json({ message: `Access code sent to ${email}  ` });
  } catch (error) {
    res.status(404).json({ message: error });
  }
});

//loginwithcode
const LoginWithCode = asyncHandler(async (req, res) => {
  const { email } = req.params;
  const { loginCode } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("user not found");
  }

  // Find user login token

  const userToken = await Token.findOne({
    userId: user._id,
    expiresAt: { $gt: Date.now() },
  });

  if (!userToken) {
    res.status(404);
    throw new Error("invalide or expire token ,please login again ");
  }

  const decryptedLoginCode = cryptr.decrypt(userToken.loginToken);

  if (loginCode !== decryptedLoginCode) {
    res.status(400);
    throw new Error("incorrect login code please try again   ");
  } else {
    // regsiter user agent
    const ua = parser(req.headers["user-agent"]);
    const currentUserAgent = ua.ua;

    user.userAgent.push(currentUserAgent);

    await user.save();
    const token = generateToken(user._id);

    // HTTP-ONLY COOKIE
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      expires: new Date(Date.now() + 1000 * 86400), //1 day
      sameSite: "none",
      secure: true,
    });

    const { id, firstname, lastname, location, photo, role,emailOrPhone, isVerified ,username,phone} = user;

    res.status(201).json({
      id,
      firstname,
      lastname,
      location,
      emailOrPhone,
      photo,
      role,
      isVerified,
      phone,
      token,
      username
    });
  }
});

//send verification email

const sendVerifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(400);
    throw new Error("User not found, please sign up");
  }

  if (user.isVerified) {
    res.status(400);
    throw new Error("User already verified");
  }

  // Delete existing token if it exists
  let token = await Token.findOne({ userID: user._id });
  if (token) {
    await token.deleteOne();
  }

  // Create new verification token
  const verificationToken = crypto.randomBytes(32).toString("hex") + user._id;
  const hashedToken = hashToken(verificationToken);

  await new Token({
    userId: user._id,
    verificationToken: hashedToken,
    createdAt: Date.now(),
    expiresAt: Date.now() + 60 * (60 * 1000), // 1-hour expiry
  }).save();

  // Verification URL
  const verificationUrl = `${process.env.FRONTEND_USER}/verify/${verificationToken}`;
  console.log("Verification URL:", verificationUrl);
  const whatsappURL =`/verify/${verificationToken}`
 


  try {
    if (user.email) {
      // ✅ Send Email Verification
      const subject = "Verify Your Account - Thriftify";
      const send_to = user.email;
      const send_from = process.env.EMAIL_SENDER;
      const reply_to = "noreply@thriftify.com";
      const template = "verifyemail.";
      const name = user.username;
      const link = verificationUrl;

      await sendEmail(subject, send_to, send_from, reply_to, null, template, name, link);
      return res.status(200).json({ message: "Verification email sent!" });

    } else if (user.phone) {
      let formattedPhoneNumber = user.phone.replace(/\D/g, ""); // Remove non-numeric characters
      formattedPhoneNumber = `${formattedPhoneNumber}`;
     
      const data = {
        to: formattedPhoneNumber,
        from: "Thriftiffy",
        sms: "Hi there, testing Termii ",
        type: "plain",
        api_key: process.env.TERMIL_API_KEY, // Ensure this is correctly set
        channel: "generic"
      };
      
      axios.post('https://v3.api.termii.com/api/sms/send', (data), {
        headers: { 'Content-Type': 'application/json' }
      })
      .then(response => {
        console.log("Response:", response);
      })
      .catch(error => {
        console.error("Error:", error.response ? error.response.data : error.message);
      });
 // Remove non-numeric characters
        //  formattedPhoneNumber = `${formattedPhoneNumber}`;

        //  await axios.post(
        //   `https://graph.facebook.com/v22.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
        //   {
        //     messaging_product: "whatsapp",
        //     to: formattedPhoneNumber,
        //     type: "template",
        //     template: {
        //       name: "verifyaccount",
        //       language: {
        //         code: "en_U"
        //       },
        //       components: [
        //         {
        //           type: "body",
        //           parameters: [
        //             { type: "text", text: user.firstname },
        //             { type: "text", text: "your thriftiffy account" }
        //           ]
        //         },
        //         {
        //           type: "button",
        //           sub_type: "url",
        //           index: 0,
        //           parameters: [
        //             { type: "text", text: `verify/${verificationToken}` } // Static URL here
        //           ]
        //         }
        //       ]
        //     }
        //   },
        //   {
        //     headers: {
        //       Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        //       "Content-Type": "application/json"
        //     }
        //   }
        // );
        
      





   

      return res.status(200).json({ message: "Verification message sent!" });
    } else {
      return res.status(400).json({ message: "No email or phone number provided!" });
    }
  } catch (error) {
    console.error("Error sending verification:", error);
    return res.status(500).json({ message: "Error sending verification. Try again." });
  }
});

//verify user

const verifyUser = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  if (!verificationToken || typeof verificationToken !== "string") {
    res.status(400);
    throw new Error("Invalid verification token");
  }

  const hashedtoken = hashToken(verificationToken);


  const userToken = await Token.findOne({
    verificationToken: hashedtoken,
    expiresAt: { $gt: Date.now() },
  });

  if (!userToken) {
    res.status(400);
    throw new Error("invalid or expire token ");
  }
  // find user

  const user = await User.findOne({ _id: userToken.userId });


  if (user.isVerified) {
    res.status(400);
    throw new Error("user already verify ");
  }

  user.isVerified = true;
  await user.save();

  const subject = "sign up alert";
  const send_to = process.env.ADMIN_EMAIL;  // or item's seller email if you prefer
  const send_from = process.env.EMAIL_SENDER ;
  const reply_to = "noreply@thriftify.com";
  const template = "signupalert.";  // a template key if you're using one
  const name = user.username; // or buyer name if applicable
  const email = user.email
 
 

  try {
    await sendEmail(
      subject,
      send_to,
        send_from,
        reply_to,
        null,
        template,
        name,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
     email
    );
    console.log(`Checkout alert sent to admin: ${send_to}`);
  } catch (emailError) {
    console.error("Failed to send checkout alert:", emailError.message);
    // Don't block checkout if email fails — just log it.
  }



  res
    .status(200)
    .json({ message: "Account verification sucessfull, please login;  " });
});

//logout user
const logoutUser = asyncHandler(async (req, res) => {
  // Extract token from the Authorization header
  const authHeader = req.headers.authorization;

  // Check if the token is present and starts with "Bearer "
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ status: false, message: "No token provided." });
  }

  // Get the token from the Authorization header
  const token = authHeader.split(" ")[1];

  try {
    
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Error during logout:", error);
    return res.status(500).json({ message: "An error occurred during logout." });
  }
});


//getUser
const getUser = asyncHandler(async (req, res) => {
  try {
  
    if (!req.user || !req.user._id) {
     
      res.status(400).json({ message: "User not authenticated" });
      return;
    }

    const user = await User.findById(req.user._id).select('-password');


    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    
    const {
      id,
      email,
      photo,
      role,
      isVerified,
      idVerified,
      phone,
      lastname,
      location,
      firstname,
      dob,
      about,
      totalPurchasedAmount,
      totalSoldAmount,
      pendingSoldAmount,
      pendingWithdrawalAmount,
      totalWithdrawalAmount,
      pendingPurchasedAmount,
      userAgent,
      verificationRequested,
      contactType,
      username,
      online,
      lastSeen,
      subscriptionPlan,
      subscriptionPaidAt,
      subscriptionExpiresAt,
      isSubscribed
    } = user;

    const passphrase = process.env.CRYPTO_JS
    const encryptedEmail = email === null?'': CryptoJS.AES.encrypt(email.toString(), passphrase).toString()
    const encryptedPhone = phone === null ? '':CryptoJS.AES.encrypt(phone.toString(), passphrase).toString()
    const encryptedDob = dob ===null ? '' :CryptoJS.AES.encrypt(dob.toString(), passphrase).toString()


    
    
    res.status(200).json({
      id,
      firstname,
      lastname,
      username,
      location,
      email:encryptedEmail,
      photo,
      role,
      isVerified,
      idVerified,
      phone:encryptedPhone,
      dob:encryptedDob,
      about,
      totalPurchasedAmount,
      totalSoldAmount,
      pendingSoldAmount,
      pendingWithdrawalAmount,
      totalWithdrawalAmount,
      pendingPurchasedAmount,
      userAgent,
      verificationRequested,
      contactType,
      online,
      lastSeen,
      subscriptionPlan,
      subscriptionPaidAt,
      subscriptionExpiresAt,
      isSubscribed
    });
    console.log("User response sent successfully");
  } catch (error) {
    console.error("Error in getUser:", error);
    res.status(500).json({ message: error.message });
  }
});



//update user
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(400);
    throw new Error("User not found");
  }

  // Only update fields if provided
  user.firstname = req.body.firstname ?? user.firstname;
  user.lastname = req.body.lastname ?? user.lastname;
  user.location = req.body.location ?? user.location;
  user.phone = req.body.phone ?? user.phone;
  user.photo = req.body.photo ?? user.photo;
  user.role = req.body.role ?? user.role;
  user.about = req.body.about ?? user.about;
  user.dob = req.body.dob ?? user.dob;


  // Prevent email from being updated here
  // user.email remains unchanged
  if (req.body.dob) {
    const parsedDate = new Date(req.body.dob);
    if (!isNaN(parsedDate.getTime())) {
      user.dob = parsedDate;
    } else {
      console.log("Invalid DOB provided:", req.body.dob);
    }
  }

  try {
    const updatedUser = await user.save();
    res.status(200).json({
      lastname: updatedUser.lastname,
      firstname: updatedUser.firstname,
      location: updatedUser.location,
      phone: updatedUser.phone,
      about: updatedUser.about,
      photo: updatedUser.photo,
      role: updatedUser.role,
      isVerified: updatedUser.isVerified,
      dob: updatedUser.dob,
    });
  } catch (error) {
    console.error("Error saving user:", error);
    res.status(500).json({ message: "Error saving user" });
  }
});



//delete user

const deleteUser = asyncHandler(async (req, res) => {
 
    try {
      const { id } = req.params;  // Corrected extraction of ID from URL
      const { reasonForDeletion } = req.body;  // Capture reason for deletion
  
      // Check if user exists
      const user = await User.findById(id);
  
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // Log the user into DeletedUser collection (soft delete)
      const deletedUser = new DeletedUser({
        userId: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        phone: user.phone,
        location: user.location,
        reasonForDeletion, // Save reason
      });
  
      await deletedUser.save();  // Save deleted user data
  
      // Delete user's goods (optional)
      await Good.deleteMany({ userId: user._id });
  
      // Delete the user from main collection
      await User.findByIdAndDelete(id);
  
      return res.status(200).json({ message: "User and their goods deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  

// getallusers
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    // Fetch users sorted by creation date and exclude the password field
    const users = await User.find().sort("-createdAt").select("-password");

    // Check if users array is empty
    if (users.length === 0) {
      return res.status(404).json({ message: "No users found" });
    }

    // Return users
    res.status(200).json(users);
  } catch (error) {
    // Handle any server errors
    console.error(error);
    res.status(500).json({ message: "Something went wrong", error: error.message });
  }
});




// login status
const loginStatus = asyncHandler(async (req, res) => {
  // Retrieve token from the Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ status: false, message: "No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify the token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (verified) {
      return res.status(200).json({ status: true, message: "User is logged in." });
    }

  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({ status: false, message: "Invalid or expired token." });
  }

  return res.status(401).json({ status: false, message: "Unauthorized access." });
});


// upgrader user
const upgradeUser = asyncHandler(async (req, res) => {
  const { role, id } = req.body;
  const user = await User.findById(id);

  if (!user) {
    res.status(500).json({ message: "user not found  " });
  }
  user.role = role;

  await user.save();
  res.status(200).json({
    message: `user role updated ${role} `,
  });
});

//send autoemail
const sendAutoEmail = asyncHandler(async (req, res) => {
  const { subject, send_to, reply_to, template, url } = req.body;

  if (!subject || !send_to || !reply_to || !template) {
    res.status(404);
    throw new Error("missing email parameter");
  }

  const user = User.findOne({ email: send_to });
  if (!user) {
    res.status(404).json({ message: "user not found  " });
  }

  const send_from = process.env.EMAIL_SENDER;
  const name = user.name;
  const link = `${process.env.FRONTEND_USER}${url}`;

  try {
    await sendEmail(
      subject,
      send_to,
      send_from,
      reply_to,
      template,
      name,
      link
    );

    res.status(200).json({ message: "email sent " });
  } catch (error) {
    res.status(500).json({ message: "email not sent try again " });
  }
});

// Forgot password link email

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Check if the email is provided in the request body
  if (!email) {
    return res.status(400).json("Email is required");
  }

  // Find user by email
  const user = await User.findOne({ email });

  // If user not found, return 404 response
  if (!user) {
    return res.status(404).json("User with this email not found");
  }

  // Delete existing reset password token if it exists
  let token = await Token.findOne({ userId: user._id });
  if (token) {
    await token.deleteOne();
  }

  // Create reset password token and save
  const resetToken = crypto.randomBytes(32).toString("hex") + user._id;

  const hashedToken = hashToken(resetToken);


  await new Token({
    userId: user._id,
    passresetToken: hashedToken,
    createdAt: Date.now(),
    expiresAt: Date.now() + 60 * (60 * 1000),
  }).save();

  // Construct reset password URL
  const resetPasswordUrl = `${process.env.FRONTEND_USER}/resetpassword/${resetToken}`;

  // Set email parameters
  const subject = "Password Reset - Thritify";
  const send_to = user.email;
  const send_from = process.env.EMAIL_SENDER;
  const reply_to = "noreply@thritify.com";
  const template = "forgotpassword.";
  const name = user.firstname;
  const link = resetPasswordUrl;

  // Send email
  try {
    await sendEmail(
      subject,
      send_to,
      send_from,
      reply_to,
      null,
      template,
      name,
      link,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
      
    );

    // Respond with success message
    res.status(200).json({ message: "Password reset email sent" });
  } catch (error) {
    res.status(404).json({ message: error });
  }
});

//reset password

const resetPassword = asyncHandler(async (req, res) => {
  const { resetToken } = req.params;
  const { newpassword } = req.body;

  const hashedtoken = hashToken(resetToken);

  const userToken = await Token.findOne({
    passresetToken: hashedtoken,
    expiresAt: { $gt: Date.now() },
  });


  if (!userToken) {
    return res.status(404).json("expired link please send new link ");
  }

  if (!newpassword) {
    return res.status(404).json("please input password");
  }

  // find user

  const user = await User.findOne({ _id: userToken.userId });
 
  // reset password

  user.password = newpassword;
  await user.save();

  return res
    .status(200)
    .json({ message: "password reset was suscesfull please login " });
});

//change password
const changePassword = asyncHandler(async (req, res) => {
  try {
    const { password, newpassword, cpassword } = req.body;

    // Fetch user by ID
    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(400);
      throw new Error("User not found");
    }

    if (!password || !newpassword) {
      return res.status(400).json( "Enter old and new password" );
    }

    if (newpassword !== cpassword) {
      return res
        .status(400)
        .json( "Confirm password must match the new password" );
    }

    if (password === newpassword) {
      return res
        .status(400)
        .json( "New password must be different from the current password");
    }

    // Check if the old password is correct
    const passwordIsCorrect = await bcrypt.compare(password, user.password);

    if (!passwordIsCorrect) {
      return res.status(400).json( "Old password is not correct" );
    }

    // Save the new password
    user.password = newpassword;
    await user.save();

    // Send email notification to the user
    const template = "passwordchanged.";
    const reply_to = "noreply@thritify.com";
    const send_from = process.env.EMAIL_SENDER;
    const subject = "Your password has been changed successfully";
    const send_to = user.email;
    const name = user.name;

    await sendEmail(
      subject, // Subject
      send_to, // To email
      send_from, // From email
      reply_to, // Reply-to email
      null, // CC
      template, // Template name
      null, // Other placeholders as null
      null,
      name, // Name placeholder
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    );

    res
      .status(200)
      .json({ message: "Password changed successfully. Please log in." });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ message: "An error occurred", error: error.message });
  }
});


//------------------------------------------//
// create goods

const createGood = asyncHandler(async (req, res) => {
  const {
    images,
    title,
    itemDescription,
    category,
    subcategory,
    price,
    location,
    attributes,
    deliveryDate,

  } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(401).json({ message: "Please log in to be able to sell." });
    }

    const newGood = await Good.create({
      userId: user._id,
      images,
      title,
      itemDescription,
      category,
      subcategory,
      price,
      location: location || user.location.toString(),
      attributes,
      deliveryDate,
    });
  

    const updatedGoods = await Good.find({ userId: user._id });

    // Send notification and add auto-review if it's their first good
    if (updatedGoods.length === 1) {
      await firstListingNotification(user._id);

      const autoReview = new Review({
        userId: user._id,
        rating: 5,
        name: "Thriftiffy",
        comment: "Auto-feedback: Sale completed successfully.",
      });

      await autoReview.save();
    }

    res.status(201).json(newGood);
  } catch (error) {
    console.error("Error creating good:", error);
    res.status(500).json({ message: error.message });
  }
});


//aproved goods to dsplay on frontend
const getAllApprovedgoods = asyncHandler(async (req, res) => {
  const good = await Good.find({ aproval: true });

  if (!good || good.length === 0) {
    return res.status(404).json({ message: "No approved goods found" });
  }

  res.status(200).json(good);
});

//get all goods
const getAllgoods = asyncHandler(async (req, res) => {
  try {
    // Ensure the user is authenticated
   

    // Fetch goods that are not purchased and not from the current user
    const goods = await Good.find({
      purchased: false,
    });

    // Check if goods exist
    if (!goods || goods.length === 0) {
      return res.status(404).json({ message: "No goods available" });
    }

    res.status(200).json(goods);
  } catch (error) {
    console.error("Error fetching goods:", error);
    res.status(500).json({ message: "Server error while fetching goods" });
  }
});

//get all goods by user
const getAllgoodsbyUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const usergoods = await Good.find({ userId: user });

  if (!usergoods || usergoods.length === 0) {
    return res
      .status(404)
      .json({ message: "You've not uploaded any item yet" });
  }
  res.status(200).json(usergoods);
});

// update users goods
const Updateusergoods = asyncHandler(async (req, res) => {
  const itemId = req.params.id;
  const user = await User.findById(req.user._id);

  const userItem = await Good.findOne({ userId: user._id, _id: itemId });

  if (!userItem) {
    return res
      .status(404)
      .json({ message: "Item not found or incorrect item ID" });
  }

  const {
    images,
    title,
    itemDescription,
    category,
    subcategory,
    price,
    location,
    attributes,
    deliveryDate,
  } = userItem;

  // Update allowed fields
  userItem.title = req.body.title || title;
  userItem.itemDescription = req.body.itemDescription || itemDescription;
  userItem.category = req.body.category || category;
  userItem.price = req.body.price || price;
  userItem.subcategory = req.body.subcategory || subcategory;
  userItem.images = req.body.images || images;
  userItem.deliveryDate = req.body.deliveryDate || deliveryDate;
  userItem.location = req.body.location || location;
  userItem.attributes = req.body.attributes || attributes;



  const updateditem = await userItem.save();

  res.status(200).json({
    _id: updateditem._id,
    title: updateditem.title,
    itemDescription: updateditem.itemDescription,
    category: updateditem.category,
    subcategory: updateditem.subcategory,
    images: updateditem.images,
    price: updateditem.price,
    deliveryDate: updateditem.deliveryDate,
    location: updateditem.location,
    attributes: updateditem.attributes,
  });
});


//delete usersitem

const Deleteusergoods = asyncHandler(async (req, res) => {
  const itemId = req.params.id;

  const user = await User.findById(req.user._id);
  const userItem = await Good.findOneAndDelete({ userId: user._id, _id: itemId });

  if (!userItem) {
    return res.status(400).json({ message: "Item not found or already deleted" });
  }

  try {
    const imageIds = userItem.images
      .map(img => img.id) // or extract from img.url
      .filter(Boolean);

    for (const imageId of imageIds) {
     const deletedimage = await axios.delete(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ID }/images/v1/${imageId}`,
        {
          headers: {
            Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          },
        }
      );
    }

    return res.status(200).json({ message: "Item and images deleted successfully" });
  } catch (err) {
    console.error("Failed to delete images from Cloudflare:", err.message);
    return res.status(500).json({
      message: "Item deleted but failed to delete Cloudflare images",
    });
  }
});




//initialis playment  women
const initialisePayment = asyncHandler(async (req, res) => {
  const { email, amount, couponCode, metadata } = req.body;

  if (!email || !amount) {
    return res.status(400).json({ error: "Email and amount are required." });
  }

  let finalAmount = amount;
  let meta = metadata || {};

  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode });

    if (!coupon || !coupon.isActive || coupon.usedCount >= coupon.limit || new Date() > coupon.expiryDate) {
      return res.status(400).json({ error: "Invalid or expired coupon code." });
    }

    finalAmount -= coupon.discountAmount;
    if (finalAmount < 0) finalAmount = 0;

    meta.couponCode = couponCode;
  }

  try {
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount: finalAmount * 100, // in kobo
        metadata: meta,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json(response.data);

  } catch (error) {
    console.error("Error initializing payment:", error.response?.data || error.message);
    return res.status(400).json({
      error: error.response?.data || "Failed to initialize payment.",
    });
  }
});



//verify  playment
const Paymentverification = asyncHandler(async (req, res) => {
  const { reference } = req.query;

  if (!reference) {
    return res.status(400).send("Reference is required");
  }

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { status, data } = response.data;

    if (!status) {
      return res.status(404).json({
        message: "Invalid transaction reference",
      });
    }

    if (data.status === "success") {

 // this is a JSON string
      const metadata = typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata;
      console.log('metadat json:',metadata)

   
      const itemId = metadata.itemId;
      const buyerId = metadata.buyerId;
      const sellerId = metadata.sellerid;
      const couponCodes = metadata.couponCode || []; // get coupon if passed
      const amount = metadata.finalAmount;
     
      const item = await Good.findById(itemId);
      const order = await Order.findById(buyerId);

      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }
    
      // Mark item as purchased
      item.purchased = true;
      item.price = Number(metadata.itemPrice);
      await item.save();

    
      // Update buyer details
      const buyerdetails = await User.findById(buyerId);
      if (!buyerdetails) {
        return res.status(400).json({ message: "Can't find buyer" });
      }
    
      buyerdetails.pendingPurchasedAmount += amount;
      await buyerdetails.save();  const sellerdetails = await User.findById(sellerId);

      // seller datails
      if (!sellerdetails) {
        return res.status(400).json("Can't find seller");
      }
      const itemPrice = Number(metadata.itemPrice) 

      if (isNaN(itemPrice)) {
        return res.status(400).json({ message: "Invalid item price provided" });
      }

      const companyFee = itemPrice * 0.10;
const transactionFee = 120;
const sellerEarnings = itemPrice - companyFee - transactionFee;

      sellerdetails.pendingSoldAmount +=sellerEarnings
      await sellerdetails.save();

         // Save order
         const newOrder = new Order({
          buyer: buyerId,
          orderitems: item,
          purchased: true,
        });
        await newOrder.save();
      
        // ✅ If coupon was passed, verify and log usage
        // ✅ If coupon was passed, verify and log usage
        if (Array.isArray(couponCodes) && couponCodes.length > 0) {
          for (const code of couponCodes) {
            const coupon = await Coupon.findOne({ code });
        
            if (coupon) {
              const isExpired = new Date() > coupon.expiryDate;
              const isUsageLimitReached = coupon.usedCount >= coupon.usageLimit;
        
              const perUserUsageCount = await CouponUsage.countDocuments({
                userId: buyerId,
                couponCode: code
              });
        
              const isPerUserLimitReached =
                coupon.perUserLimit && perUserUsageCount >= coupon.perUserLimit;
        
              if (
                coupon.isActive &&
                !isExpired &&
                !isUsageLimitReached &&
                !isPerUserLimitReached
              ) {
                // Increment usage count
                coupon.usedCount += 1;
                await coupon.save();
        
                // Log usage
                await CouponUsage.create({
                  userId: buyerId,
                  couponCode: code,
                  amountApplied: coupon.discountValue,
                  orderId: newOrder._id,
                });
              }
            }
          }
        }
      
        const template = "buyerpurchased.";
        const reply_to = "noreply@thritify.com";
        const send_from = process.env.EMAIL_SENDER;
        const subject = "Item successfully purchased";
        const send_to = metadata.buyerEmail;
        const sellername = metadata.sellerName;
        const buyername = metadata.buyerName;
        const itemname = metadata.itemName;
        const itemprice = metadata.itemPrice;
        const deliverydate = item.deliverydate;
        const buyeraddress = metadata.buyerAddress;
        const cc = process.env.ADMIN_EMAIL;
        

        await sendEmail(
          subject,
          send_to,
          send_from,
          reply_to,
          cc,
          template,
          null,
          null,
          buyername,
          itemname,
          sellername,
          null,
          null,
          null,
          null,
          null,
          deliverydate
        );

        // Seller email
        const sellerTemplate = "sellerpurchased.";
        const sellerSubject = "Your item has been purchased";
        const sellerEmail = metadata.sellerEmail;
        const phonenumber = metadata.phoneNumber;
        const deliveryformurl = `${process.env.FRONTEND_USER}/deliveryform/${newOrder._id}/${itemname}`;
        const sellercc = "purchased@thriftiffy.com";
        const platformCommission = itemprice * 0.10;
        const paystackFee = 120;
        const finalPayment = itemprice - platformCommission - paystackFee;

        await sendEmail(
          sellerSubject,
          sellerEmail,
          send_from,
          reply_to,
          sellercc,
          sellerTemplate,
          null,
          null,
          buyername,
          finalPayment,
          sellername,
          itemname,
          buyeraddress,
          phonenumber,
          deliveryformurl,
          null,
          null
        );

      return res.status(200).json({
        status: "success",
        message: "Payment verified successfully",
        data,
      });
      
    }

    if (data.status === "abandoned") {
      return res.status(404).json({
        message: "Transaction has been abandoned, go back to payment page to complete payment",
        data,
      });
    }

    if (data.status === "failed") {
      return res.status(400).json({
        message: "Transaction failed",
        data,
      });
    }

    return res.status(400).json({
      message: `Unexpected transaction status: ${data.status}`,
      data,
    });

  } catch (error) {
    console.error("Error verifying payment:", {
      message: error.message,
      responseData: error.response?.data,
      status: error.response?.status,
    });

    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data?.message || "Payment verification failed",
      });
    }

    return res.status(500).json({
      error: "An unexpected server error occurred",
      message: error.message
    });
  }
});


// get orders 

const getallorders = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  try {
    const orders = await Order.find({ buyer: userId });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// update purchased item

const UpdatePurchasedItem = asyncHandler(async (req, res) => {
  const { itemid } = req.params;

  const {
    deliverycompany,
    trackingnumber,
    trackingwebsite,
    sentdate,
    deliverydate,
    otherinfo,
  } = req.body;

  // getting purchased order
  const purchasedItem = await Order.findById({ _id: itemid });

  try {
    if (!purchasedItem) {
      return res.status(404).json({ message: "purchased item not found" });
    }

    if (purchasedItem.dispatch) {
      return res
        .status(400)
        .json({ message: "Item has already been dispatched" });
    }
    // updating that item has been dispatched

    purchasedItem.dispatch = true;
    await purchasedItem.save();

    // getting buyer id , to be able to get buyer detaails
    const buyerId = purchasedItem.buyer;

    const buyerdetails = await User.findById({ _id: buyerId });

    if (!buyerdetails) {
      return res.status(404).json({ message: "buyerdetails  not found " });
    }
    // getting purchased item from goods witth order id
    const purchasedgoodsId = purchasedItem.orderitems[0]._id;

    //getting purchased good to be able to update it
    const purchasedgoods = await Good.findById({ _id: purchasedgoodsId });
    // updating that item has been dispatched

    purchasedgoods.dispatch = true;
    await purchasedgoods.save();

    // buyer email to send an update to
    const buyerEmail = buyerdetails.email;
    const buyerFirstname = buyerdetails.firstname;
    const itemdetails = purchasedgoods.title;

    const template = "dispatched.";
    const send_to = buyerEmail;
    const subject = `Your purchased item ${purchasedgoods.title} has been sent`;
    const orderid = purchasedgoodsId;
    const buyername = buyerFirstname;
    const sent_from = process.env.EMAIL_SENDER;
    const reply_to = "noreply@thritify.com";
    const itemname = itemdetails;
    const file = req.file;
    const cc = "dispatched@thriftiffy.com";
    const link = `${process.env.FRONTEND_USER}/confirmdelivery/${itemid}/${purchasedgoods.title}`;

    await dispatchEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      cc,
      template,
      null,
      link,
      null,
      buyername,
      itemname,
      orderid,
      deliverycompany,
      trackingnumber,
      trackingwebsite,
      sentdate,
      deliverydate,
      otherinfo,
      file,
      null,
      null
    );

    return res.status(200).json({
      message:
        "item dispatched status updated to true and buyer has been notified",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const updateAllUserInfo = asyncHandler(async (req, res) => {
  try {
    const result = await User.updateMany(
      {}, // optional: add conditions if needed
      {
        $set: {
        
          online: false,
          offline:false,
          lastSeen: null,
        },
      }
    );

    return res.status(200).json({ updated: result.modifiedCount });
  } catch (error) {
    console.error("Error updating users with new fields:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


const Trackpurchaseditem = asyncHandler(async (req, res) => {
  const { itemid } = req.params;
  const Purchaseditem = await Good.findById(itemid);

  if (!Purchaseditem) {
    return res.status(404).json("purchased item not found");
  } else {
    return res.status(200).json(Purchaseditem);
  }
});

const ConfirmDelivery = asyncHandler(async (req, res) => {
  const { itemid } = req.params;

  try {
    const Purchaseditem = await Order.findById(itemid).populate(
      "orderitems.sellerdetails.sellerid"
    );

    if (!Purchaseditem) {
      return res.status(404).json("Purchased item not found");
    }

    if (!Purchaseditem.purchased) {
      return res
        .status(400)
        .json("can't confirm item that has not been purchased");
    }

    if (Purchaseditem.delivered) {
      return res.status(400).json("Order item has already been delivered");
    }

    // Mark the Purchaseditem as delivered
    Purchaseditem.delivered = true;
    await Purchaseditem.save();

    const getgoodsid = Purchaseditem.orderitems[0]._id;
    const purchasedgoods = await Good.findById(getgoodsid);

    if (!purchasedgoods) {
      return res.status(404).json("Goods item not found");
    }

    if (purchasedgoods.delivered) {
      return res.status(400).json("Goods item has already been delivered");
    }

    // Mark the purchasedgoods as delivered
    purchasedgoods.delivered = true;
    await purchasedgoods.save();

    // Find seller info and update amounts
    const sellerDetails = Purchaseditem.orderitems[0].sellerdetails[0];
    const sellerid = sellerDetails.sellerid;
    const selleremail = sellerDetails.email;

    if (!sellerid) {
      return res.status(404).json("Can't find seller ID");
    }

    const Getsellerinfo = await User.findById(sellerid);
    if (!Getsellerinfo) {
      return res.status(404).json("Seller not found");
    } else Getsellerinfo.totalSoldAmount += Getsellerinfo.pendingSoldAmount;
    Getsellerinfo.pendingSoldAmount = 0;
    Getsellerinfo.successfullDelivery += 1;
    Getsellerinfo.spinPoint +=100

    await Getsellerinfo.save();

    const buyerid = Purchaseditem.buyer;

    const Getbuyerinfo = await User.findById(buyerid);

    if (!Getbuyerinfo) {
      return res.status(404).json("buyer not found");
    } else {
      Getbuyerinfo.totalPurchasedAmount += Getbuyerinfo.pendingPurchasedAmount;
      Getbuyerinfo.pendingPurchasedAmount = 0;
      Getbuyerinfo.spinPoint +=100

      await Getbuyerinfo.save();
    }

    // Create a review
    const review = new Review({
      userId: sellerid,
      rating: 5, // Default rating
      name: "Thriftiffy", // Assuming 'name' field in User schema
      comment: "Auto-feedback: Sale completed successfully.", // Default comment
    });

    await review.save();
    // Send email notification
    const template = "confirmdelivery.";
    const send_to = selleremail;
    const subject = `Your item ${Purchaseditem.orderitems[0].title} has been delivered`;
    const name = sellerDetails.firstname;
    const itemprice = Purchaseditem.orderitems[0].price;

    const sent_from = process.env.EMAIL_SENDER;
    const reply_to = "noreply@thritify.com";
    const cc = "dispatched@thriftiffy.com";
    const link = `${process.env.FRONTEND_USER}`;

    await dispatchEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      cc,
      template,
      name,
      link,
      itemprice,
      null,
      Purchaseditem.orderitems[0].title,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    );

    //send buyer to write review email

    const buyerreviewtemplate = "ReviewforBuyer.";
    const send_tobuyer = Getbuyerinfo.email;
    const subjecttobuyer = `write review for the item  ${Purchaseditem.orderitems[0].title} thta has been confrimed delivered`;
    const namebuyer = Getbuyerinfo.firstname;

    const reviewlink = `${process.env.FRONTEND_USER}/review/${sellerid}/${Purchaseditem.orderitems[0]._id}`;

    await dispatchEmail(
      subjecttobuyer,
      send_tobuyer,
      sent_from,
      reply_to,
      cc,
      buyerreviewtemplate,
      namebuyer,
      reviewlink,
      null,
      null,
      Purchaseditem.orderitems[0].title,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    );

    res
      .status(200)
      .json(
        "Email sent successfully, review saved and generated, seller amount updated"
      );
  } catch (error) {
    console.error("Error confirming delivery:", error);
    res.status(500).json({
      message: "An error occurred while confirming delivery",
      error: error.message,
    });
  }
});

// dispute delivery
const Disputedelivery = asyncHandler(async (req, res) => {
  const { itemid } = req.params;

  try {
    const Purchaseditem = await Order.findById(itemid).populate(
      "orderitems.sellerdetails.sellerid"
    );

    if (!Purchaseditem) {
      return res.status(404).json("Purchased item not found");
    }

    if (!Purchaseditem.purchased) {
      return res
        .status(404)
        .json("cant create dispute for item that has not been purhcased ");
    }

    if (Purchaseditem.dispute) {
      return res.status(400).json("Ordered item has already in dispute");
    }

    // Mark the Purchaseditem as delivered
    Purchaseditem.dispute = true;
    Purchaseditem.delivered = true;
    await Purchaseditem.save();

    const getgoodsid = Purchaseditem.orderitems[0]._id;
    const purchasedgoods = await Good.findById(getgoodsid);

    if (!purchasedgoods) {
      return res.status(404).json("Goods item not found");
    }

    if (purchasedgoods.dispute) {
      return res.status(400).json("Goods item already in dispute");
    }

    // Mark the purchasedgoods as delivered
    purchasedgoods.dispute = true;
    purchasedgoods.delivered = true;

    await purchasedgoods.save();

    // Find seller info and update amounts
    const sellerDetails = Purchaseditem.orderitems[0].sellerdetails[0];
    const sellerid = sellerDetails.sellerid;
    const selleremail = sellerDetails.email;

    if (!sellerid) {
      return res.status(404).json("Can't find seller ID");
    }

    const Getsellerinfo = await User.findById(sellerid);

    if (!Getsellerinfo) {
      return res.status(404).json("Seller not found");
    } else
    Getsellerinfo.pendingDisputeAmount = (Getsellerinfo.pendingDisputeAmount || 0) + (Getsellerinfo.pendingSoldAmount || 0);
Getsellerinfo.pendingSoldAmount = 0;

    await Getsellerinfo.save();

    const buyerid = Purchaseditem.buyer;

    const Getbuyerinfo = await User.findById(buyerid);

    if (!Getbuyerinfo) {
      return res.status(404).json("buyer not found");
    } else {
      Getbuyerinfo.pendingDisputeAmount = (Getbuyerinfo.pendingDisputeAmount || 0) + (Getbuyerinfo.pendingPurchasedAmount || 0);
      Getbuyerinfo.pendingPurchasedAmount = 0;

      await Getbuyerinfo.save();
    }

    // Send email notification
    const template = "Sellerdisputmessage.";
    const send_to = selleremail;
    const subject = `Your item ${Purchaseditem.orderitems[0].title} has been marked has dispute`;
    const name = sellerDetails.firstname;
    const itemprice = Purchaseditem.orderitems[0].price;
    const orderid = itemid;
    const sent_from = process.env.EMAIL_SENDER
    const reply_to = "noreply@thritify.com";
    const cc = "dispatched@thriftiffy.com";
    const link = `${process.env.FRONTEND_USER}`;

    //email to seller
    await dispatchEmail(
      subject,
      send_to,
      sent_from,
      reply_to,
      cc,
      template,
      name,
      null,
      null,
      null,
      Purchaseditem.orderitems[0].title,
      orderid,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      link,
      null,
      null
    );

    res.status(200).json("Email sent successfully, dispute created");
  } catch (error) {
    console.error("Error confirming delivery:", error);
    res.status(500).json({
      message: "An error occurred while confirming delivery",
      error: error.message,
    });
  }
});

// create review after sucessful purchased
//Create review
const createreview = asyncHandler(async (req, res) => {
  const { name, comment, rating } = req.body;
  const { sellerId, itemId } = req.params;

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "log in to leave review" });
  }

  if (!name || !comment || !rating) {
    return res.status(404).json({ message: "please fill in the form" });
  }

  const checkforreview = await Review.findOne({ itemId });

  if (checkforreview) {
    return res
      .status(400)
      .json({ message: "review has already been ctrated for this item " });
  }

  const reviews = await Review.create({
    name,
    comment,
    rating,
    userId: sellerId,
    itemId: itemId,
  });

  if (reviews) {
    return res.status(200).json("Review created sucessfully");
  } else {
    return res.status(404).json({ message: "unable to create review " });
  }
});

const getAllreview = asyncHandler(async (req, res) => {
  
  // Fetch and sort reviews by 'createdAt' in ascending order (earliest first)
  const getUserreview = await Review.find().sort({ createdAt: 1 });

  if (!getUserreview || getUserreview.length === 0) {
    return res.status(404).json({ message: "No reviews found" });
  }
  return res.status(200).json(getUserreview);
});


const requestWithdrawal = asyncHandler(async (req, res) => {
  const { requestedAmount, accountNumber, bankName, accountName } = req.body;

  // Ensure all required fields are provided
  if (!requestedAmount || !accountNumber || !bankName || !accountName) {
    return res
      .status(400)
      .json({ message: "Please fill all the required fields." });
  }

  // Convert Request  edAmount to a number
  const requestedAmounttoNumber = Number(requestedAmount);

  // Ensure the requested amount is positive
  if (requestedAmount <= 0) {
    return res
      .status(400)
      .json({ message: "Requested amount must be greater than zero." });
  }

  // Find the user by their ID
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Check if the provided first and last names match the user's name on record

  // Ensure the requested amount does not exceed the total sold amount
  if (requestedAmounttoNumber > user.totalSoldAmount) {
    return res
      .status(400)
      .json({ message: "You can't request more than your total sold amount." });
  }

  // Update user's pending withdrawal amount and total sold amount
  user.pendingWithdrawalAmount += requestedAmounttoNumber;
  user.totalSoldAmount -= requestedAmounttoNumber;

  user.totalSoldAmount = parseFloat(user.totalSoldAmount.toFixed(2));
  user.pendingWithdrawalAmount = parseFloat(
    user.pendingWithdrawalAmount.toFixed(2)
  );
  // Save user data to the database
  await user.save();

  // Prepare email variables
  const name = user.firstname;
  const withdrawalTemplate = "RequestWithdrawal.";
  const subject = "Confirmation of Your Withdrawal Request";
  const userEmail = user.email;
  const sentFrom = process.env.EMAIL_SENDER;
  const replyTo = "noreply@thriftify.com";
  const cc = process.env.ADMIN_EMAIL;
  const amount = requestedAmount;
  const bankname = bankName
  const accountnumber = accountNumber

  // Send confirmation email
  await dispatchEmail(
    subject,
    userEmail,
    sentFrom,
    replyTo,
    cc,
    withdrawalTemplate,
    name,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    amount,
    bankname,
    accountnumber


  );
  console.log("CC Address:", cc);
  // Send response
  res.status(200).json({
    message:
      "Your withdrawal request has been received. You will receive your payment within 1-2 business days.",
  });
});

const customerPaid = asyncHandler(async (req, res) => {
  const { paidAmount } = req.body; // Typo correction: paidAmout => paidAmount
  const { id } = req.params; // Correctly extracting the ID from req.params

  const amountPaid = Number(paidAmount);

  if (!paidAmount) {
    return res.status(404).json({ message: "Put amount paid" });
  }
  // Find the user by their ID
  const user = await User.findById(id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Ensure the user has enough pending withdrawal amount
  if (amountPaid > user.pendingWithdrawalAmount) {
    return res
      .status(400)
      .json({ message: "Insufficient pending withdrawal amount." });
  }

  // Update user's pending withdrawal amount and total sold amount
  user.pendingWithdrawalAmount -= amountPaid;
  user.totalWithdrawalAmount += amountPaid;

  // Fix potential floating point precision issues
  user.totalSoldAmount = parseFloat(user.totalSoldAmount.toFixed(2));
  user.pendingWithdrawalAmount = parseFloat(
    user.pendingWithdrawalAmount.toFixed(2)
  );

  // Save user data to the database
  await user.save();

  // Prepare email variables
  const name = user.firstname;
  const withdrawalTemplate = "paid."; // Removed the trailing period
  const subject = "Your Withdrawal is on the Way – Thriftify Confirmation";
  const userEmail = user.email;
  const sentFrom = process.env.EMAIL_SENDER
  const replyTo = "noreply@thriftify.com";
  const cc = "dispatched@thriftiffy.com";
  const amount = amountPaid; // Corrected variable name

  // Send confirmation email
  await sendEmail (
    subject,
    userEmail,
    sentFrom,
    replyTo,
    cc,
    withdrawalTemplate,
    name,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    amount,
    null,
    null

  );

  // Send response
  res.status(200).json({
    message:
      "Your withdrawal request has been processed. You will receive your payment shortly.",
  });
});


const idNotificationEmail = asyncHandler(async (req, res) => {
  const { verificationType, ninNumber, dob, email, address, firstname, lastname, location } = req.body;
  const files = req.files; // Get uploaded files

  // Validate required fields
  if (!verificationType || !email || !address || !dob||!location ||!firstname|| !lastname) {
    return res.status(400).json({ message: "Please fill in all the required details." });
  }

  // If verification type is NIN, validate NIN
  if (verificationType === "nin") {
    if (!ninNumber || ninNumber.length !== 11) {
      return res.status(400).json({ message: "NIN must be exactly 11 digits." });
    }
    if (!files || files.length < 1) {
      return res.status(400).json({ message: "Proof of Address is required for NIN verification." });
    }
  }

  // If verification type is ID, require two uploaded files
  if (verificationType === "id") {
    if (!files || files.length < 2) {
      return res.status(400).json({ message: "Both ID document and Proof of Address are required for ID verification." });
    }
  }

  try {
    // Retrieve the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if the user has already requested ID verification
    if (user.verificationRequested) {
      return res.status(400).json({ message: "You have already requested ID verification." });
    }

    // Update user details if they are missing
    if (!user.firstname && firstname) user.firstname = firstname;
    if (!user.lastname && lastname) user.lastname = lastname;
    if (!user.location && location) user.location = location;
    if (!user.dob && dob) user.dob = dob;

    // Save the address
    user.fullAddress = user.fullAddress || [];
    user.fullAddress.push({ address });

    if (verificationType === "nin") {
      user.ninDetails = user.ninDetails || [];
      user.ninDetails.push({ ninNumber });
    }

    // Mark verification as requested
    user.verificationRequested = true;
    await user.save();

    // Prepare email details
    const name = `${user.firstname} ${user.lastname}`;
    const sentFrom = process.env.EMAIL_SENDER;
    const replyTo = "noreply@thriftify.com";
    const cc = "dispatched@thriftiffy.com";
    const customerEmail = user.email;
    const subject = "ID Verification Request";
    const adminEmail = process.env.ADMIN_EMAIL;

    console.log("Uploaded Files:", files);

    // Notify customer
    await idVerificationEmail(
      subject,
      customerEmail,
      sentFrom,
      replyTo,
      cc,
      "idverification.",
      name,
      ninNumber || "N/A",
      null,
      null,
      null,
      null
    );

    // Notify verification officer
    await idVerificationEmail(
      subject,
      adminEmail,
      sentFrom,
      replyTo,
      cc,
      "adminidverificationemail.",
      name,
      ninNumber || "N/A",
      dob,
      location,
      files,
      address
    );

    // Send response
    res.status(200).json({
      message: "Your ID verification process has been initiated.",
    });

  } catch (error) {
    console.error("Error sending ID verification emails:", error);
    res.status(500).json({ message: "An error occurred while processing your request." });
  }
});



const idConfirmationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Validate required fields
  if ( !email) {
    return res.status(400).json({ message: 'Please fill in all the required details.' });
  }

  try {
    // Retrieve the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json( 'User not found.' );
    }

    // Check if the user has already requested ID verification
    if (user.idVerified) {
      return res.status(400).json( 'user already verify.' );
    }
 
    user.idVerified = true; // Mark the verification as requested
    await user.save();

    // Prepare email details
    const name = `${user.firstname}`;
    const sentFrom = process.env.EMAIL_SENDER;
    const replyTo = "noreply@thriftify.com";
    const cc = "dispatched@thriftiffy.com";
    const customerEmail = user.email;
    const idConfirmationTemplate = 'idconfirmationemail.';
    const subject = 'Congratulations!!';
    const link =`${process.env.FRONTEND_USER}`
    // Notify customer
    await idVerificationEmail(
      subject,
      customerEmail,
      sentFrom,
      replyTo,
      cc,
      idConfirmationTemplate,
      name,
      null,
      null,
      link,
      null,
      
  
    );

    // Send response
    res.status(200).json({
      message: "Id verification successful.",
    });

  } catch (error) {
    console.error("Error sending ID confirmation emails:", error);
    res.status(500).json({ message: "An error occurred while processing your request." });
  }
});



const idRejectionEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  // Validate required fields
  if ( !email) {
    return res.status(400).json({ message: 'Please fill in all the required details.' });
  }

  try {
    // Retrieve the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

if(user.idVerified){
  return res.status(404).json({ message: 'User already verified.' });
}

    user.verificationRequested = false; //Reset verification 
    await user.save();
   

    // Prepare email details
    const name = `${user.firstname} ${user.lastname}`;
    const sentFrom = process.env.EMAIL_SENDER;
    const replyTo = "noreply@thriftify.com";
    const cc = "dispatched@thriftiffy.com";
    const customerEmail = user.email;
    const idConfirmationTemplate = 'Idrejectionemail.';
    const subject = 'Id Verification rejected!!';
 
    const link =`${process.env.FRONTEND_USER}`
    // Notify customer
    await idVerificationEmail(
      subject,
      customerEmail,
      sentFrom,
      replyTo,
      cc,
      idConfirmationTemplate,
      name,
      null,
      null,
      link,
      null
    );

    // Send response
    res.status(200).json({
      message: "Id rejecttion email sent successfully.",
    });

  } catch (error) {
    console.error("Error sending ID confirmation emails:", error);
    res.status(500).json({ message: "An error occurred while processing your request." });
  }
});




const productsearch = asyncHandler(async (req, res) => {
  const { query } = req.query;

  try {
    // Ensure the query is not empty or undefined
    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query cannot be empty' });
    }

    // Find products where the name matches the search query and not purchased
    const products = await Good.find({
      $and: [
        { title: { $regex: query, $options: 'i' } }, // Case-insensitive title search
        { purchased: false } // Only show products that have not been purchased
      ]
    }).limit(10); // Limit the number of suggestions

    // Return the products found
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const productsearchbycategory = asyncHandler(async (req, res) => {
  const { query, priceRange, location, sortOrder } = req.query;

  try {
    // Ensure the query is not empty or undefined
    if (!query || query.trim() === '') {
      return res.status(400).json({ error: 'Search query cannot be empty' });
    }

    // Prepare price range for filtering
    let minPrice = 0;
    let maxPrice = Infinity;

    if (priceRange) {
      const price = parseInt(priceRange);
      minPrice = 0;
      maxPrice = price;
    }

    // Build query for products
    const queryConditions = {
      $and: [
        { category: { $regex: `\\b${query}\\b`, $options: 'i' } }, 
        { purchased: false }, // Only show products that have not been purchased
        { price: { $gte: minPrice, $lte: maxPrice } }, // Price range filtering
        { location: location ? { $regex: `^${location}$`, $options: 'i' } : { $exists: true } } // Regex match for location if provided
      ]
      
    };

    // Sort order
    const sortOptions = {};
    if (sortOrder === 'asc') {
      sortOptions.price = 1; // Sort by price ascending
    } else if (sortOrder === 'desc') {
      sortOptions.price = -1; // Sort by price descending
    }

    const products = await Good.find(queryConditions).sort(sortOptions).limit(20);
    return res.status(200).json(products);
  } catch (error) {
    console.error('Error occurred:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }

});

const messageUs = asyncHandler(async (req, res) => {
const {name,email,phonenumber,message} =req.body
  try {
    if(!name || !email || !phonenumber || !message){
      return res.status(400).json({ error: 'please fill in the required field' });
    }

    const viewsBasePath = process.env.VIEWS_PATH || path.join(__dirname, 'views');
    const sendFrom = process.env.EMAIL_SENDER
    const sendTo = 'olubodekehinde2019@gmail.com'
    const template =  'messageus.'

    await contactUs(
      'New Contact Us Message',
      sendTo,
      sendFrom,
      null,
      null,
      template,
      name,
      message,
      phonenumber,
      email
    );
    
    res.status(200).json({ success: 'Message received and email sent successfully!' });
    console.log('email sent ')

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const tokenGenerator = asyncHandler(async (req, res) => {
  console.log("Received request body:", req.body)
  const { email } = req.body;
  

  try {
    // if (!email) {
    //   return res.status(400).json({ message: "Can't generate token" });
    // }

    const user = await User.findOne(email); // Ensure the field name matches your schema

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const token = generateToken(user._id);


    return res.status(200).json( token );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const googleLogin = asyncHandler(async (req, res) => {
  const token = req.body.token;
  try {

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_KEY,  // Your Client ID
    });
    
  
    
    if (!ticket) {
      return res.status(404).json({ message: 'No ticket or valid token' });
    }

    // Extract user information from the payload
    const payload = ticket.getPayload();
    const email = payload.email;
    const userId = payload.sub;
   const firstName = payload.given_name
   const lastName =payload.family_name

    // Check if user already exists in the database
    let user = await User.findOne({ email });
    
    if (!user) {
      // If user does not exist, create a new user
      user = await User.create({
        email:email,
        username:userId,
        isVerified:true,
        contactType:'email',
        firstname:firstName,
        lastname:lastName

        // Add any other fields needed
      });

      const subject = "Google Signup Alert - Thriftify";
      const send_to = process.env.ADMIN_EMAIL; // Use env variable
      const send_from = process.env.EMAIL_SENDER;
      const reply_to = "noreply@thriftify.com";
      const template = "signupalert.";
      const name = user.firstName;
      const useremail = email

      try {
        await sendEmail( subject,
          send_to,
          send_from,
          reply_to,
          null,
          template,
          name,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          useremail
        );
        console.log(`Signup alert sent to admin: ${send_to}`);
      } catch (error) {
        console.error("Failed to send signup alert:", error.message);
      }
     
    } 

    // Generate a JWT token for the user to log them in
    const jwtToken = generateToken(user._id);  // You should define `generateJwtToken` to create a JWT token for the user.

    // Send the response to the client with the token
    res.json({
      message: 'User logged in successfully',
      token: jwtToken,
      user: user,  // Optionally send the user data
    });
  } catch (error) {
    console.error('Error in googleLogin:', error); // Log the error
    res.status(400).json({ message: 'Invalid token', error });
  }
});





const countSignupsPerDayAPI = asyncHandler(async (req, res) => {
  try {
    const today = new Date();
    const count = await countSignupsPerDay(today);
    res.json({ signupsToday: count });
  } catch (error) {
    console.error('Error in countSignupsPerDayAPI:', error);  // Log error details
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});






const checkoutItem = asyncHandler(async (req, res) => {
  try {
    const { itemId } = req.params;

    // Fetch the item by itemId
    const item = await Good.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not available or already sold.' });
    }

    if (item.purchased) {
      return res.status(400).json({ message: 'Item is no longer available for purchase.' });
    }

  // Send email notification to admin (or seller, depending on your flow)
   
    // const subject = "someone currently checking your item - Thriftify";
    // const send_to = item.sellerdetails[0].email;  // or item's seller email if you prefer
    // const send_from = process.env.EMAIL_SENDER ;
    // const reply_to = "noreply@thriftify.com";
    // const template = "checkoutalert.";  // a template key if you're using one
    // const name = item.sellerdetails[0].firstname; // or buyer name if applicable
    // const itemname = item.title
    // const cc =process.env.ADMIN_EMAIL

    //  try {
    //    await sendEmail(
    //      subject,
    //      send_to,
    //        send_from,
    //        reply_to,
    //        cc,
    //        template,
    //        name,
    //        null,
    //        null,
    //        null,
    //        null,
    //        itemname,
    //        null,
    //        null,
    //        null,
    //        null,
    //        null,
    //     null
    //    );
       
    //  } catch (emailError) {
    //    console.error("Failed to send checkout alert:", emailError.message);
    //    // Don't block checkout if email fails — just log it.
    //  }

   
    res.status(200).json(item);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred while processing the checkout.' });
  }
});


const createCoupon = async (req, res) => {
  const { code, discountType, discountValue, usageLimit, expiryDate } = req.body;

  if (!code || !discountType || !discountValue || !usageLimit || !expiryDate) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const existingCoupon = await Coupon.findOne({ code });
  if (existingCoupon) {
    return res.status(400).json({ message: "Coupon code already exists." });
  }

  const newCoupon = new Coupon({
    code,
    discountType,
    discountValue,
    usageLimit,
    expiryDate,
  });

  await newCoupon.save();

  res.status(201).json({ message: "Coupon created successfully.", data: newCoupon });
}


const verifyCoupon = async (req, res) => {
  try {
    const userId = req.user.id;
    const { code } = req.query;

   

    if (!userId) {
      return res.status(400).json({ message: "used not available " });
    }

    if (!code) {
      return res.status(400).json({ message: "Coupon code is required" });
    }

    // Trim and normalize the code
    const trimmedCode = code.trim().toUpperCase();

    const coupon = await Coupon.findOne({ code: trimmedCode });
    if (!coupon) {
      return res.status(404).json({ message: "Invalid coupon code" });
    }

    if (!coupon.isActive || coupon.expiryDate < new Date()) {
      return res.status(400).json({ message: "Coupon has expired or is inactive" });
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: "Coupon usage limit reached" });
    }

    // 🔍 Check CouponUsage using both userId and couponCode
    const alreadyUsed = await CouponUsage.findOne({
      userId:userId,
      couponCode: trimmedCode
    });

    if (alreadyUsed) {
      return res.status(400).json({ message: "You have already used this coupon" });
    }

    res.status(200).json({
      message: "Coupon is valid",
      coupon
    });
  } catch (error) {
    console.error("Verify coupon error:", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};


const chat = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const chatrooms = await Chat.find({
      $or: [
        { buyerId: userId },
        { sellerId: userId }
      ]
    }).sort({ updatedAt: -1 });

    res.json(chatrooms);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get chats', error: error.message });
  }
};

const userCoversation = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({ message: 'roomId is required' });
    }

    const chatroom = await Chat.findOne({ roomId });

    if (!chatroom) {
      return res.status(404).json({ message: 'Chat room not found' });
    }

    res.json(chatroom);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get chats', error: error.message });
  }
};



const sendbuyerReminder = async (req, res) => {
  try {
   
    const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000);
    const buyers = await BuyerInterest.find({
      reminderSent: false,
      timestamp: { $lt: fiveHoursAgo }
    });

    if (buyers.length === 0) {
      console.log('No buyer reminders to send at this time.');
      return;
    }
    for (const buyer of buyers){
      const item = await good.findById(buyer.itemId)
      
      const name = buyer.buyerEmail.split("@")[0]
      const itemprice =item.images[0]
      const link = `https://wa.me/2348163446758?text=Hi%20I%20need%20help%20buying%20an%20item` 
      const sellername=`https://thriftiffy.com/Checkoutpage/${item._id}`
      const template = 'buyerreminder.'
      const send_to = buyer.buyerEmail
      const itemname =item.title
      const subject = `Still interested in ${item.title}?`
      const send_from =process.env.EMAIL_SENDER
     const  reply_to = '<no-reply@thrifitffy.com>'
      try {
        await sendEmail(
          subject,
          send_to,
            send_from,
            reply_to,
            null,
            template,
            name,
            link,
            null,
            itemprice,
            sellername,
            itemname,
            null,
            null,
            null,
            null,
            null,
         null
        );
        console.log(`✅ Reminder sent to ${buyer.buyerEmail}`);
      } catch (emailError) {
        console.error("Failed to send checkout alert:", emailError.message);
        // Don't block checkout if email fails — just log it.
      }
      buyer.reminderSent = true;
      await buyer.save();
    }
  
  // Save to DB
    
  } catch (error) {
    console.error("Error collecting buyer interest:", error);
    return res.status(500).json({ message: "Server error collecting buyer interest" });
  }
};



// Run every hour buyer reminder
cron.schedule('0 * * * *', sendbuyerReminder);


// Run at midnight every day
cron.schedule('50 23 * * *', saveDailySignupCount);



// account deletion after 30 days of sign up 


// cron.schedule("0 0 * * *", deleteUnverifiedAccounts);

cron.schedule("0 11 * * *", postRandomTweet);






// cron job for emmail reminder 
// cron.schedule("0 14 * * *", async () => {
//   await sendVerificationReminders();
//   await listingNotification();
//   console.log("📆 Cron jobs executed at 2 PM.");
// });



//cron jobs 

const getSellerStatus = async (req, res) => {
  try {
    const { sellerId } = req.params;

    if (!sellerId) {
      return res.status(400).json({ message: 'sellerId is required' });
    }

    const user = await User.findById( sellerId );

    if (!user) {
      return res.status(404).json({ message: 'seller not found' });
    }

    res.json({
      online: user.online,
      lastSeen: user.lastSeen,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get chats', error: error.message });
  }
};


const initChat = async (req, res) => {
  try {
    const { itemId } = req.body;
    const buyerId = req.user.id;
     const buyerName = req.user.firstname
  
    const item = await Good.findById(itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const sellerDetails = item.sellerdetails?.[0];
    sellerId = sellerDetails?.sellerid;
    sellerName = sellerDetails?.firstname;
  
    const participants = [buyerId, sellerId].sort();
    const roomId = `${itemId}_${participants[0]}_${participants[1]}`;
  
    let chatroom = await Chatroom.findOne({ roomId });
  
    if (!chatroom) {
      chatroom = new Chatroom({
        roomId,
        itemId,
        buyerId,
        sellerId,
        sellerName,
        buyerName,
        messages: [],
        itemTitle: item.title,
        itemImageUrl: item.images?.[0],
      });
      await chatroom.save();
    }
  
    res.json({ roomId, chatroom });
  } catch (error) {
    res.status(500).json({ message: 'Failed to get chats', error: error.message });
  }
};




const spin = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.spinPoint < 20) {
      return res.status(400).json({
        message: 'Complete a sale to earn 100 points. You need at least 20 points to spin.',
      });
    }

    const today = new Date().toISOString().split('T')[0];
    if (user.lastSpinDate === today) {
      return res.status(400).json({
        message: 'Already spun today',
        prize: user.spinPrize,
      });
    }

    // Weighted prize options
    const prizeOptions = [
      { prize: '₦0', weight: 40 },
      { prize: '₦500 Off', weight: 20 },
      { prize: '₦1,000 Off', weight: 15 },
      { prize: '₦2,000 Off', weight: 10 },
      { prize: '₦1,000 Airtime', weight: 1 }, // Very low chance
    ];

    const getWeightedPrize = (options) => {
      const totalWeight = options.reduce((sum, p) => sum + p.weight, 0);
      let random = Math.random() * totalWeight;

      for (let option of options) {
        if (random < option.weight) return option.prize;
        random -= option.weight;
      }

      return '₦0'; // fallback
    };

    const prize = getWeightedPrize(prizeOptions);

    let couponCode = null;

    // Only create coupon if prize is a discount (not ₦0 or Airtime)
    if (prize.includes('₦') && prize !== '₦0' && prize !== '₦1,000 Airtime') {
      const amount = parseInt(prize.replace(/[^\d]/g, ''), 10);
      const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4-digit code
      couponCode = `SPINWIN${randomNumber}`;

      await Coupon.create({
        userId,
        code: couponCode,
        discountValue: amount,
        discountType: 'fixed',
        isActive: true,
        expiryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
        usageLimit: 1,
      });
    }

    // Update user record
    user.lastSpinDate = today;
    user.spinPrize = prize;
    user.spinPoint -= 20;
    await user.save();

    return res.status(200).json({ prize, couponCode });
  } catch (error) {
    console.error('Spin error:', error);
    return res.status(500).json({
      message: 'Something went wrong, please try again later.',
    });
  }
};





// GET /api/users/check-spin
const checkSpinStatus = async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId);

  const today = new Date().toISOString().split('T')[0];

  const alreadySpun = user.lastSpinDate === today;
 
  return res.status(200).json({ alreadySpun });
};


 // import your model

const createDeliveryFee = async (req, res) => {
  try {
    const sellerId = req.user._id; // or from req.body if not auth
    const { fees } = req.body; // expect fees as an object, e.g. { Lagos: 500, Abuja: 700 }

    if (!fees || typeof fees !== 'object' || Object.keys(fees).length === 0) {
      return res.status(400).json({ message: 'Please provide fees object with state-fee pairs' });
    }

    // Check if delivery already exists for this seller
    let delivery = await Delivery.findOne({ sellerId });

    if (delivery) {
      // Update fees map with new states/fees, merging existing ones
      for (const [state, fee] of Object.entries(fees)) {
        delivery.fees.set(state, fee);
      }
      await delivery.save();
    } else {
      // Create new delivery document
      delivery = new Delivery({
        sellerId,
        fees
      });
      await delivery.save();
    }

    return res.status(200).json({ message: 'Delivery fees saved successfully', delivery });
  } catch (error) {
    console.error('CreateDelivery error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const getDeliveryFee = async (req, res) => {
  try {
    const { sellerId } = req.params;

    const delivery = await Delivery.findOne({ sellerId });

    if (!delivery) {
      return res.status(404).json({ message: "Delivery fee not found" });
    }

    return res.status(200).json(delivery);
  } catch (error) {
    console.error("Error in getDeliveryFee:", error);
    return res.status(500).json({ message: "Server error" });
  }
};






const imgKitAuth = (req, res) => {
  try {
    const token = uuidv4();
    const expire = Math.floor(Date.now() / 1000) + 2400; // Expires in 40 minutes
    const privateAPIKey = process.env.privateAPIKey;

    const signature = crypto
      .createHmac('sha1', privateAPIKey)
      .update(token + expire)
      .digest('hex');

    return res.status(200).json({
      token,
      expire,
      signature
    });
  } catch (error) {
    console.error("ImageKit auth error:", error);
    return res.status(500).json({ message: "Server error generating ImageKit auth" });
  }
};


const collectBuyerInterestInfo = async (req, res) => {
  try {
    const { buyerEmail, itemId } = req.body;

    // Simple validation
    if (!buyerEmail || !itemId) {
      return res.status(400).json({ message: "buyerEmail and itemId are required" });
    }

    // Optional: Check if already exists
    const existing = await BuyerInterest.findOne({ buyerEmail, itemId });
    if (existing) {
      return res.status(200).json({ message: "Interest already collected" });
    }

    // Save to DB
    const interest = new BuyerInterest({
      buyerEmail: buyerEmail,
      itemId,
    });

    await interest.save();

    return res.status(201).json({ message: "Interest collected successfully" });
  } catch (error) {
    console.error("Error collecting buyer interest:", error);
    return res.status(500).json({ message: "Server error collecting buyer interest" });
  }
};


 

const getSellerProfile = asyncHandler(async (req, res) => {

  const {sellerId} = req.params
  try {
  
    if (!sellerId ){
     
      res.status(400).json({ message: 'sellerId is required'});
      return;
    }
    const user = await User.findById(sellerId).select('-password');


    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    const {
      id,
      email,
      photo,
      role,
      isVerified,
      idVerified,
      phone,
      lastname,
      location,
      firstname,
      dob,
      about,
      totalPurchasedAmount,
      totalSoldAmount,
      pendingSoldAmount,
      pendingWithdrawalAmount,
      totalWithdrawalAmount,
      pendingPurchasedAmount,
      userAgent,
      verificationRequested,
      contactType,
      username,
      online,
      lastSeen,
      successfullDelivery
    } = user;

    const passphrase = process.env.CRYPTO_JS
    const encryptedEmail = email === null?'': CryptoJS.AES.encrypt(email.toString(), passphrase).toString()
    const encryptedPhone = phone === null ? '':CryptoJS.AES.encrypt(phone.toString(), passphrase).toString()
    const encryptedDob = dob ===null ? '' :CryptoJS.AES.encrypt(dob.toString(), passphrase).toString()


    
    
    res.status(200).json({
      id,
      firstname,
      lastname,
      username,
      location,
      email:encryptedEmail,
      photo,
      role,
      isVerified,
      idVerified,
      phone:encryptedPhone,
      dob:encryptedDob,
      about,
      totalPurchasedAmount,
      totalSoldAmount,
      pendingSoldAmount,
      pendingWithdrawalAmount,
      totalWithdrawalAmount,
      pendingPurchasedAmount,
      userAgent,
      verificationRequested,
      contactType,
      online,
      lastSeen,
      successfullDelivery
    });
    console.log("User response sent successfully");
  } catch (error) {
    console.error("Error in getUser:", error);
    res.status(500).json({ message: error.message });
  }
});



const createStore = async (req, res) => {
  try {
    const existingStore = await StoreSetting.findOne({ userId: req.user._id });
    if (existingStore) {
      return res.status(400).json({ message: "Store already exists." });
    }

    const newStore = await StoreSetting.create({
      userId: req.user._id,
      welcomeMessage: req.body.welcomeMessage || "Welcome to my store!",
      theme: req.body.theme || "white-black",
      storeLogo: req.body.storeLogo || "",
      bannerImage: req.body.bannerImage || "",
      bgImage: req.body.bgImage || "",
      businessPhoneNumber: req.body.businessPhoneNumber || "+234",
      businessPolicy: req.body.businessPolicy || "",
      socialLinks: req.body.socialLinks || {
        tiktok: "",
        instagram: "",
        x: "",
        facebook: "",
      },
    });
    res.status(201).json(newStore);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong." });
  
  }
};


const updateStore = async (req, res) => {
  try {
    const store = await StoreSetting.findOneAndUpdate(
      { userId: req.user._id },
      {
        $set: {
          welcomeMessage: req.body.welcomeMessage,
          theme: req.body.theme,
          storeLogo: req.body.storeLogo,
          bannerImage: req.body.bannerImage,
          businessPhoneNumber: req.body.businessPhoneNumber,
          businessPolicy: req.body.businessPolicy,
          socialLinks: req.body.socialLinks,
          bannerImage:req.body.bannerImage,
        bgImage:req.body.bgImage
        },
      },
      { new: true }
    );

    res.status(200).json(store);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating store settings." });
  }
};

const getStore = async (req, res) => {
  const { userId } = req.params;

  try {
    // Fetch store settings
    const store = await StoreSetting.findOne({ userId: userId });

    // Fetch user to check subscription status (assuming User model)
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // If user is not subscribed, remove bgImage, navbar, theme
    if (!user.isSubscribed) {
      if (store) {
        // Remove or set these fields to null/undefined/empty string
        store.bgImage = null;
        store.bannerImage = null;
        store.theme = null;
      }
    }

    res.status(200).json(store);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching store settings." });
  }
};












const FormData = require('form-data');
const fs = require('fs');
const { promises } = require("dns");


// 🔐 ImageKit credential

// 🔐 Cloudflare credentials



const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


const uploadImagesToCloudflare = async () => {
  const allGoods = await Good.find({});

  for (const item of allGoods) {
    const sellerid = item.userId
  let sellecount  = 0
    let selleremail = await User.findById(sellerid)
    sellecount += selleremail.email
    console.log(sellecount)
   
  }

  console.log('✅ All done!');
};




const uploadImage = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedImages = [];

    for (const file of req.files) {
      const formData = new FormData();
      formData.append('file', file.buffer, file.originalname);

      const response = await axios.post(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ID}/images/v1`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
          },
        }
      );

  
      if (response.data.success) {
        uploadedImages.push({
          id: response.data.result.id,
          url: response.data.result.variants[0],
        });
      } else {
        return res.status(400).json({ error: 'Upload failed', details: response.data.errors });
      }
    }

    return res.json({
      message: 'All uploads successful',
      imageUrls: uploadedImages,
    });
  } catch (error) {
    console.error('Upload error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};


const DeletedGoods = require('../model/DeletedGoodsSchema.js');



async function backupAndDeleteGoods() {
  try {
    // Fetch all goods
    const allGoods = await good.find();

    if (allGoods.length === 0) {
      console.log('No goods found to delete.');
      return;
    }

    // Prepare backup documents
    const backupDocs = allGoods.map(good => ({
      originalGoodId: good._id,
      data: good.toObject(),
      deletedAt: new Date(),
    }));

    // Insert all backup docs into DeletedGoods collection
    await DeletedGoods.insertMany(backupDocs);

    // Delete all goods from the original collection
    await good.deleteMany();

    console.log(`Backed up and deleted ${allGoods.length} goods successfully.`);
  } catch (err) {
    console.error('Error during backup and delete:', err);
  }
}


const createSubscription = async (req, res) => {
  try {
    const { plan } = req.body; // 'monthly' or 'yearly'

    if (!plan) {
      return res.status(400).json({ error: 'Plan is required' });
    }

    // Assuming user ID is in req.user.id from your auth middleware
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const amount = plan === 'yearly' ? 2500000 : 250000; // Paystack expects kobo (₦25,000 or ₦2,500)

    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: user.email,
        amount,
        callback_url: 'https://yourdomain.com/payment/callback', // Update this to your actual callback URL
        metadata: { plan },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const { authorization_url } = paystackResponse.data.data;

    return res.json({ authorization_url });
  } catch (error) {
    console.error('Paystack init error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to initialize subscription' });
  }
};


const confirmSubscription = async (req, res) => {
  const reference = req.params.reference;

  try {
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const data = response.data.data;
    console.log(data);

    if (data.status === 'success') {
      const email = data.customer.email;
      const amount = data.amount;

      const plan = amount === 2500000 ? 'yearly' : 'monthly';
      const expiresAt = plan === 'yearly'
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Update the user in the database
      const user = await User.findOne({ email });
      if (user) {
        user.isSubscribed = true;
        user.subscriptionPlan = plan;
        user.subscriptionExpiresAt = expiresAt;
        user.subscriptionPaidAt = new Date();
        
        await user.save();
      }

      // ✅ Send success response to frontend
      return res.status(200).json({
        success: true,
        message: 'Subscription updated successfully',
        plan,
        expiresAt,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed or payment not successful',
      });
    }
  } catch (error) {
    console.error('Verification error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during payment verification',
      error: error.message,
    });
  }
};









module.exports = {
  createUser,
  getUser,
  loginUser,
  logoutUser,
  updateUser,
  deleteUser,
  getAllUsers,
  loginStatus,
  upgradeUser,
  sendAutoEmail,
  sendVerifyEmail,
  verifyUser,
  forgotPassword,
  resetPassword,
  changePassword,
  sendLoginCode,
  LoginWithCode,
  createGood,
  getAllApprovedgoods,
  getAllgoodsbyUser,
  getAllgoods,
  Updateusergoods,
  Deleteusergoods,
  createreview,
  initialisePayment,
  Paymentverification,
  getallorders,
  UpdatePurchasedItem,
  updateAllUserInfo,
  Trackpurchaseditem,
  ConfirmDelivery,
  Disputedelivery,
  getAllreview,
  requestWithdrawal,
  customerPaid,
  idNotificationEmail,
  idConfirmationEmail,
  idRejectionEmail,
  productsearch,
  productsearchbycategory,
  messageUs,
  tokenGenerator,
  countSignupsPerDayAPI,
  googleLogin,
  checkoutItem,
  verifyCoupon,
  createCoupon,
  chat,
  userCoversation,
  getSellerStatus,
  initChat,
  spin,
  checkSpinStatus,
  createDeliveryFee,
  getDeliveryFee,
  imgKitAuth,
  collectBuyerInterestInfo,
  getSellerProfile,
  createStore,
  updateStore,
  getStore,
  uploadImage,
  confirmSubscription,
  confirmSubscription

};

