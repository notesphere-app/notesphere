const express = require("express");
const router = express.Router();
const homeController = require("../controllers/home.js");

router.get("/", homeController.homePage);

router.get("/about", homeController.about);
router.get("/privacy", homeController.privacy);
router.get("/terms", homeController.terms);
router.get("/cookies", homeController.cookies);
router.get("/contact", homeController.contact);

module.exports = router;
