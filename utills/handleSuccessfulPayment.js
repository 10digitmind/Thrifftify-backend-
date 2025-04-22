
const Coupon = require('../model/CouponModel')
const Order = require('../model/Ordersmodel') 
const {sendEmail} =require('../sendemail/sendemail')
const User = require('../model/Usermodel')


const sendPurchaseEmails = async ({ buyerEmail, sellerEmail, buyerName, sellerName, itemName, itemPrice, buyerAddress, phoneNumber, deliveryDate, orderId }) => {
    const sendFrom = process.env.EMAIL_USER;
    const replyTo = "noreply@thritify.com";
    const ccAddress = "purchased@thriftiffy.com";
    const deliveryFormUrl = `${process.env.FRONTEND_USER}/deliveryform/${orderId}/${itemName}`;
  
    // Buyer email
    await sendEmail(
      "Item successfully purchased",
      buyerEmail,
      sendFrom,
      replyTo,
      ccAddress,
      "buyerpurchased.",
      null,
      null,
      buyerName,
      itemName,
      sellerName,
      null,
      null,
      null,
      null,
      null,
      deliveryDate
    );
  
    // Seller email
    await sendEmail(
      "Your item has been purchased",
      sellerEmail,
      sendFrom,
      replyTo,
      ccAddress,
      "sellerpurchased.",
      null,
      null,
      buyerName,
      itemPrice,
      sellerName,
      itemName,
      buyerAddress,
      phoneNumber,
      deliveryFormUrl,
      null,
      null
    );
  };



  const handleSuccessfulPayment = async (data, res) => {
    try {
      const metadata = data.metadata ? JSON.parse(data.metadata) : null;
  
      if (!metadata) {
        return res.status(400).json({ message: "No metadata found in transaction" });
      }
  
      const {
        itemId,
        buyerId,
        sellerid: sellerId,
        code: couponCode,
        buyerEmail,
        sellerEmail,
        sellerName,
        buyerName,
        itemName,
        itemPrice,
        buyerAddress,
        phoneNumber
      } = metadata;
  
      const amount = data.amount / 100;
  
      const item = await Good.findById(itemId);
      if (!item) return res.status(404).json({ message: "Item not found" });
  
      item.purchased = true;
      await item.save();
  
      const buyer = await User.findById(buyerId);
      if (!buyer) return res.status(400).json("Can't find buyer");
  
      buyer.pendingPurchasedAmount += amount;
      await buyer.save();
  
      const seller = await User.findById(sellerId);
      if (!seller) return res.status(400).json("Can't find seller");
  
      seller.pendingSoldAmount += amount;
      await seller.save();
  
      const newOrder = await new Order({
        buyer: buyerId,
        orderitems: item,
        purchased: true,
      }).save();
  
      if (couponCode) {
        const coupon = await Coupon.findOne({ code: couponCode });
        if (coupon && coupon.isActive && new Date() <= coupon.expiryDate && coupon.usedCount < coupon.usageLimit) {
          coupon.usedCount += 1;
          await coupon.save();
  
          await CouponUsage.create({
            userId: buyerId,
            couponCode,
            amountApplied: coupon.discountValue,
            orderId: newOrder._id,
          });
        }
      }
  
      await sendEmail(
        "Item successfully purchased",
        buyerEmail,
        process.env.EMAIL_USER,
        "noreply@thritify.com",
        "purchased@thriftiffy.com",
        "buyerpurchased.",
        null,
        null,
        buyerName,
        itemName,
        sellerName,
        null,
        null,
        null,
        null,
        null,
        item.deliverydate
      );
  
      await sendEmail(
        "Your item has been purchased",
        sellerEmail,
        process.env.EMAIL_USER,
        "noreply@thritify.com",
        "purchased@thriftiffy.com",
        "sellerpurchased.",
        null,
        null,
        buyerName,
        itemPrice,
        sellerName,
        itemName,
        buyerAddress,
        phoneNumber,
        `${process.env.FRONTEND_USER}/deliveryform/${newOrder._id}/${itemName}`,
        null,
        null
      );
  
      return res.status(200).json({
        message: "Payment verified successfully and item updated",
        data,
      });
  
    } catch (error) {
      console.error("Error handling successful payment:", error);
      return res.status(500).json({ message: "Failed to process successful payment" });
    }
  };
  


  module.exports = handleSuccessfulPayment