const User = require("../model/Usermodel.js");
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
const Review = require("../model/Reviews.js");
const crypto = require("crypto");
const cloudinary = require("../utills/cloudinary.js");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const Cryptr = require("cryptr");
const cryptr = new Cryptr(process.env.CRYPR_KEY);

const {
  initializePayment,
  verifyPayment,
} = require("../controllers/Payment.js");
const axios = require("axios");
const Order = require("../model/Ordersmodel.js");
const good = require("../model/Goodmodel.js");
const { errorMonitor } = require("events");
const { title } = require("process");

//-------------utilities functions
// genrate toeken function
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });
};

//hash token  function
const hashToken = (token) => {
  return crypto.createHash("sha256").update(token.toString()).digest("hex");
};

//------------------------------------------------------------------- utilities end here

//------ creating api for user
// create user
const createUser = asyncHandler(async (req, res) => {
  const { firstname, lastname, password, email, location, dob } = req.body;
  //validation

  if (!firstname || !lastname || !email || !password || !location || !dob) {
    res.status(400).json("Please fill in the require field");
  }
  if (password.length < 6) {
    res.status(400).json("Password must be at least six characters long");
  }

  // check if user exist

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    return res.status(404).json("Email already registered please log in");
  }

  // get useraget
  const ua = parser(req.headers["user-agent"]);

  const userAgent = [ua.ua];
  //create new user
  const user = await User.create({
    firstname,
    lastname,
    location,
    email,
    password,
    dob,
    userAgent,
  });

  // Generate token
  const token = generateToken(user._id);

  // HTTP-ONLY COOKIE
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400), //1 day
    sameSite: "none",
    secure: true,
  });

  if (user) {
    const {
      id,
      lastname,
      firstname,
      location,
      email,
      password,
      photo,
      role,
      isVerified,
      phone,
      
    } = user;

    res.status(201).json({
      id,
      lastname,
      firstname,
      location,
      email,
      photo,
      role,
      isVerified,
      token,
      phone,
      dob,
    });
  } else {
    res.status(400);
    throw new Error("invalid user data");
  }
});

//login user
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  //validation
  if (!email || !password) {
    return res.status(404).json("please Input email or password");
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(400);
    return res.status(404).json("incorrect username or password ");
  }

  const correctPassword = await bcrypt.compare(password, user.password);

  if (user.role === "suspended" && !correctPassword) {
    return res.status(404).json("You've been suspended contact admin ");
  }

  if (!correctPassword) {
    res.status(400);
    return res
      .status(404)
      .json("Incorrect email or password please click forget password");
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
  // generate token

  const token = generateToken(user._id);
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(Date.now() + 1000 * 86400), // 1 day
    sameSite: "none",
    secure: true,
  });

  // Send user data along with token
  const { id, lastname, firstname, location, photo, role, isVerified, phone } =
    user;
  res.status(200).json({
    id,
    firstname,
    lastname,
    location,
    email,
    photo,
    role,
    isVerified,
    phone,
  });
 


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
  const send_from = process.env.EMAIL_USER;
  const reply_to = "noreply@thritify.com";
  const template = 'loginwithcode.';
  const name = user.firstname;
  const link = `http://localhost:3000/Loginwithcode/${email}`;

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
      decryptedLoginCode

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

    const { id, name, email, password, photo, role, isVerified } = user;

    res.status(201).json({
      id,
      name,
      email,
      password,
      photo,
      role,
      isVerified,
      token,
    });
  }
});

//send verification email

const sendVerifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(400);
    throw new Error("user  not found, please sign up");
  }

  if (user.isVerified) {
    res.status(400);
    throw new Error("user  already verified");
  }

  //delete token if it's in db
  let token = await Token.findOne({ userID: user._id });

  if (token) {
    await token.deleteOne();
  }

  //create verification token and save

  const verificationToken = crypto.randomBytes(32).toString("hex") + user._id;


  // Has token and save

  const hashedtoken = hashToken(verificationToken);



  await new Token({
    userId: user._id,
    verificationToken: hashedtoken,
    createdAt: Date.now(),
    expiresAt: Date.now() + 60 * (60 * 1000),
  }).save();

  res.send("token saved");

  //construct verification url
  const verificationUrl = `${process.env.FRONTEND_USER}/verify/${verificationToken}`;

  // set email to send to user

  const subject = "verify your account - Thritify";
  const send_to = user.email;
  const send_from = process.env.EMAIL_USER;
  const reply_to = "noreply@thritify.com";
  const template = "verifyemail.";
  const name = user.name;
  const link = verificationUrl;

  //send email

  try {
    await sendEmail(
      subject,
      send_to,
      send_from,
      reply_to,
      null,
      template,
      name,
      link
    );

    res.status(200).json({ message: "verification email sent " });
  } catch (error) {
    res.status(500).json({ message: "email not sent try again " });
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
  console.log(user);

  if (user.isVerified) {
    res.status(400);
    throw new Error("user already verify ");
  }

  user.isVerified = true;
  await user.save();

  res
    .status(200)
    .json({ message: "Account verification sucessfull, please login;  " });
});

//logout user
const logoutUser = asyncHandler(async (req, res) => {
  const token = req.cookies.token;
  res.cookie("token", token, {
    path: "/",
    httpOnly: true,
    expires: new Date(0),
    sameSite: "none",
    secure: true,
  });
  return res.status(200).json({ message: "Logout successfull" });
});

//getUser
const getUser = asyncHandler(async (req, res) => {
  try {
  
    if (!req.user || !req.user._id) {
      console.error("req.user._id is undefined");
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
    } = user;

    res.status(200).json({
      id,
      firstname,
      lastname,
      location,
      email,
      photo,
      role,
      isVerified,
      idVerified,
      phone,
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

  if (user) {
    const {
      phone,
      firstname,
      lastname,
      location,
      email,
      password,
      photo,
      role,
      isVerified,
      about,
    } = user;

    user.firstname = req.body.firstname || firstname;
    user.lastname = req.body.lastname || lastname;
    user.location = req.body.location || location;
    user.photo = req.body.photo || photo;
    user.phone = req.body.phone || phone;
    user.role = req.body.role || phone;
    user.about = req.body.about || about;
    user.email = email;

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
    });
  } else {
    res.status(400);
    throw new Error("User not found");
  }
});

//delete user

const deleteUser = asyncHandler(async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Delete all goods associated with the user
    await Good.deleteMany({ userId });

    // Delete the user
    await User.findByIdAndDelete(userId);

    // Respond to the client
    res
      .status(200)
      .json({ message: "User and their goods deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "An error occurred while deleting user and their goods",
    });
  }
});

// getallusers
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort("-createdAt").select("-password");

  if (!users) {
    res.status(500).json({ message: "somethig went reson " });
  }
  res.status(200).json(users);
});

// login status
const loginStatus = asyncHandler(async (req, res) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json(false);
  }
  const verified = jwt.verify(token, process.env.JWT_SECRET);
  if (verified) {
    return res.json(true);
  }
  return res.json(false);
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
  const send_from = process.env.EMAIL_USER;
  const name = user.name;
  const link = `${process.env.FRONTEND_URL}${url}`;

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
  const send_from = process.env.EMAIL_USER;
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
  const { password, newpassword, cpassword } = req.body;

  const user = await User.findById(req.user._id);

  if (!user) {
    res.status(400);
    throw new Error("user not found ");
  }

  if (!password || !newpassword) {
    res.status(404).json("Enter old and new password  ");
  }

  if (newpassword !== cpassword) {
    res.status(404).json("let your confirm password matches with new password");
  }

  if (password === newpassword) {
    res.status(404).json("Enter diffrent password from your current one ");
  }
  // check if old passwor is correct

  const passwordIsCorrect = await bcrypt.compare(password, user.password);

  //save new passoword

  if (user && passwordIsCorrect) {
    user.password = newpassword;
    await user.save();
    res
      .status(200)
      .json({ message: "password changed successfully please login " });
  } else {
    res.status(400);

    throw new Error("old password incorrect");
  }
});

