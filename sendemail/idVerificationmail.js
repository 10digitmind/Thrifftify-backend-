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
  files,
  address
  

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
    viewPath: viewPath,
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
        link,
        address
    },
    attachments: files && files.length > 0 ? files.map(file => ({
      filename: file.filename,
      path: file.path,
      cid: `image${file.filename}` // You can create unique cid for each file
    })) : [],
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
