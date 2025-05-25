const multer = require("multer"); // Import Multer
const path = require('path');
// const upload = multer({ storage: multer.memoryStorage() });
const storage = multer.memoryStorage();
const uploadmultiple = multer({ storage: storage }).single("images");

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
    fieldSize: 25 * 1024 * 1024, // Limit field size to 25MB
  },
}).array("images", 6); // Limit to 10 images


const mailstorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const mailupload = multer({ storage: mailstorage }).array('multiple', 2);
const singleuplaod =multer({ storage: mailstorage }).single('image');




const {
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
  createCoupon,
  verifyCoupon,
  chat,
  userCoversation,
  getSellerStatus,
  initChat

} = require("../controllers/controller");

const {ninVerification} = require('../controllers/Ninverification.js')




const {sendPurchasedemailtoseller,sendPurchasedemailtobuyer} = require('../controllers/Emailcontroller.js')



const express = require("express");
const router = express.Router();
const {
  protect,
  adminOnly,
  author,
  
} = require("../middlerware/authmiddleware.js");

// create user
router.post("/api/users/register", createUser);
//login user
router.post("/api/users/login", loginUser);

//log out user
router.get("/api/users/logout", logoutUser);
//getUser
router.get("/api/users/getuser",protect, getUser);
//update user
router.patch("/api/users/updateuser", protect, updateUser);

//update alluserinfo
router.patch("/api/users/updatealluserinfo",protect,adminOnly, updateAllUserInfo);
//delete user
router.delete("/api/users/deleteuser/:id", protect, deleteUser);

// getallusers
router.get("/api/users/getallusers", protect, adminOnly, getAllUsers);

// login status
router.get("/api/users/loginstatus",protect, loginStatus);

//upgrade user
router.post("/api/users/upgradeuser", protect, adminOnly, upgradeUser);
//send automated email
router.post("/api/users/sendautoemail", protect, sendAutoEmail);

//send verifcation email
router.post("/api/users/sendverificationemail", protect, sendVerifyEmail);
//send verify user

router.patch("/api/users/verifyuser/:verificationToken", verifyUser);

// forgot password email send
router.post("/api/users/forgotpassword", forgotPassword);
// reset password
router.patch("/api/users/resetpassword/:resetToken", resetPassword);
//change password
router.patch("/api/users/changepassword", protect, changePassword);

//change password
router.post("/api/users/sendlogincode/:email", sendLoginCode);

//login with code
router.post("/api/users/loginwithcode/:email", LoginWithCode);

router.post("/api/users/creategood", protect, upload, createGood);
// create goods

// All aproved goods
router.get(
  "/api/users/getallaprrovedgoods",
  protect,
  adminOnly,
  getAllApprovedgoods
);

//get allgoodbyuser
router.get("/api/users/getallgoodsbyuser", protect, getAllgoodsbyUser);


//get all goods
router.get("/api/users/getallgoods", getAllgoods);

//update users goods
router.patch(
  "/api/users/updateusersgoods/:id",
  protect,
  upload,
  Updateusergoods
);

//delete users goods
router.delete("/api/users/deleteusergoods/:id", protect, Deleteusergoods);

// create review

router.post("/api/users/createreview/:sellerId/:itemId", protect, createreview);


router.get("/api/users/getallreview", getAllreview);

router.get("/api/users/checkoutitem/:itemId", checkoutItem);

//get user review


//----------Payment route //-----------------------

// payment initilaisation

router.post(
  "/api/users/inititalisePayment",
  protect,
  upload,
  initialisePayment
);

// payment verification
router.get(
  "/api/users/paymentverification",
  
  protect,Paymentverification
);

//-------------------ChattRoute-------------------------------------------------//




// orders update and checks 

// get all orders
router.get("/api/users/getallordersforbuyer", protect, getallorders);

//updated purchased item
router.post("/api/users/updatepurchaseditem/:itemid", singleuplaod , UpdatePurchasedItem);

//confirm delivery


router.patch("/api/users/confirmdelivery/:itemid", ConfirmDelivery);

// trackpurhacsed item 


//dispute delivery
router.patch("/api/users/Disputedelivery/:itemid", Disputedelivery);

router.get("/api/users/Trackpurchaseditem/:itemid", Trackpurchaseditem);

//update all userinfor


router.patch("/api/users/updatealluserinfo",protect, updateAllUserInfo);

router.post("/api/users/requestwithdrawal",protect, requestWithdrawal);

router.post("/api/users/customerpaid/:id",protect,adminOnly, customerPaid);

router.post("/api/users/idnotificationemail",protect, mailupload,  idNotificationEmail);

router.post("/api/users/idconfirmationemail",protect,adminOnly, idConfirmationEmail);

router.post("/api/users/idrejectionemail",protect,adminOnly, idRejectionEmail);

router.get("/api/users/product/search", productsearch);
router.get("/api/users/product/searchbygender", productsearchbycategory);

router.post("/api/users/messageus", messageUs);

router.post("/api/users/tokengenerator", tokenGenerator);

router.get("/api/users/dailysignupcount",protect,adminOnly, countSignupsPerDayAPI);

router.post("/api/users/googlelogin", googleLogin);

router.post("/api/users/createcoupon", createCoupon);
router.get("/api/users/verifycoupon", verifyCoupon);
router.get("/api/users/chat/:userId", protect,chat);
router.get("/api/users/userconversation/:roomId",protect, userCoversation);
router.get("/api/users/getsellerstatus/:sellerId", getSellerStatus);
router.post("/api/users/initchat", protect, initChat);







module.exports = router;