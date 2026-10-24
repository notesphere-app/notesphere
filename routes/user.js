const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const {
  saveRedirectUrl,
  isLoggedIn,
  isAdmin,
} = require("../middleware.js");
const multer = require("multer");
const upload = multer();
const userController = require("../controllers/users.js");
const { rateLimits, verifyRecaptcha } = require("../utils/security");

// signup GET
//Signup POST
router
  .route("/signup")
  .get(userController.renderSignupForm)
  .post(rateLimits.signup, verifyRecaptcha("signup"), wrapAsync(userController.signup));

//Login GET
//Login POST
router
  .route("/login")
  .get(userController.renderLoginForm)
  .post(
    rateLimits.login,
    userController.startLoginActivity,
    verifyRecaptcha("login"),
    saveRedirectUrl,
    userController.authenticateLocal,
    isLoggedIn,
    userController.login,
  );

router.get("/logout", userController.logout);

router.post("/verify/:id/resend", rateLimits.otp, verifyRecaptcha("verify"), userController.resendOtp);
router.get("/verify-email", userController.renderVerifyEmailForm);
router.post("/verify/:id", rateLimits.otp, verifyRecaptcha("verify"), userController.verifyEmail);

router.get("/profile", isLoggedIn, userController.profile);
router.post(
  "/profile/update",
  upload.none(),
  isLoggedIn,
  userController.updateProfile,
);
router.post(
  "/profile/change-password",
  isLoggedIn,
  userController.changePassword,
);


module.exports = router;
