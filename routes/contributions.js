const express = require("express");
const router = express.Router();
const contributionsController = require("../controllers/contributions");
const { rateLimits } = require("../utils/security");

router.post("/order", rateLimits.contribution, contributionsController.createOrder);
router.post("/verify", rateLimits.contribution, contributionsController.verifyPayment);

module.exports = router;
