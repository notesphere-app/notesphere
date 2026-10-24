const express = require("express");
const router = express.Router();
const authController = require("../controllers/authcontroller.js");
const { saveRedirectUrl, setMetatag } = require("../middleware.js");
const { rateLimits, verifyRecaptcha } = require("../utils/security");

router.get("/forgot-password", authController.restform);
router.post(
  "/forgot-password",
  rateLimits.passwordReset,
  verifyRecaptcha("password-reset"),
  saveRedirectUrl,
  authController.forgotPassword,
);
router.get("/reset-password/:token", authController.getResetPassword);
router.post(
  "/reset-password/:token",
  rateLimits.passwordReset,
  verifyRecaptcha("password-reset"),
  authController.postResetPassword,
);

//router.get("/ibsa/task", homeController.addtask);

module.exports = router;
