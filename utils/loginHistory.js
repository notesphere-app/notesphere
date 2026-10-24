const User = require("../models/user");
const { getDeviceDetails, hashIp } = require("./requestMetadata");

module.exports = async function recordLogin(user, req, method) {
  await User.updateOne(
    { _id: user._id },
    {
      $push: {
        loginHistory: {
          $each: [
            {
              loggedInAt: new Date(),
              method,
              ipHash: hashIp(req.ip),
              device: getDeviceDetails(req.get("user-agent") || "").category,
            },
          ],
          $slice: -10,
        },
      },
    },
  );
};
