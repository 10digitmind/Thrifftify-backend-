const asyncHandler = require("express-async-handler");

const puppeteer = require("puppeteer");
const tesseract = require("tesseract.js");
const fs = require("fs");
const { json } = require("body-parser");
const path = require("path");
const Jimp = require("jimp");
const User = require("../model/Usermodel");


const removeLastCharacter = (str) => {
  const match = str.match(/(.*)./);
  return match ? match[1] : str;
};

const extractPersonalDetails = (result) => {
  const details = {};

  // Extract first name
  const firstNameMatch = result.match(/First Name([A-Z]+)/);
  details.firstName = firstNameMatch
    ? removeLastCharacter(firstNameMatch[1].trim())
    : null;

  // Extract middle name
  const middleNameMatch = result.match(/Middle Name([A-Z]+)/);
  details.middleName = middleNameMatch
    ? removeLastCharacter(middleNameMatch[1].trim())
    : null;

  // Extract last name
  const lastNameMatch = result.match(/Last Name([A-Z]+)/);
  details.lastName = lastNameMatch
    ? removeLastCharacter(lastNameMatch[1].trim())
    : null;

  // Extract date of birth
  const dobMatch = result.match(/Date of Birth(\d{2}-\d{2}-\d{4})/);
  details.dateOfBirth = dobMatch ? dobMatch[1].trim() : null;

  // Extract gender
  const genderMatch = result.match(/Gender([A-Z]+)/);
  details.gender = genderMatch
    ? removeLastCharacter(genderMatch[1].trim())
    : null;

  // Extract marital status
  const maritalStatusMatch = result.match(/Marital Status([A-Z]+)/);
  details.maritalStatus = maritalStatusMatch
    ? removeLastCharacter(maritalStatusMatch[1].trim())
    : null;

  // Extract place of birth
  const placeOfBirthMatch = result.match(
    /Place of Birth([\w\s]+)(?=Maiden Name|$)/
  );
  details.placeOfBirth = placeOfBirthMatch ? placeOfBirthMatch[1].trim() : null;

  // Extract maiden name (if available)
  const maidenNameMatch = result.match(/Maiden Name([\w\s]+)/);
  details.maidenName = maidenNameMatch ? maidenNameMatch[1].trim() : null;

  return details;
};

const ninVerification = async (req, res) => {
  const { ninNumber, day, month, year,email} = req.body;

  const user = await User.findOne({ email });
  console.log('this is the user ',user)

  // Validate inputs
  if (!ninNumber || ninNumber.length !== 11 || !/^\d{11}$/.test(ninNumber)) {
    return res.status(404).json("Please input a valid 11-digit NIN.");
  }

  if(user.idVerified){
    return res.status(404).json("User already verified");
  }

  if (!day || !month || !year ||!email) {
    return res.status(404).json("Please input all require filed.");
  }

  const screenshotsDir = path.join(__dirname, "screenshots");
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto(
    "https://passport.immigration.gov.ng/nin/VTJGc2RHVmtYMTlVNThVNHpXbURJdDA1Vkp1cENRcDlKMVg3c2FLR0tHUT0%3D"
  );

  try {
    // Fill in the form
    await page.type('[name="nin"]', ninNumber);
    await page.type('[name="dateOfBirthDay"]', day);
    await page.type('[name="dateOfBirthMonth"]', month);
    await page.type('[name="dateOfBirthYear"]', year);

    // Handle CAPTCHA
    await page.waitForSelector("#captcahCanvas", { timeout: 5000 }); // Add timeout for waitForSelector
    const captchaElement = await page.$("#captcahCanvas");
    const captchaPath = path.join(screenshotsDir, "captcha.png");
    await captchaElement.screenshot({ path: captchaPath });

    // Process the CAPTCHA image
    let image = await Jimp.read(captchaPath);
    image = image.grayscale().blur(1).threshold({ max: 128 });
    image.write(captchaPath);

    const { data: { text } } = await tesseract.recognize(captchaPath, "eng");
    const captchaText = text.replace(/\s+/g, "");

    await page.type('[name="inputText"]', captchaText);
    console.log("This is the CAPTCHA number:", captchaText);

    // Submit the form
    await page.click('[value="Verify"]');
    try {
      // Check for invalid CAPTCHA alert
      const invalidCapchaElement = await page.$(".alert.captcha-alert");
      if (invalidCapchaElement) {
        return res.status(404).json({ message: "Please try again." });
      }
      // Wait for either personal details or an error dialog to appear
      await page.waitForSelector(".w100.personal_details_section.mt10, .ngx-dialog-content", { timeout: 60000 });

      const resultElement = await page.$(".w100.personal_details_section.mt10");
      if (resultElement) {
        const result = await page.$eval(".w100.personal_details_section.mt10", el => el.textContent);
        const personalDetails = extractPersonalDetails(result);

        // Normalize comparison by trimming and converting to lower case
        if (
          user.firstname.trim().toLowerCase() !== personalDetails.firstName.trim().toLowerCase() ||
          user.lastname.trim().toLowerCase() !== personalDetails.lastName.trim().toLowerCase() ||
          user.dob.trim() !== personalDetails.dateOfBirth.trim()
        ) {
          return res.status(404).json({message:"NIN details do not match your thriftiffy account details."});
        } else {
        user.idVerified = true
        user.ninDetails.push(personalDetails)
          await user.save();
          return res.status(200).json(personalDetails);
        }
      }

      // Handle invalid NIN
      const invalidNinElement = await page.$(".ngx-dialog-content");
      if (invalidNinElement) {
        console.log("Invalid NIN");
        return res.status(404).json({ message: "Invalid NIN number provided." });
      }
    } catch (innerError) {
      console.error("Error while waiting for result or error message:", innerError);
      return res.status(500).json({ message: "An error occurred during NIN verification." });
    }
  } catch (error) {
    console.error("General error:", error);
    return res.status(500).json({ message: "An error occurred during NIN verification." });
  } finally {
    await browser.close();
  }
};

module.exports = {
  ninVerification,
};
