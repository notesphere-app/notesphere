const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, isAdmin, validateBlog } = require("../middleware.js");
const blogsController = require("../controllers/blog.js");

const multer = require("multer");

const { cloudinary, storage } = require("../Cloudconfig.js");
const upload = multer({ storage });

//blogs home route
router
  .route("/")
  .get(wrapAsync(blogsController.index))
  .post(
    isLoggedIn,
    isAdmin,
    upload.single("image"),
    validateBlog,
    wrapAsync(blogsController.createBlog),
  );

//create a blog
router.get("/new", isLoggedIn, isAdmin, blogsController.renderNewForm);

//you blogs
router.get(
  "/yourblogs",
  isLoggedIn,
  isAdmin,
  wrapAsync(blogsController.yourBlogs),
);

router
  .route("/:id")
  .get(wrapAsync(blogsController.showBlog))
  .put(
    isLoggedIn,
    isAdmin,
    upload.single("image"),
    validateBlog,
    wrapAsync(blogsController.updateBlog),
  )
  .delete(isLoggedIn, isAdmin, wrapAsync(blogsController.destroyBlog));

//Edit Route
router.get(
  "/:id/edit",
  isLoggedIn,
  isAdmin,
  wrapAsync(blogsController.renderEditForm),
);

router.get(
  "/:id/views",
  isLoggedIn,
  isAdmin,
  wrapAsync(blogsController.renderViewrsPage),
);

router.post("/:id/comments", isLoggedIn, wrapAsync(blogsController.addComment));

router.delete(
  "/:id/comments/:comment",
  isLoggedIn,
  wrapAsync(blogsController.deleteComment),
);

module.exports = router;
