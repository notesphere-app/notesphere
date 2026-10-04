const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "thecubicals",
    allowedFormats: ["png", "jpg", "jpeg", "svg", "webp"],
  },
});

module.exports = {
  cloudinary,
  storage,
};
