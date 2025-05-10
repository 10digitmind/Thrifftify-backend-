const {sendEmail} = require('../sendemail/sendemail')

const sendChatAlert = async ({
    receiverEmail,
    receiverName,
    senderName,
    itemName,
    chatLink,
  }) => {
    return sendEmail(
      /* subject      */ "New chat message on Thriftify",
      /* send_to      */ receiverEmail,
      /* sent_from    */ `"Thriftify" <${process.env.EMAIL_USER}>`,
      /* reply_to     */ process.env.EMAIL_USER,
      /* cc           */ null,
      /* template     */ "chatalert.",         
      /* name         */ receiverName,
      /* link         */ chatLink,
      /* buyername    */ null,
      /* itemprice    */ null,
      /* sellername   */ senderName,           // reuse sellername field for sender
      /* itemname     */ itemName,
      /* buyeraddress */ null,
      /* phonenumber  */ null,
      /* deliveryformurl */ null,
      /* loginCode    */ null,
      /* deliverydate */ null,
      /* email        */ null
    );
  };

  module.exports = {sendChatAlert}