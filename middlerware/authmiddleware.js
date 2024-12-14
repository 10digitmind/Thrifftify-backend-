
const User = require("../model/Usermodel");
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");

const goods =require('../model/Goodmodel')

const protect = asyncHandler(async (req, res, next) => {

  try {
    const token = req.cookies.token;

    if (!token) {
      res.status(401);
      throw new Error("not authorized,pls login");
    }
    //verify token
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log(verified); //get userid from token
    const user = await User.findById(verified.id).select("-password");

    if (!user) {
      res.status(404);
      throw new Error("user not found");
    }
    if (user.role === "suspended") {
      res.status(400);
      throw new Error("user suspend contact suport");
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401);
    res.status(401).send({ error: error.message });
  }
});

//admin middleware to delete user
const adminOnly = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(400);
    throw new Error("you're not authorise");
  }
});

//author middle ware
const author = asyncHandler(async (req, res, next) => {
  if (req.user.role === "author" || req.user.role === "admin") {
    next();
  } else {
    res.status(400);
    throw new Error("you're not authorise");
  }
  
});





const verifiedOnly = asyncHandler(async (req, res, next) => {
  if (req.user && req.user.isVerified) {
    next();
  } else {
    res.status(400);
    throw new Error("Account not verifeid");
  }
});

module.exports = {
  protect,
  adminOnly,
  verifiedOnly,
  author,

  
 
};
