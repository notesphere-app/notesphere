const User = require("../models/user");
const Contact = require("../models/contact");
const Subscriber = require("../models/subscriber");

module.exports.contact = async (req, res) => {
  try {
    const { name, email, subject, message, latitude, longitude } = req.body;

    await Contact.create({
      user: req.user?._id,
      name,
      email,
      subject,
      message,
      gps: {
        latitude,
        longitude,
      },
    });

    req.flash("success", "Message sent successfully");
    res.redirect("/contact");
  } catch (error) {
    console.log(error);
    req.flash("error", "Something went wrong!");
    res.redirect("/login");
  }
};

module.exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;

    // Basic validation
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check if already subscribed
    const existingUser = await Subscriber.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "This email is already subscribed",
      });
    }

    // Save new subscriber
    await Subscriber.create({ email });

    res.status(201).json({
      success: true,
      message: "Successfully subscribed to newsletter",
    });
  } catch (error) {
    console.error("Newsletter Error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again later.",
    });
  }
};

module.exports.carriers = async (req, res) => {
  res.render("others/careers.ejs");
};
