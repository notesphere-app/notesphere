const express = require("express");
const router = express.Router();
const homeController = require("../controllers/home.js");
const { isLoggedIn, isAdmin, saveRedirectUrl } = require("../middleware");
const multer = require("multer");
const { storage } = require("../Cloudconfig.js");
const upload = multer({ storage });

router
  .route("/")
  .get(homeController.homePage)
  .get(isLoggedIn, homeController.index);
router.get("/profile", isLoggedIn, homeController.profile);

router.get("/about", homeController.about);
router.get("/privacy", homeController.privacy);
router.get("/terms", homeController.terms);
router.get("/contact", homeController.contact);

module.exports = router;
