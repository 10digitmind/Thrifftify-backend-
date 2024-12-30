
const User = require("../model/Usermodel");
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");

const goods =require('../model/Goodmodel')

const protect = asyncHandler(async (req, res, next) => {
  try {
    // Extract token from the `Authorization` header instead of cookies
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "Not authorized, please log in" });
    }

    // Verify the token
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user details from the database
    const user = await User.findById(verified.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "suspended") {
      return res.status(403).json({ message: "User suspended, contact support" });
    }

    // Attach user to the request object
    req.user = user;
    next();
  } catch (error) {
    console.error("Authorization error:", error);
    return res.status(401).json({ message: "Not authorized, invalid token" });
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
