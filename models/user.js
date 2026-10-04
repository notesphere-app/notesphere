const mongoose = require("mongoose");
const passportLocalMongoose =
  require("passport-local-mongoose").default ||
  require("passport-local-mongoose");

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      unique: true,
      sparse: true,
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "user", "teacher"],
      default: "user",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
      default: "",
      trim: true,
    },
    avatarPublicId: {
      type: String,
      default: "",
      trim: true,
    },
    avatarSource: {
      type: String,
      enum: ["google", "upload", "default"],
      default: "default",
    },
    authMethod: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationTokenExpires: Date,

    otp: String,
    otpExpires: Date,

    resetPasswordToken: String,
    resetPasswordExpires: Date,
  },
  {
    timestamps: true,
  },
);
// Passport-local plugin
userSchema.plugin(passportLocalMongoose, {
  usernameField: "email",
  limitAttempts: true,
  maxAttempts: 3,
  interval: 100,
  maxInterval: 300000,
  unlockInterval: 60000,
  errorMessages: {
    MissingPasswordError: "No password was given",
    AttemptTooSoonError: "Account is currently locked. Try again later",
    TooManyAttemptsError:
      "Too many unsuccessful login attempts. Please try again in 5 minutes.",
    NoSaltValueStoredError: "Authentication failed. No salt value stored",
    IncorrectPasswordError: "Invalid email or password",
    IncorrectUsernameError: "Invalid email or password",
    MissingUsernameError: "Email is required",
    UserExistsError: "This email is already registered!",
  },
});

module.exports = mongoose.model("User", userSchema);
