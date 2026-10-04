if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const path = require("path");
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const crypto = require("crypto");
const passport = require("passport");
const brevo = require("@getbrevo/brevo");
const { welComeEmail } = require("./utils/sendWelcomeEmail");

const GoogleStrategy = require("passport-google-oauth20").Strategy;
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const homeRouter = require("./routes/home.js");
const userRouter = require("./routes/user.js");
const resetRout = require("./routes/authRoutes.js");
const user = require("./models/user.js");
const adminRouter = require("./routes/admin.js");
const othersRouter = require("./routes/others.js");
const blogRouter = require("./routes/blog.js");
const notesRouter = require("./routes/notes.js");
const sitemapRouter = require("./routes/sitemap.js");
const seoMeta = require("./utils/seoMeta.json");

const dbUrl = process.env.ATLUSDB_URL;

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(dbUrl);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET,
  },
  touchAfter: 24 * 3600,
});

store.on("error", (err) => {
  console.log("error in mongo session store", err);
});

const sessionOptions = {
  store,
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    expire: Date.now() + 7 * 24 * 60 * 60 * 1000,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOptions));
app.use(flash());

// app.use(cookieParser());
// app.use(csrf({ cookie: true }));

// app.use((req, res, next) => {
//   res.locals.csrfToken = req.csrfToken ? req.csrfToken() : "";
//   next();
// });

app.use(passport.initialize());
app.use(passport.session());
passport.use(
  new LocalStrategy({ usernameField: "email" }, User.authenticate()),
);

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.DOMAIN + "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const name = profile.displayName;

        // Google profile photo — bump resolution for a crisper avatar
        const rawPhoto =
          (profile.photos && profile.photos[0] && profile.photos[0].value) || "";
        const highResPhoto = rawPhoto
          ? rawPhoto.replace(/=s\d+(-c)?$/, "=s512-c")
          : "";

        let existingUser = await User.findOne({ email });

        /* ---------- EXISTING USER ---------- */
        if (existingUser) {
          let changed = false;

          // Link Google account if not already linked
          if (!existingUser.googleId) {
            existingUser.googleId = profile.id;
            existingUser.authMethod = existingUser.authMethod || "google";
            changed = true;
          }

          // Fill avatar ONLY if user doesn't already have one.
          // Never overwrite an uploaded avatar.
          if (!existingUser.avatar && highResPhoto) {
            existingUser.avatar = highResPhoto;
            existingUser.avatarSource = "google";
            changed = true;
          }

          if (changed) await existingUser.save();
          return done(null, existingUser);
        }

        /* ---------- NEW USER ---------- */
        const username = email.split("@")[0];

        const newUser = new User({
          name,
          email,
          username,
          googleId: profile.id,
          isVerified: true,
          authMethod: "google",
          avatar: highResPhoto || "",
          avatarSource: highResPhoto ? "google" : "default",
        });

        await newUser.save();

        try {
          await welComeEmail({ name: newUser.name, email: newUser.email });
        } catch (mailErr) {
          console.error("Welcome email failed:", mailErr);
        }

        return done(null, newUser);
      } catch (err) {
        console.error("Google OAuth Error:", err);
        return done(err, null);
      }
    },
  ),
);

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.info = req.flash("info");
  res.locals.warning = req.flash("warning");
  res.locals.primary = req.flash("primary");
  res.locals.currUser = req.user || null;
  res.locals.currentPath = req.path;
  res.locals.showsplash = false;
  next();
});

app.use((req, res, next) => {
  let meta = seoMeta[req.path];

  if (!meta) {
    if (req.path.startsWith("/blogs")) meta = seoMeta["/blogs"];
    else meta = seoMeta["/"];
  }

  res.locals.meta = meta;
  next();
});

app.use((req, res, next) => {
  res.locals.requestUrl =
    req.protocol + "://" + "notesphere.in" + req.originalUrl;
  next();
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (req, res) => {
    req.flash("success", "Welcome back to Notesphere!");
    res.redirect("/");
  },
);

app.use("/", userRouter);
app.use("/", homeRouter);
app.use("/", resetRout);
app.use("/", othersRouter);
app.use("/", sitemapRouter);
app.use("/blogs", blogRouter);
app.use("/admin", adminRouter);
app.use("/notes", notesRouter);
app.all(/.*/, (req, res, next) => {
  next(new ExpressError(404, "Page not found!"));
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err); // agar response already sent ho, dobara send mat karo
  }
  let { statusCode = 500, message = "Something went wrong!" } = err;
  res.status(statusCode).render("error.ejs", { message, statusCode });
});

app.listen(3000, () => {
  console.log(`Notesphere is working at ${3000}`);
});