//------------------------------------------//
// create goods

const createGood = asyncHandler(async (req, res) => {
  const {
    title,
    itemDescription,
    category,
    price,
    brand,
    condition,
    size,
    colour,
    producttype,
    deliveryfeetoibadan,
    deliveryfeetolagos,
    images,
  } = req.body;

  try {
    const user = await User.findById(req.user._id);

    if (!user) {
     
      res.status(401).json({ message: "Please log in to be able to sell." });
      return;
    }
    const sellerDetails = {
      // Assuming you have fields like name, email, etc.
      firstname: user.firstname,
      lastname: user.lastname,
      location: user.location,
      email: user.email,
      about: user.about,
      sellerid: user._id,
      sucessfulldelivery: user.successfullDelivery,

      // Add other fields as necessary
    };

    // const imageUrls = uploadResults.map(uploadRes => uploadRes.secure_url);

    const good = await Good.create({
      images, // Ensure only URLs are stored
      title,
      itemDescription,
      category,
      price,
      brand,
      condition,
      size,
      colour,
      producttype,
      userId: user._id,
      location: user.location.toString(),
      deliveryfeetoibadan,
      deliveryfeetolagos,
      sellerdetails: sellerDetails,
    });
    const usergoods = await Good.find({ userId: user._id }).select(
      "-allusergoods"
    );
    if (!usergoods || usergoods.length === 0) {

    }

    good.allusergoods = usergoods;

    await good.save();

    if (good) {
  
      res.status(201).json({ good });

   
    } else {
    
      res.status(500).json({ message: "Failed to create good." });
    }
  } catch (error) {
    console.error("Error occurred:", error);
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
console.log('this is goods:',goods)
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
  const userItem = await Good.findOne({ userId: user, _id: itemId });

  if (!userItem) {
    return res
      .status(404)
      .json({ message: "item not found , or incorrect item id " });
  }
  if (userItem) {
    const {
      title,
      itemDescription,
      category,
      price,
      brand,
      condition,
      size,
      colour,
      producttype,
      images,
      deliveryfeetoibadan,
      deliveryfeetolagos,
      sellerdetails,
      allusergoods,
    } = userItem;

    userItem.title = req.body.title || title;
    userItem.itemDescription = req.body.itemDescription || itemDescription;
    userItem.category = req.body.category || category;
    userItem.price = req.body.price || price;
    userItem.brand = req.body.brand || brand;
    userItem.condition = req.body.condition || condition;
    userItem.size = req.body.size || size;
    userItem.colour = req.body.colour || colour;
    userItem.producttype = req.body.producttype || producttype;
    userItem.images = req.body.images || images;
    userItem.deliveryfeetoibadan =
      req.body.deliveryfeetoibadan || deliveryfeetoibadan;
    userItem.deliveryfeetolagos =
      req.body.deliveryfeetolagos || deliveryfeetolagos;
    userItem.sellerdetails = req.body.sellerdetails || sellerdetails;
    userItem.allusergoods = req.body.sellerdetails || allusergoods;

    const updateditem = await userItem.save();

    res.status(200).json({
      title: updateditem.title,
      itemDescription: updateditem.itemDescription,
      category: updateditem.category,
      brand: updateditem.brand,
      condition: updateditem.condition,
      size: updateditem.size,
      colour: updateditem.colour,
      producttype: updateditem.producttype,
      images: updateditem.images,
      price: updateditem.price,
      deliveryfeetolagos: updateditem.deliveryfeetolagos,
      deliveryfeetoibadan: updateditem.deliveryfeetoibadan,
      allusergoods: updateditem.allusergoods,
      sellerdetails: updateditem.sellerdetails,
    });
  } else {
    res.status(400);
    throw new Error("unable to save goods");
  }
});

//delete usersitem

const Deleteusergoods = asyncHandler(async (req, res) => {
  const itemId = req.params.id;

  const user = await User.findById(req.user._id);
  const userItem = await Good.findOneAndDelete({ userId: user, _id: itemId });

  if (!userItem) {
    res.status(400).json({ message: "item not found or its already deleted" });
  } else {
    res.status(200).json({ message: "item deleted successfully" });
  }
});

//getAllgoodslessdown5000
const getAllgoodslessdown5k = asyncHandler(async (req, res) => {
  const goodsunderorequalto5k = await Good.find({ price: { $lte: 5000 } });

  if (!goodsunderorequalto5k || goodsunderorequalto5k === 0) {
    return res.status(404).json({ message: "No item under 5k" });
  }

  res.status(200).json(goodsunderorequalto5k);
});

//getAllgoodslessdown10000
const getAllgoodslessdown10k = asyncHandler(async (req, res) => {
  const goodsunderorequalto10k = await Good.find({ price: { $lte: 10000 } });

  if (!goodsunderorequalto10k || goodsunderorequalto10k === 0) {
    return res.status(404).json({ message: "No item under 10k" });
  }

  res.status(200).json(goodsunderorequalto10k);
});

//initialis playment  women
const initialisePayment = asyncHandler(async (req, res) => {
  const { email, amount, metadata } = req.body;
  const formData = new FormData();
  formData.append("email", email);
  formData.append("amount", amount * 100);
  formData.append("metadata", JSON.stringify(metadata));

  // Amount in kobo
  const response = await initializePayment(formData, {
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SCERET_KEY}`,
      "Content-Type": `multipart/form-data; boundary=${formData._boundary}`,
    },
  });
  res.status(200).json(response);
});

//verify  playment
const Paymentverification = asyncHandler(async (req, res) => {
  const { reference, trxref } = req.query;

  if (!reference) {
    return res.status(400).send("Reference is required");
  }

  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SCERET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { status, data } = response.data;

    if (status && data.status === "abandoned") {
      return res.status(404).json({
        message:
          "Trasaction has been abandoned go back to payment page to complete payment",
        data,
      });
    }

    if (status && data.status === "success") {
      const metadata = JSON.parse(data.metadata);
      const itemId = metadata.itemId;
      const buyerId = metadata.buyerId;
      const sellerId = metadata.sellerid;
      const amount = data.amount / 100;


      const item = await Good.findById(itemId);
      const order = await Order.findById(buyerId)      
      if (item) {
        item.purchased = true;
        await item.save();
        //order items
        const buyerdetails = await User.findById(buyerId);

        console.log('this is buyer details:',buyerdetails)
        if (!buyerdetails) {
          return res.status(400).json("cant find buyer");
        } else {
          buyerdetails.pendingPurchasedAmount += amount;

          await buyerdetails.save();
        }

        // find seller details and update pending amount
        const sellerdetails = await User.findById(sellerId);
        console.log('this is seller details:',sellerdetails)
        if (!sellerdetails) {
          return res.status(400).json("cant find seller");
        } else {
          sellerdetails.pendingSoldAmount += amount;
          await sellerdetails.save();
        }

        //save order

        const newOrder = new Order({
          buyer: buyerId,
          orderitems: item, // Assign array of order items
          purchased: true, // Assuming purchased is true when creating the order
        });
  // Save the order
  await newOrder.save();
        
      

        // Extract metadata information
        const template = "buyerpurchased.";
        const reply_to = "noreply@thritify.com";
        const send_from = process.env.EMAIL_USER;
        const subject = "Item succesfully purchased";
        const send_to = metadata.buyerEmail;
        const sellername = metadata.sellerName;
        const buyername = metadata.buyerName;
        const itemname = metadata.itemName;
        const itemprice = metadata.itemPrice;
        const buyeraddress = metadata.buyerAddress;
        const cc = "purchased@thriftiffy.com";

        // Email to Buyer
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
          sellername
        );

        // Extract metadata information for seller
        const sellerTemplate = "sellerpurchased.";
        const sellerSubject = "Your item has been purchased";
        const sellerEmail = metadata.sellerEmail;
        const phonenumber = metadata.phoneNumber;
        const deliveryformurl = `http://localhost:3000/deliveryform/${newOrder._id}/${itemname}`;
        const selercc = "purchased@thriftiffy.com";

        // Email to Seller
        await sendEmail(
          sellerSubject,
          sellerEmail,
          send_from,
          reply_to,
          selercc,
          sellerTemplate,
          null,
          null,
          buyername,
          itemprice,
          sellername,
          itemname,
          buyeraddress,
          phonenumber,
          deliveryformurl
        );

        return res.status(200).json({
          message: "Payment verified successfully and item updated",
          data,
        });
      } else {
        res.status(404).json({ message: "Item not found" });
      }
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ error: error.message });
  }
});

