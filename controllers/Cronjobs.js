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
      const subject = "Verify Your Thriftify ";
      const send_to = user.email;
      const send_from = process.env.EMAIL_USER;
      const reply_to = "noreply@thritify.com";
      const template = "verificationreminder."; // Removed period
      const name = user.firstname;
      const link = `${process.env.FRONTEND_USER}/sellform`;

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
        console.error(
          `❌ Failed to send verification reminder to ${send_to}:`,
          error.message
        );
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
        const subject = "Start Selling on Thriftify!";
        const send_to = user.email;
        const send_from = process.env.EMAIL_USER;
        const reply_to = "noreply@thritify.com";
        const template = "listingremider."; // Removed period
        const name = user.firstname;
        const link = `${process.env.FRONTEND_USER}/sellform`; // Corrected variable

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
          console.error(
            `❌ Failed to send listing reminder to ${send_to}:`,
            error.message
          );
        }
      }
    }

    console.log("✅ Cron job completed.");
  } catch (error) {
    console.error("❌ Error running cron job:", error.message);
  }
}

async function firstListingNotification(userId) {
  try {
    console.log("🔄 Checking first listing for user...");

    // Find the user
    const user = await User.findById(userId);
    if (!user || !user.idVerified) return; // Ensure the user exists and is verified

    // Find goods belonging to the user
    const usergoods = await Good.find({ userId: user._id });

    // Check if the user has exactly 1 listed item (first listing)
    if (usergoods.length === 1) {
      console.log(`⚠️ User ${user.email} has made their first listing.`);

      // Send email notification
      const subject = "congratulation on your firstlisting!";
      const send_to = user.email;
      const send_from = process.env.EMAIL_USER;
      const reply_to = "noreply@thritify.com";
      const template = "firstlisting."; // Removed period
      const name = user.firstname;
      const link = `${process.env.FRONTEND_USER}/profilepage`; // Corrected variable

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

        console.log(`📧 First listing notification sent to: ${send_to}`);
      } catch (error) {
        console.error(
          `❌ Failed to send first listing notification to ${send_to}:`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error(
      "❌ Error running first listing notification:",
      error.message
    );
  }
}

async function sendEmailVerification() {
  try {
    console.log("🔄 Cron Job is running...");

    // Find users who signed up but haven't verified their account
    const unverifiedemailUsers = await User.find({ isVerified: false });

    if (unverifiedemailUsers.length === 0) {
      console.log("✅ No unverified users found. Skipping...");
      return;
    }

    for (const user of unverifiedemailUsers) {
      const subject =
        "Final Reminder: Verify Your Thriftify Account Before It's Deleted";
      const send_to = user.email;
      const send_from = process.env.EMAIL_USER;
      const reply_to = "noreply@thritify.com";
      const template = "emailverificationreminder."; // Removed period
      const name = user.firstname;
      const link = `${process.env.FRONTEND_USER}`;

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
        console.error(
          `❌ Failed to send verification reminder to ${send_to}:`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error("❌ Error running cron job:", error.message);
  }
}

async function deleteUnverifiedAccounts() {
  try {
    console.log("🔄 Cron job running...");

    // Find users who signed up but haven't verified their email after 30 days
    const unverifiedEmailUsers = await User.find({
      isVerified: false,
      createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // 30 days ago
    });

    if (unverifiedEmailUsers.length === 0) {
      console.log("✅ No unverified users found after 30 days. Skipping...");
      return;
    }

    for (const user of unverifiedEmailUsers) {
      try {
        // Delete the user if they haven't verified within 30 days
        await user.delete();
        console.log(`❌ Deleted unverified account: ${user.email}`);
      } catch (error) {
        console.error(
          `❌ Failed to delete account: ${user.email}`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error("❌ Error running cron job:", error.message);
  }
}

async function userWithListings() {
  try {
    console.log("🔄 Checking users with more than one listing...");

    // Find all verified users
    const users = await User.find({ idVerified: true });

    for (const user of users) {
      // Find goods belonging to the user
      const userGoods = await Good.find({ userId: user._id });

      // Check if the user has more than one listed item
      if (userGoods.length >= 1) {
        console.log(`⚠️ User ${user.email} has more than one listing.`);

        // Send email notification
        const subject = "Congratulations on Your Listings!";
        const send_to = user.email;
        const send_from = process.env.EMAIL_USER;
        const reply_to = "noreply@thriftify.com";
        const template = "userwithlistings.";
        const name = user.firstname;
        const link = `${process.env.FRONTEND_USER}/profilepage`;

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

          console.log(`📧 Listing notification sent to: ${send_to}`);
        } catch (error) {
          console.error(
            `❌ Failed to send listing notification to ${send_to}:`,
            error.message
          );
        }
      }
    }
  } catch (error) {
    console.error(
      "❌ Error running first listing notification:",
      error.message
    );
  }
}



async function generalNotification() {
  try {
    console.log("🔄 Cron Job is running...");

    // Fetch users who have verified their email
    const users = await User.find({ isVerified: true });; // Replace with your actual DB query

    if(users===0){
      console.log('no users')
      return;
    }

    for (const user of users) { 
      const subject = "Eid Mubarak from Thriftify! 🎉";
      const send_to = user.email;
      const send_from = process.env.EMAIL_USER;
      const reply_to = "noreply@thrifify.com";
      const template = "generalnotification."; // Ensure you have this template in your email system
      const name = user.firstname;

      try {
        await sendEmail(
          subject,
          send_to,
          send_from,
          reply_to,
          null,
          template,
          name
        );

        console.log(`📧 Eid message sent to: ${send_to}`);
        console.log(send_to.length)
      } catch (error) {
        console.error(
          `❌ Failed to send Eid message to ${send_to}:`,
          error.message
        );
      }
    }
  } catch (error) {
    console.error("❌ Error running email job:", error.message);
  }
}



module.exports = {
  sendVerificationReminders,
  userWithListings,
  listingNotification,
  firstListingNotification,
  sendEmailVerification,
  deleteUnverifiedAccounts,
  generalNotification
};
