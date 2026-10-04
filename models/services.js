const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const serviceSchema = new Schema(
  {
    // 🔗 Relations
    farmer: {
      type: Schema.Types.ObjectId,
      ref: "Farmer",
      required: true,
    },

    animal: {
      type: Schema.Types.ObjectId,
      ref: "Animal",
      required: true,
    },

    paravet: {
      type: Schema.Types.ObjectId,
      ref: "Paravet",
      required: true,
    },

    // 🔹 Service Details
    serviceType: {
      type: String,
      enum: [
        "vaccination",
        "treatment",
        "health_check",
        "deworming",
        "artificial_insemination",
        "other",
      ],
      required: true,
    },

    serviceName: {
      type: String,
      required: true,
      // Example: FMD Vaccine, HS Vaccine, General Checkup
    },

    description: {
      type: String,
    },

    // 🔹 Dates
    serviceDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    nextDueDate: {
      type: Date,
    },

    // 🔹 Status Tracking
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled"],
      default: "completed",
    },

    // 🔹 Cost (optional but future-ready)
    cost: {
      type: Number,
      default: 0,
    },

    // 🔹 Proof & Documentation
    photos: [
      {
        type: String, // image URL / path
      },
    ],

    // 🔹 Location snapshot (important for govt / NGO)
    location: {
      village: String,
      taluka: String,
      district: String,
      state: String,
      gps: {
        latitude: Number,
        longitude: Number,
      },
    },

    // 🔹 Audit & Metadata
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User", // admin / paravet
      required: true,
    },

    recordedByRole: {
      type: String,
      enum: ["admin", "paravet"],
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Service", serviceSchema);
