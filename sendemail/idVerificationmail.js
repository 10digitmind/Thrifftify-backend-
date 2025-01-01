const nodemailer = require("nodemailer");
const hbs = require("nodemailer-express-handlebars");
const path = require("path");

const idVerificationEmail = async (
  subject,
  send_to,
  sent_from,
  reply_to,
  cc,
  template,
  name,
  ninNumber,
  dob,
  link,
  file,
  

) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: 465,
    secure: true,

    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const handlebarOption = {
    viewEngine: {
      extName: "handlebars",
      partialsDir: path.resolve("../backend/views"),
      defaultLayout: false,
    },
    viewPath: path.resolve("../backend/views"),
    extName: "handlebars",
  };

  transporter.use("compile", hbs(handlebarOption));
  //options for sending email
  const options = {
    from: sent_from,
    to: send_to,
    replyTo: reply_to,
    cc:cc,
    template: template,
    subject: subject,
    context: {
        name,
        ninNumber,
        dob,
        link
    },
    attachments: file ? [{
      filename: file.filename,
      path: file.path,
      cid: 'image@nodemailer.com'
    }] : [],
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

module.exports = { idVerificationEmail };
