const DailySignupCount =require('../model/dailysignupcount.js')
const User = require("../model/Usermodel.js"); 


const saveDailySignupCount = async () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0); // Start of today (midnight)

  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999); // End of today (just before midnight)

  // Count the number of signups for today
  const count = await User.countDocuments({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  // Save the daily count in the DailySignupCount collection
  const newDailyCount = new DailySignupCount({
    date: startOfDay,
    signupCount: count,
  });

  try {
    await newDailyCount.save();
    console.log('Daily signup count saved successfully');
  } catch (error) {
    console.error('Error saving daily signup count:', error);
  }
};

module.exports = saveDailySignupCount;