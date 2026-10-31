const express = require("express");
const router = express.Router();
const { isLoggedIn, isAdmin } = require("../middleware");
const adminController = require("../controllers/admin.js");
const courseAdminController = require("../controllers/courseAdmin.js");
const campusAdminController = require("../controllers/campusAdmin.js");
const multer = require("multer");

const { cloudinary, storage } = require("../Cloudconfig.js");
const upload = multer({ storage });

router.get("/dashboard", isLoggedIn, isAdmin, adminController.adminDashboard);
router.get("/downloads", isLoggedIn, isAdmin, adminController.downloads);
router.get("/contributions", isLoggedIn, isAdmin, adminController.contributions);
router.get("/auth-activity", isLoggedIn, isAdmin, adminController.authActivity);
router.get("/users", isLoggedIn, isAdmin, adminController.listUsers);
router.patch("/users/:id", isLoggedIn, isAdmin, adminController.updateUser);
router.get("/users/:id", isLoggedIn, isAdmin, adminController.userDetails);
// router.route("/login").get(userController.renderLoginForm);
router.get("/", isLoggedIn, isAdmin, adminController.index);
router.get(
  "/contacts",
  isLoggedIn,
  isAdmin,
  adminController.contactSubmissions,
);
router.get(
  "/contacts/:id/details",
  isLoggedIn,
  isAdmin,
  adminController.getContactDetails,
);
router.patch(
  "/contacts/:id/toggle-seen",
  isLoggedIn,
  isAdmin,
  adminController.toggleSeen,
);
router.delete(
  "/contacts/:id",
  isLoggedIn,
  isAdmin,
  adminController.deleteContact,
);

router.get("/subscribers", isLoggedIn, isAdmin, adminController.subscribers);
router.post(
  "/subscribers",
  isLoggedIn,
  isAdmin,
  adminController.createSubscriber,
);
router.post(
  "/subscribers/bulk-action",
  isLoggedIn,
  isAdmin,
  adminController.bulkAction,
);
router.get(
  "/subscribers/export",
  isLoggedIn,
  isAdmin,
  adminController.exportSubscribers,
);
router.patch(
  "/subscribers/:id/toggle-status",
  isLoggedIn,
  isAdmin,
  adminController.toggleStatus,
);
router.delete(
  "/subscribers/:id",
  isLoggedIn,
  isAdmin,
  adminController.deleteSubscriber,
);

router.get("/courses", isLoggedIn, isAdmin, courseAdminController.listCourses);
router.post("/courses", isLoggedIn, isAdmin, courseAdminController.saveCourse);
router.post("/courses/:id", isLoggedIn, isAdmin, courseAdminController.saveCourse);
router.post("/courses/:id/toggle", isLoggedIn, isAdmin, courseAdminController.toggleCourse);
router.post("/courses/:id/delete", isLoggedIn, isAdmin, courseAdminController.deleteCourse);
router.patch("/courses/:id", isLoggedIn, isAdmin, courseAdminController.saveCourse);
router.patch("/courses/:id/toggle", isLoggedIn, isAdmin, courseAdminController.toggleCourse);
router.delete("/courses/:id", isLoggedIn, isAdmin, courseAdminController.deleteCourse);
router.get("/universities", isLoggedIn, isAdmin, campusAdminController.list);
router.post("/universities", isLoggedIn, isAdmin, campusAdminController.createUniversity);
router.post("/universities/:id", isLoggedIn, isAdmin, campusAdminController.updateUniversity);
router.post("/universities/:id/delete", isLoggedIn, isAdmin, campusAdminController.deleteUniversity);
router.patch("/universities/:id", isLoggedIn, isAdmin, campusAdminController.updateUniversity);
router.delete("/universities/:id", isLoggedIn, isAdmin, campusAdminController.deleteUniversity);
router.post("/colleges", isLoggedIn, isAdmin, campusAdminController.createCollege);
router.post("/colleges/:id", isLoggedIn, isAdmin, campusAdminController.updateCollege);
router.post("/colleges/:id/delete", isLoggedIn, isAdmin, campusAdminController.deleteCollege);
router.patch("/colleges/:id", isLoggedIn, isAdmin, campusAdminController.updateCollege);
router.delete("/colleges/:id", isLoggedIn, isAdmin, campusAdminController.deleteCollege);
router.get("/notes", isLoggedIn, isAdmin, courseAdminController.listNotes);
router.patch("/notes/:id", isLoggedIn, isAdmin, courseAdminController.updateNote);
router.patch("/notes/:id/moderate", isLoggedIn, isAdmin, courseAdminController.moderateNote);
router.delete("/notes/:id", isLoggedIn, isAdmin, courseAdminController.deleteNote);

module.exports = router;
