const cron = require('node-cron');
const Order = require('../model/Ordersmodel'); // Adjust path as necessary

cron.schedule('0 0 * * *', async () => {
  try {
    const orders = await Order.find({ dispatch: false, createdAt: { $gte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) } });

    orders.forEach(async (order) => {
      // Send email reminder logic here
      // Use similar dispatchEmail function as in the UpdatePurchasedItem
    });
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});
