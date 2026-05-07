const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    complainant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // "property" = officer filing against a suspicious property
    // "officer"  = user filing against a government officer
    type: {
      type: String,
      enum: ["property", "officer"],
      required: true,
    },
    // Populated when type === "property"
    targetProperty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
    },
    // Populated when type === "officer"
    targetOfficer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["Pending", "Under Review", "Resolved", "Dismissed"],
      default: "Pending",
    },
    adminNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: Date,
  },
  { timestamps: true }
);

complaintSchema.index({ complainant: 1, status: 1 });
complaintSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model("Complaint", complaintSchema);
