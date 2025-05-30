require("dotenv").config(); // Load environment variables
const { TwitterApi } = require('twitter-api-v2');

const cron = require("node-cron");
const User = require("../model/Usermodel.js"); // Adjust path to your User model
const { sendEmail } = require("../sendemail/sendemail.js"); // Adjust path to your sendEmail function
const Good = require("../model/Goodmodel.js");
const Review = require("../model/Reviews.js");

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
      const subject = "list now! ";
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
    const users = await User.find({ isVerified: true });
console.log('alluser',users.length)
    let totalseller = []
    for (const user of users) {
      // Find goods belonging to the user
      const userGoods = await Good.find({ userId: user._id });
    
     
      // Check if the user has more than one listed item
      if (userGoods.length >= 1) {
        console.log(`⚠️ User ${user.email} has more than one listing.`);
        totalseller.push(user.email)
        
        // Send email notification
        const subject = "Come Online Buyers are wating ";
        const send_to = user.email;
        const send_from = process.env.EMAIL_USER;
        const reply_to = "noreply@thriftify.com";
        const template = "userwithlistings.";
        const name = user.firstname;
        const link = `${process.env.FRONTEND_USER}/profilepage`;

        // try {
        //   await sendEmail(
        //     subject,
        //     send_to,
        //     send_from,
        //     reply_to,
        //     null,
        //     template,
        //     name,
        //     link,
        //     null,
        //     null,
        //     null,
        //     null,
        //     null,
        //     null,
        //     null,
        //     null,
        //     null,
        //     null
        //   );

        //   console.log(`📧 Listing notification sent to: ${send_to}`);
        // } catch (error) {
        //   console.error(
        //     `❌ Failed to send listing notification to ${send_to}:`,
        //     error.message
        //   );
        // }
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
      const subject = "Chat with seller and buyer on thrifitify 🎉";
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




const client = new TwitterApi({
  appKey:process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_SECRET_KEY,
  accessToken: process.env.TWITTER_ACCESS_TOKEN ,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});


const tweetList = [
  "Why pay more? Get affordable fashion on Thriftify today! #ThriftifyNG https://www.thriftiffy.com/registerpage",
  "Sell your clothes, make money, and help others save — all on Thriftify https://www.thriftiffy.com/registerpage.",
  "New week, new wardrobe! Discover something unique on Thriftify https://www.thriftiffy.com/registerpage.",
  "Sustainable fashion made simple — join the thrift revolution with Thriftify https://www.thriftiffy.com/registerpage.",
  "Ready to refresh your closet? Check out Thriftify for stylish and affordable finds https://www.thriftiffy.com/registerpage.",
  "Thriftify is your go-to platform for second-hand fashion that won’t break the bank https://www.thriftiffy.com/registerpage.",
  "Give your clothes a second life and make some money while you're at it! Start selling on Thriftify https://www.thriftiffy.com/registerpage.",
  "Find hidden gems at unbeatable prices — only on Thriftify https://www.thriftiffy.com/registerpage.",
  "Looking for budget-friendly fashion? Thriftify has you covered https://www.thriftiffy.com/registerpage.",
  "Want to sell clothes and earn cash? Thriftify makes it easy for you https://www.thriftiffy.com/registerpage.",
  "It’s not just second-hand, it’s sustainable fashion! Join Thriftify today https://www.thriftiffy.com/registerpage.",
  "Create your own personal fashion marketplace with Thriftify! Start now https://www.thriftiffy.com/registerpage.",
  "No need to spend a fortune on fashion — shop Thriftify for affordable style https://www.thriftiffy.com/registerpage.",
  "Thriftify is where fashion meets sustainability. Buy and sell gently used clothes today https://www.thriftiffy.com/registerpage.",
  "Get great deals on your next outfit, only on Thriftify https://www.thriftiffy.com/registerpage.",
  "Are you a fashion lover? You can now buy and sell with Thriftify https://www.thriftiffy.com/registerpage.",
  "Join the Thriftify community and get access to affordable, sustainable fashion https://www.thriftiffy.com/registerpage.",
  "Thriftify: where you can shop sustainably and sell effortlessly https://www.thriftiffy.com/registerpage.",
  "Looking to update your wardrobe on a budget? Visit Thriftify now https://www.thriftiffy.com/registerpage.",
  "Selling your old clothes on Thriftify is easy, fast, and profitable! Get started today https://www.thriftiffy.com/registerpage.",
  "Shop smart, shop sustainably! Thriftify has all the best second-hand fashion deals https://www.thriftiffy.com/registerpage.",
  "Why buy new when you can get gently used clothes at amazing prices? Shop Thriftify https://www.thriftiffy.com/registerpage.",
  "Make room in your closet and make money on Thriftify! Start selling today https://www.thriftiffy.com/registerpage.",
  "Thriftify helps you find high-quality fashion at a fraction of the price https://www.thriftiffy.com/registerpage.",
  "Looking for a unique fashion find? Thriftify has one-of-a-kind pieces waiting for you https://www.thriftiffy.com/registerpage.",
  "Get fashion you’ll love, for prices you’ll adore. Only on Thriftify https://www.thriftiffy.com/registerpage.",
  "Sustainable, stylish, and affordable — that’s what Thriftify is all about https://www.thriftiffy.com/registerpage.",
  "Upgrade your wardrobe without breaking the bank on Thriftify https://www.thriftiffy.com/registerpage.",
  "Join the Thriftify community and enjoy fashion that fits your budget and values https://www.thriftiffy.com/registerpage.",
  "Find affordable, eco-friendly fashion that’s kind to your wallet and the planet on Thriftify https://www.thriftiffy.com/registerpage.",
  "Fashion doesn’t have to cost a fortune. Start shopping on Thriftify today https://www.thriftiffy.com/registerpage."
];


let postedTweets = [];

const postRandomTweet = async () => {
  // Filter out already posted tweets
  const remainingTweets = tweetList.filter(tweet => !postedTweets.includes(tweet));

  if (remainingTweets.length === 0) {
    // If all tweets have been posted, reset the postedTweets list
    postedTweets = [];
    console.log('All tweets have been posted. Resetting...');
  }

  const tweet = remainingTweets[Math.floor(Math.random() * remainingTweets.length)];

  // Post the tweet
  await client.v2.tweet(tweet);
  console.log('Tweeted:', tweet);

  // Add the posted tweet to the postedTweets array
  postedTweets.push(tweet);
};





async function giveReview() {
  try {
    console.log("🔄 Checking users with more than one listing...");

    // Find all verified users
    const users = await User.find({ isVerified: true });

    for (const user of users) {
      // Find goods belonging to the user
      const userGoods = await Good.find({ userId: user._id });

      console.log('This is user goods:', userGoods);

      // Check if the user has more than one listed item
      if (userGoods.length >= 1) { // Check for users with at least one listing
        console.log(`⚠️ User ${user.firstname} has listings and is eligible for a review.`);

        const review = new Review({
          userId: user._id,
          rating: 5, // Default rating
          name: "Thriftiffy", // Assuming 'name' field in User schema
          comment: "Auto-feedback: Sale completed successfully.", // Default comment
        });
    
        await review.save();  // Save the review

        console.log(`✅ Review given for user ${user.firstname}`);
      }
    }
  } catch (error) {
    console.error("❌ Error running first listing notification:", error.message);
  }
}



module.exports = {
  sendVerificationReminders,
  userWithListings,
  listingNotification,
  firstListingNotification,
  sendEmailVerification,
  deleteUnverifiedAccounts,
  generalNotification,
  postRandomTweet
};

