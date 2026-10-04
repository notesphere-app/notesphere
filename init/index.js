const mongoose = require("mongoose");
const User = require("../models/user.js");
const Contact = require("../models/contact.js");
const Cources = require("../models/cources.js");
const Certificate = require("../models/certification.js");
const Subscriber = require("../models/subscriber.js");
const { subscribe } = require("../controllers/others.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/rootshield";

main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log(err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

const initDB = async () => {
  try {
    // const user = await User.findOneAndUpdate({email: "saurabhmishra230139@gmail.com"}, {role:"admin"},{ new: true });
    // console.log(user);
    // const users = await User.findOneAndDelete({
    //   email: "thecubicals123@gmail.com",
    // });
    // console.log("Admin user removed", users);
    // const subscribers = await Subscriber.find();
    // console.log(subscribers);
    const result = await Certificate.deleteMany({});
    console.log("Certificates removed:", result);
  } catch {
    console.log("Error in checking admin user");
  }
};

initDB();
