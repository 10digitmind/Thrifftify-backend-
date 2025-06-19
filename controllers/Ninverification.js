const asyncHandler = require("express-async-handler");

const puppeteer = require("puppeteer");
const tesseract = require("tesseract.js");
const fs = require("fs");
const { json } = require("body-parser");
const path = require("path");
const Jimp = require("jimp");
const User = require("../model/Usermodel");
const dayjs = require('dayjs');


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
  const { ninNumber, day, month, year, email } = req.body;

  try {
    // Validate input
    if (!ninNumber || ninNumber.length !== 11 || !/^\d{11}$/.test(ninNumber)) {
      return res.status(400).json({ message: "Please input a valid 11-digit NIN." });
    }

    if (!day || !month || !year || !email) {
      return res.status(400).json({ message: "Please input all required fields." });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found." });

    if (user.idVerified) {
      return res.status(400).json({ message: "User already verified." });
    }

    const screenshotsDir = path.join(__dirname, "screenshots");
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir);
    }

    const browser = await puppeteer.launch({ headless: true }); // Use `true` in production
    const page = await browser.newPage();
    await page.goto("https://passport.immigration.gov.ng/nin/VTJGc2RHVmtYMTlVNThVNHpXbURJdDA1Vkp1cENRcDlKMVg3c2FLR0tHUT0%3D");

    // Fill the form
    await page.type('[name="nin"]', ninNumber);
    await page.type('[name="dateOfBirthDay"]', day);
    await page.type('[name="dateOfBirthMonth"]', month);
    await page.type('[name="dateOfBirthYear"]', year);

    // Handle CAPTCHA
    await page.waitForSelector("#captcahCanvas", { timeout: 5000 });
    const captchaElement = await page.$("#captcahCanvas");
    const captchaPath = path.join(screenshotsDir, "captcha.png");
    await captchaElement.screenshot({ path: captchaPath });

    let image = await Jimp.read(captchaPath);
    image = image.grayscale().blur(1).threshold({ max: 128 });
    image.write(captchaPath);

    const { data: { text } } = await tesseract.recognize(captchaPath, "eng");
    const captchaText = text.replace(/\s+/g, "");
    console.log('captchaText', captchaText);

    await page.type('[name="inputText"]', captchaText);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.evaluate(() => {
      document.querySelector('[value="Verify"]').scrollIntoView();
    });

    await page.waitForSelector('[value="Verify"]:not([disabled])', { visible: true });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.evaluate(() => {
      document.querySelector('[value="Verify"]').click();
    });

    // Check CAPTCHA error
    const invalidCaptchaElement = await page.$(".alert.captcha-alert");
    if (invalidCaptchaElement) {
      await browser.close();
      return res.status(400).json({ message: "CAPTCHA failed. Please try again." });
    }

    // Wait for result
    await page.waitForSelector(".w100.personal_details_section.mt10, .ngx-dialog-content", { timeout: 60000 });

    const resultElement = await page.$(".w100.personal_details_section.mt10");
    if (resultElement) {
      const result = await page.$eval(".w100.personal_details_section.mt10", el => el.textContent);
      const personalDetails = extractPersonalDetails(result);
      const { firstName, lastName, dateOfBirth } = personalDetails;

      if (!firstName || !lastName || !dateOfBirth) {
        await browser.close();
        return res.status(500).json({ message: "Could not extract complete personal details from NIN data." });
      }

      const userDobFormatted = dayjs(user.dob).format('YYYY-MM-DD');
      const [ninDay, ninMonth, ninYear] = dateOfBirth.split("-");
      const ninDobFormatted = `${ninYear}-${ninMonth}-${ninDay}`; //

      if (
        user.firstname?.trim().toLowerCase() !== firstName.trim().toLowerCase() ||
        user.lastname?.trim().toLowerCase() !== lastName.trim().toLowerCase() ||
        userDobFormatted !== ninDobFormatted
      ) {
        await browser.close();
        return res.status(400).json({
          message: "NIN details do not match your Thriftify account details. Please check and try again."
        });
      }

      // Save verification
      user.idVerified = true;
      user.ninDetails.push(personalDetails);
      await user.save();

      await browser.close();
      return res.status(200).json("NIN verification successful");
    }

    // If not found, check for error
    const invalidNinElement = await page.$(".ngx-dialog-content");
    if (invalidNinElement) {
      await browser.close();
      return res.status(404).json({ message: "Invalid NIN number provided please trying again ." });
    }

    await browser.close();
    return res.status(500).json({ message: "Unexpected error. Try again." });

  } catch (error) {
    console.error("NIN Verification Error:", error);
    return res.status(500).json({ message: "Internal server error during NIN verification." });
  }
};


module.exports = {
  ninVerification,
};
