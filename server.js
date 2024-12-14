const express = require("express");
const dontenv = require("dotenv").config();
const mongoose = require("mongoose");
const cookieparser = require("cookie-parser");
const errorHandler = require("./middlerware/errormiddleware/errormiddleware.js");
const http = require("http");
const app = express();
const cors = require("cors");
const groute = require("./route/Groutes.js");
const WebSocket = require("ws");
const url = require("url");
const { engine } = require('express-handlebars');
const path = require('path');


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(errorHandler);
app.use(cookieparser());

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

app.use(
  cors({
    allowedHeaders: ["Content-Type", "Authorization"],
    origin: [

      "https://thrifftify-frontend-lu40meyew-10digitminds-projects.vercel.app",
      "http://localhost:3000",
      'https://thrifftify-fronend.vercel.app'
    ],
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
  })
);

app.use(groute);

const PORT = process.env.PORT || 3500;
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.log(error);
  });