// get orders for buyers

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
    const sent_from = process.env.EMAIL_USER;
    const reply_to = "noreply@thritify.com";
    const itemname = itemdetails;
    const file = req.file;
    const cc = "dispatched@thriftiffy.com";
    const link = `http://localhost:3000/confirmdelivery/${itemid}/${purchasedgoods.title}`;

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
      file
    );

    return res.status(200).json({
      message:
        "item dispatched status updated to true and buyer has been notified",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const updatealluserinfo = asyncHandler(async (req, res) => {
  try {
    const result = await User.updateMany(
      {
        /* You can add conditions here if needed */
      },
      {
        $set: {
          verificationRequested:false
        },
      }
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error updating users with new fields:", error);
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

    await Getsellerinfo.save();

    const buyerid = Purchaseditem.buyer;

    const Getbuyerinfo = await User.findById(buyerid);

    if (!Getbuyerinfo) {
      return res.status(404).json("buyer not found");
    } else {
      Getbuyerinfo.totalPurchasedAmount += Getbuyerinfo.pendingPurchasedAmount;
      Getbuyerinfo.pendingPurchasedAmount = 0;

      await Getbuyerinfo.save();
    }

    // Create a review
    const review = new Review({
      userId: sellerid,
      rating: 5, // Default rating
      name: "Thriftify", // Assuming 'name' field in User schema
      comment: "Auto-feedback: Sale completed successfully.", // Default comment
    });

    await review.save();
    // Send email notification
    const template = "confirmdelivery.";
    const send_to = selleremail;
    const subject = `Your item ${Purchaseditem.orderitems[0].title} has been delivered`;
    const name = sellerDetails.firstname;
    const itemprice = Purchaseditem.orderitems[0].price;

    const sent_from = process.env.EMAIL_USER;
    const reply_to = "noreply@thritify.com";
    const cc = "dispatched@thriftiffy.com";
    const link = `http://localhost:3000`;

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
      null
    );

    //send buyer to write review email

    const buyerreviewtemplate = "ReviewforBuyer.";
    const send_tobuyer = Getbuyerinfo.email;
    const subjecttobuyer = `write review for the item  ${Purchaseditem.orderitems[0].title} thta has been confrimed delivered`;
    const namebuyer = Getbuyerinfo.firstname;

    const reviewlink = `http://localhost:3000/review/${sellerid}/${Purchaseditem.orderitems[0]._id}`;

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
    const sent_from = process.env.EMAIL_USER;
    const reply_to = "noreply@thritify.com";
    const cc = "dispatched@thriftiffy.com";
    const link = `http://localhost:3000`;

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
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

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
  const sentFrom = process.env.EMAIL_USER;
  const replyTo = "noreply@thriftify.com";
  const cc = "dispatched@thriftify.com";
  const amount = requestedAmount;

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
    amount
  );

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
  const sentFrom = process.env.EMAIL_USER;
  const replyTo = "noreply@thriftify.com";
  const cc = "dispatched@thriftify.com";
  const amount = amountPaid; // Corrected variable name

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
    amount
  );

  // Send response
  res.status(200).json({
    message:
      "Your withdrawal request has been processed. You will receive your payment shortly.",
  });
});



const idNotificationEmail = asyncHandler(async (req, res) => {
  const { ninNumber, dateOfBirth, email } = req.body;

  // Validate required fields
  if (!ninNumber || ninNumber.length < 11 || !dateOfBirth || !email) {
    return res.status(400).json({ message: 'Please fill in all the required details.' });
  }

  try {
    // Retrieve the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if the user has already requested ID verification
    if (user.verificationRequested) {
      return res.status(400).json({ message: 'You have already requested ID verification.' });
    }

    // Update user's NIN details and mark verification as requested
    user.ninDetails = user.ninDetails || []; // Ensure ninDetails array exists
    user.ninDetails.push({ ninNumber });
    user.verificationRequested = true; // Mark the verification as requested
    await user.save();

    // Prepare email details
    const name = `${user.firstname} ${user.lastname}`;
    const sentFrom = process.env.EMAIL_USER;
    const replyTo = "noreply@thriftify.com";
    const cc = "dispatched@thriftify.com";
    const customerEmail = user.email;
    const customerTemplate = 'idverification.';
    const subject = 'ID Verification Request';
    const adminTemplate = 'adminidverificationemail.';
    const file = req.file;  // Assuming req.file contains the uploaded file
    const adminEmail = 'olubodekehinde2019@outlook.com';

    // Notify customer
    await idVerificationEmail(
      subject,
      customerEmail,
      sentFrom,
      replyTo,
      cc,
      customerTemplate,
      name,
      ninNumber,
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
      adminTemplate,
      name,
      ninNumber,
      dateOfBirth,
      null,
      file
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
      return res.status(404).json({ message: 'User not found.' });
    }

    // Check if the user has already requested ID verification
    if (user.idVerified) {
      return res.status(400).json({ message: 'user already verify.' });
    }
 
    user.idVerified = true; // Mark the verification as requested
    await user.save();

    // Prepare email details
    const name = `${user.firstname} ${user.lastname}`;
    const sentFrom = process.env.EMAIL_USER;
    const replyTo = "noreply@thriftify.com";
    const cc = "dispatched@thriftify.com";
    const customerEmail = user.email;
    const idConfirmationTemplate = 'idconfirmationemail.';
    const subject = 'Congratulations!!';
    const link ='http://localhost:3000/'
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


    user.verificationRequested = false; //Reset verification 
    await user.save();
   

    // Prepare email details
    const name = `${user.firstname} ${user.lastname}`;
    const sentFrom = process.env.EMAIL_USER;
    const replyTo = "noreply@thriftify.com";
    const cc = "dispatched@thriftify.com";
    const customerEmail = user.email;
    const idConfirmationTemplate = 'Idrejectionemail.';
    const subject = 'Verification rejected!!';
 
    const link ='localhost:3000'
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
// const {name,email,phonenumber,message} =req.body
//   try {
//     if(!name || !email || !phonenumber || !message){
//       return res.status(400).json({ error: 'please fill in the required field' });
//     }
//     const sendFrom = process.env.EMAIL_USER
//     const sendTo = 'olubodekehinde2019@gmail.com'
//     const template = 'messageus.'

//     await contactUs(
//       'New Contact Us Message',
//       sendTo,
//       sendFrom,
//       null,
//       null, 
//       template,
//       name,
//       message,
//       phonenumber,
//       email
//     );
    
//     res.status(200).json({ success: 'Message received and email sent successfully!' });
//     console.log('email sent ')

//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
});


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
  updatealluserinfo,
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
  messageUs
};
