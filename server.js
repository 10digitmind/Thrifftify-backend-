const express = require("express");
const dotenv = require("dotenv").config();
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middlerware/errormiddleware/errormiddleware.js");
const path = require("path");
const { engine } = require("express-handlebars");
const cors = require("cors");
const groute = require("./route/Groutes.js");
const socketHandler = require('../backend/sockets/socketHandler.js'); // ⬅️ new file

const http = require('http');
const { Server } = require('socket.io');


const app = express();

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
      origin: "http://localhost:3000", // In production, replace with your domain
      methods: ["GET", "POST"],
      credentials: true,
    }
  });



// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// CORS Configuration
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://thrifftify-backend.onrender.com",
      'https://thrifftify-fronend.vercel.app',
      'https://www.thriftiffy.com',
      "http://localhost:3001",
      
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE",'PATCH'],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// View Engine
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

// Default Route
app.get("/", (req, res) => {
  res.send("Welcome to Thrifftify Backend API!");
});


// Routes
app.use(groute);

// Error Handler
app.use(errorHandler);




// 404 Middleware
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});

// socket.io


// MongoDB Connection and Server Start
const PORT = process.env.PORT || 3500;

mongoose
  .connect(process.env.MONGO_URL) 
  .then(() => {
  
    server.listen(PORT, () => {
      console.log(`HTTPS server running on https://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log(error);
    console.error("Database connection error:", error.message);
  });
  
  socketHandler(io);