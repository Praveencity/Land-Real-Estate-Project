const Complaint = require("../models/Complaint");
const User = require("../models/User");
const Property = require("../models/Property");
const Notification = require("../models/Notification");

// ── File a complaint ─────────────────────────────────────────────────────────
// Officer  → type:"property" + targetProperty
// User     → type:"officer"  + targetOfficer
const fileComplaint = async (req, res, next) => {
  try {
    const { type, title, description, targetProperty, targetOfficer } = req.body;
    const complainant = req.user;

    // Role-based validation
    if (type === "property" && complainant.role !== "Government Officer") {
      return res.status(403).json({ message: "Only Government Officers can file property complaints" });
    }
    if (type === "officer" && complainant.role !== "User") {
      return res.status(403).json({ message: "Only Users can file complaints against officers" });
    }

    // Target validation
    if (type === "property") {
      if (!targetProperty) return res.status(400).json({ message: "targetProperty is required" });
      const prop = await Property.findById(targetProperty);
      if (!prop) return res.status(404).json({ message: "Property not found" });
    }

    if (type === "officer") {
      if (!targetOfficer) return res.status(400).json({ message: "targetOfficer is required" });
      const officer = await User.findById(targetOfficer);
      if (!officer || officer.role !== "Government Officer") {
        return res.status(404).json({ message: "Government Officer not found" });
      }
    }

    const complaint = await Complaint.create({
      complainant: complainant._id,
      type,
      title,
      description,
      targetProperty: type === "property" ? targetProperty : undefined,
      targetOfficer: type === "officer" ? targetOfficer : undefined,
    });

    // Notify all Admins
    const admins = await User.find({ role: "Admin" }).select("_id");
    if (admins.length > 0) {
      const notifications = admins.map((admin) => ({
        user: admin._id,
        message: `New ${type} complaint filed by ${complainant.fullName}: "${title}"`,
        type: "warning",
      }));
      await Notification.insertMany(notifications);
    }

    return res.status(201).json({ message: "Complaint filed successfully", complaint });
  } catch (error) {
    next(error);
  }
};

// ── Get complaints ────────────────────────────────────────────────────────────
// Admin → all complaints
// Others → only their own
const getComplaints = async (req, res, next) => {
  try {
    const user = req.user;
    const { type, status } = req.query;

    const filter = {};
    if (user.role !== "Admin") filter.complainant = user._id;
    if (type) filter.type = type;
    if (status) filter.status = status;

    const complaints = await Complaint.find(filter)
      .populate("complainant", "fullName email role")
      .populate("targetProperty", "title location type")
      .populate("targetOfficer", "fullName email")
      .populate("resolvedBy", "fullName")
      .sort({ createdAt: -1 });

    return res.status(200).json({ complaints });
  } catch (error) {
    next(error);
  }
};

// ── Get single complaint ──────────────────────────────────────────────────────
const getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("complainant", "fullName email role")
      .populate("targetProperty", "title location type price")
      .populate("targetOfficer", "fullName email governmentId")
      .populate("resolvedBy", "fullName");

    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    // Only admin or the complainant can view
    if (req.user.role !== "Admin" && complaint.complainant._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.status(200).json({ complaint });
  } catch (error) {
    next(error);
  }
};

// ── Update complaint status (Admin only) ─────────────────────────────────────
const updateComplaintStatus = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    complaint.status = status;
    if (adminNotes !== undefined) complaint.adminNotes = adminNotes;

    if (["Resolved", "Dismissed"].includes(status)) {
      complaint.resolvedBy = req.user._id;
      complaint.resolvedAt = new Date();
    }

    await complaint.save();

    // Notify the complainant
    await Notification.create({
      user: complaint.complainant,
      message: `Your complaint "${complaint.title}" has been marked as ${status}.`,
      type: status === "Resolved" ? "success" : status === "Dismissed" ? "warning" : "info",
    });

    return res.status(200).json({ message: `Complaint marked as ${status}`, complaint });
  } catch (error) {
    next(error);
  }
};

module.exports = { fileComplaint, getComplaints, getComplaintById, updateComplaintStatus };
