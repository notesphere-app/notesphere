const express = require("express");
const router = express.Router();
const { isLoggedIn } = require("../middleware");
const wrapAsync = require("../utils/wrapAsync");
const notesController = require("../controllers/notes");
const { rateLimits } = require("../utils/security");

router.get("/", wrapAsync(notesController.index));
router.get("/new", isLoggedIn, notesController.newForm);
router.get("/mine", isLoggedIn, wrapAsync(notesController.mine));
router.get("/courses/:id", wrapAsync(notesController.courseOptions));
router.post("/", isLoggedIn, wrapAsync(notesController.create));
router.get("/:id/edit", isLoggedIn, wrapAsync(notesController.editForm));
router.put("/:id", isLoggedIn, wrapAsync(notesController.update));
router.delete("/:id", isLoggedIn, wrapAsync(notesController.destroy));
router.post("/:id/like", isLoggedIn, wrapAsync(notesController.toggleLike));
router.post("/:id/save", isLoggedIn, wrapAsync(notesController.toggleSave));
router.post("/:id/comments", isLoggedIn, wrapAsync(notesController.addComment));
router.get("/:id/download", rateLimits.download, wrapAsync(notesController.download));
router.post("/:id/download", rateLimits.download, wrapAsync(notesController.confirmDownload));
router.get("/:id/download/open", rateLimits.download, wrapAsync(notesController.openDownload));
router.get("/:id", wrapAsync(notesController.show));

module.exports = router;
