const express = require("express");
const router = express.Router();
const othersController = require("../controllers/others");

router.post("/contact", othersController.contact);
router.post("/subscribe", othersController.subscribe);
router.get("/careers", othersController.carriers);

module.exports = router;
