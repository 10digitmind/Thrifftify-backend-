const User = require('../model/Usermodel')
const Coupon = require('../model/CouponModel')
const Order = require('../model/Ordersmodel') 
const sendEmail =require('../sendemail/sendemail')


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
      const metadata = JSON.parse(data.metadata);
      const { itemId, buyerId, sellerid: sellerId, code: couponCode, buyerEmail, sellerEmail, sellerName, buyerName, itemName, itemPrice, buyerAddress, phoneNumber } = metadata;
  
      const amount = data.amount / 100;
      const item = await Good.findById(itemId);
      if (!item) return res.status(404).json({ message: "Item not found" });
  
      // Mark item as purchased
      item.purchased = true;
      await item.save();
  
      // Update buyer's pending purchased amount
      const buyer = await User.findById(buyerId);
      if (!buyer) return res.status(400).json({ message: "Can't find buyer" });
      buyer.pendingPurchasedAmount += amount;
      await buyer.save();
  
      // Update seller's pending sold amount
      const seller = await User.findById(sellerId);
      if (!seller) return res.status(400).json({ message: "Can't find seller" });
      seller.pendingSoldAmount += amount;
      await seller.save();
  
      // Record order
      const newOrder = new Order({
        buyer: buyerId,
        orderitems: item,
        purchased: true,
      });
      await newOrder.save();
  
      // Process coupon usage if available
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
  
      // Send notification emails
      await sendPurchaseEmails({
        buyerEmail,
        sellerEmail,
        buyerName,
        sellerName,
        itemName,
        itemPrice,
        buyerAddress,
        phoneNumber,
        deliveryDate: item.deliverydate,
        orderId: newOrder._id,
      });
  
      return res.status(200).json({
        message: "Payment verified successfully and item updated",
        data,
      });
  
    } catch (err) {
      console.error("Error handling successful payment:", err.message);
      return res.status(500).json({ error: "Failed to process payment details" });
    }
  };
  


  module.exports = handleSuccessfulPayment