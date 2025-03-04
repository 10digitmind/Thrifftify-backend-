const cron = require("node-cron");
const User = require("../model/Usermodel.js"); // Adjust path to your User model
const { sendEmail } = require("../sendemail/sendemail"); // Adjust path to your email function

// Schedule a job to run at 9 AM and 6 PM daily
cron.schedule("*/5 * * * *", async () => {
  try {
    console.log("🔄 Running Cron Job: Sending verification reminders...");

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
      const template = "verificationreminder"; // Ensure template name is correct
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
});
