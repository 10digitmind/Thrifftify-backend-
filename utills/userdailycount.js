const User = require("../model/Usermodel.js"); 


const countSignupsPerDay = async (date) => {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const count = await User.countDocuments({
      createdAt: { $gte: startOfDay },
    });
    return count;
  };
  
module.exports = countSignupsPerDay