// paystackService.js
const axios = require('axios');
const dontenv = require("dotenv").config();
const paystack = (req) => {
  return axios.create({
    baseURL: 'https://api.paystack.co',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SCERET_KEY}`,
      'Content-Type': 'multipart/form-data'
    },
  });
};

const initializePayment = async (formData) => {
  const instance = paystack();
  const response = await instance.post('/transaction/initialize', formData);
  return response.data;
};

const verifyPayment = async (reference) => {
  const instance = paystack();
  const response = await instance.get(`/transaction/verify/${reference}`);
  return response.data;
};

module.exports = {
  initializePayment,
  verifyPayment,
};
