const  CouponUsage = require('../model/Couponuseagemodel')
const Coupon =  require('../model/CouponModel')

const logCouponUsage = async (userId, couponCode) => {
    const usage = new CouponUsage({
      userId,
      couponCode,
    });
    await usage.save();
  };

  const verifyCoupon = async (couponCode) => {
    const coupon = await Coupon.findOne({ code: couponCode });
  
    if (!coupon) {
      return { success: false, message: "Coupon not found" };
    }
  
    // Check if the coupon has expired
    if (new Date() > coupon.expiryDate) {
      return { success: false, message: "Coupon has expired" };
    }
  
    // Check if the coupon is active
    if (!coupon.isActive) {
      return { success: false, message: "Coupon is inactive" };
    }
  
    // Check if the coupon usage count has exceeded the limit
    if (coupon.usedCount >= coupon.usageLimit) {
      return { success: false, message: "Coupon usage limit exceeded" };
    }
  
    return { success: true, coupon };
  };
  
  
  module.exports = {logCouponUsage,verifyCoupon}