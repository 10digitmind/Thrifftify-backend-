const jwt = require("jsonwebtoken");
const User = require("../../model/Usermodel");

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
 

    if (!token) {
      return next(new Error("Not authorized, no token"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return next(new Error("User not found"));
    }

    if (user.role === "suspended") {
      return next(new Error("User suspended"));
    }

    socket.user = user;
    next();
  } catch (error) {
    console.error("Socket auth error:", error);
    next(new Error("Not authorized, invalid token"));
  }
};

module.exports = socketAuth;
