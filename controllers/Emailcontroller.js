const { sendEmail } = require("../sendemail/sendemail");
const asyncHandler = require("express-async-handler");
const User = require("../model/Usermodel.js");




// send buyer purchased confirmation email 

const sendPurchasedemailtoseller = asyncHandler(async (req, res) => {

  const { subject, send_to, sellername, itemname, buyeraddress, buyername, itemprice } = req.body;
 
  // Set email parameters

  const send_from = process.env.EMAIL_USER;
  const reply_to = "noreply@thritify.com";
  const template = "sellerpurchased.";
 
 
  // Send email
  try {
    await sendEmail(
      subject,
      send_to,
      send_from,
      reply_to,
      template,
      null,
      null,
      buyername,
      itemprice,
      sellername,
      itemname,
      buyeraddress
    );

    // Respond with success message
    res.status(200).json({ message: `purchased confirmationsent to seller: ${send_to}  ` });
  } catch (error) {
    res.status(404).json({ message: error });
  }
});





const sendPurchasedemailtobuyer = asyncHandler(async (req, res) => {

  const { subject, send_to, sellername, itemname, buyername } = req.body;
 
  // Set email parameters

  const send_from = process.env.EMAIL_USER;
  const reply_to = "noreply@thritify.com";
  const template = "buyerpurchased.";
 
 
  // Send email
  try {
    await sendEmail(
      subject,
      send_to,
      send_from,
      reply_to,
      template,
      null,
      null,
      buyername,
      itemname,
      sellername

   
    );

    // Respond with success message
    res.status(200).json({ message: `buyer purchased email sent to: ${send_to}  ` });
  } catch (error) {
    res.status(404).json({ message: error });
  }
});




module.exports= {sendPurchasedemailtoseller,sendPurchasedemailtobuyer}
