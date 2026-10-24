const express = require("express");
const router = express.Router();
const chatbotController = require("../controllers/chatbot");
const { rateLimits, verifyRecaptcha } = require("../utils/security");
const wrapAsync = require("../utils/wrapAsync");

router.post("/", rateLimits.chat, verifyRecaptcha("chat"), wrapAsync(chatbotController.reply));

module.exports = router;
