const dotenv = require('dotenv')

const cloudonaryModule =require('cloudinary')

dotenv.config()
const cloudinary = cloudonaryModule.v2

cloudinary.config({
    cloud_name:process.env.CLOUDINARY_NAME,
    api_key:process.env.CLOUDINARY__API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET,
})

module.exports = cloudinary;