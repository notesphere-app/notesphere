const express = require("express");
const router = express.Router();
const othersController = require("../controllers/others");
const { rateLimits, verifyRecaptcha } = require("../utils/security");

router.post("/contact", rateLimits.contact, verifyRecaptcha("contact"), othersController.contact);
router.post("/subscribe", rateLimits.subscribe, verifyRecaptcha("subscribe"), othersController.subscribe);
router.post("/subscribe/verify", rateLimits.subscribe, verifyRecaptcha("subscribe"), othersController.verifySubscription);
router.post("/cookie-consent", othersController.saveCookieConsent);
router.get("/careers", othersController.carriers);

module.exports = router;
