const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false,
    },
    role: {
      type: String,
      enum: ["Admin", "User", "Government Officer"],
      default: "User",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    governmentId: {
      type: String,
      trim: true,
      select: false,
    },
    governmentIdStatus: {
      type: String,
      enum: ["Pending", "Verified", "Rejected", "None"],
      default: "None",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
