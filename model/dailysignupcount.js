const mongoose = require('mongoose');

const dailySignupCountSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true, // Ensure that the count for each day is unique
  },
  signupCount: {
    type: Number,
    required: true,
  },
});

const DailySignupCount = mongoose.model('DailySignupCount', dailySignupCountSchema);

module.exports = DailySignupCount;
