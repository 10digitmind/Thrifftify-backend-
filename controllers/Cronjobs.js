require("dotenv").config(); // Load environment variables

const cron = require("node-cron");
const User = require("../model/Usermodel.js"); // Adjust path to your User model
const { sendEmail } = require("../sendemail/sendemail.js"); // Adjust path to your sendEmail function
const Good = require("../model/Goodmodel.js");

async function sendVerificationReminders() {
  try {
    console.log("🔄 Cron Job is running...");

    // Find users who signed up but haven't verified their account
    const unverifiedUsers = await User.find({ idVerified: false });

    if (unverifiedUsers.length === 0) {
      console.log("✅ No unverified users found. Skipping...");
      return;
    }

    for (const user of unverifiedUsers) {
      const subject = "Verify Your Thriftify Account & Win ₦2,000!";
      const send_to = user.email;
      const send_from = process.env.EMAIL_USER;
      const reply_to = "noreply@thritify.com";
      const template = "verificationreminder."; // Removed period
      const name = user.firstname;
      const link = `${process.env.FRONTEND_USER}/verify/${user._id}`;

      try {
        await sendEmail(
          subject,
          send_to,
          send_from,
          reply_to,
          null,
          template,
          name,
          link,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null
        );

        console.log(`📧 Verification reminder sent to: ${send_to}`);
      } catch (error) {
        console.error(`❌ Failed to send verification reminder to ${send_to}:`, error.message);
      }
    }
  } catch (error) {
    console.error("❌ Error running cron job:", error.message);
  }
}

async function listingNotification() {
  try {
    console.log("🔄 Cron Job is running...");

    // Find all verified users
    const verifiedUsers = await User.find({ idVerified: true }); // Ensure correct field name

    if (verifiedUsers.length === 0) {
      console.log("✅ No verified users found. Skipping...");
      return;
    }

    for (const user of verifiedUsers) {
      // Find goods belonging to the user
      const usergoods = await Good.find({ userId: user._id });

      // Check if the user has less than 1 listed item
      if (usergoods.length < 1) {
        console.log(`⚠️ User ${user.email} is verified but has no listings.`);

        // Send email notification
        const subject = "Start Selling on Thriftify & Win ₦2,000!";
        const send_to = user.email;
        const send_from = process.env.EMAIL_USER;
        const reply_to = "noreply@thritify.com";
        const template = "listingremider."; // Removed period
        const name = user.firstname;
        const link = `${process.env.FRONTEND_USER}/sellnow`; // Corrected variable

        try {
          await sendEmail(
            subject,
            send_to,
            send_from,
            reply_to,
            null,
            template,
            name,
            link,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
          );

          console.log(`📧 Listing reminder sent to: ${send_to}`);
        } catch (error) {
          console.error(`❌ Failed to send listing reminder to ${send_to}:`, error.message);
        }
      }
    }

    console.log("✅ Cron job completed.");
  } catch (error) {
    console.error("❌ Error running cron job:", error.message);
  }
}

// Schedule the cron job to run at 9 AM and 6 PM every day
cron.schedule("0 9,18 * * *", async () => {
  await sendVerificationReminders();
  await listingNotification();
  console.log("📆 Cron jobs executed at 9 AM & 6 PM.");
});

module.exports = { sendVerificationReminders, listingNotification };
