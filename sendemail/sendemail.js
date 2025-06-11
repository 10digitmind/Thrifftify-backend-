const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");

const sendEmail = async (
  subject,
  send_to,
  sent_from,
  reply_to,
  cc,
  template,
  name,
  link,
  buyername,
  itemprice,
  sellername,
  itemname,
  buyeraddress,
  phonenumber,
  deliveryformurl,
  loginCode,
  deliverydate,
  email
) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 587,
    secure: false,

    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  const viewPath = path.join(__dirname,'..', "views");
  
  const handlebarOption = {
    viewEngine: {
      extName: "handlebars",
      partialsDir: viewPath,
      defaultLayout: false,
    },
    viewPath:viewPath,
    extName: "handlebars",
  };

  transporter.use("compile", hbs(handlebarOption));
  //options for sending email
  const options = {
    from: sent_from,
    to: send_to,
    replyTo: reply_to,
    cc: cc,
    template: template,
    subject: subject,
    context: {
      name,
      link,
      buyername,
      itemprice,
      sellername,
      itemname,
      buyeraddress,
      phonenumber,
      deliveryformurl,
      loginCode,
      deliverydate,
      email
    },
  };
  //send email

  transporter.sendMail(options, function (err, info) {
    if (err) {
      console.log(err);
    } else {
      console.log(info);
    }
  });
};




module.exports = { sendEmail };
