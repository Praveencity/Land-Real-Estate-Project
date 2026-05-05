const Complaint = require("../models/Complaint");
const Property = require("../models/Property");
const User = require("../models/User");
const Notification = require("../models/Notification");

// @desc    Raise a complaint against a property
// @route   POST /api/complaints
// @access  Admin
exports.raiseComplaint = async (req, res) => {
  try {
    const { propertyId, recipientId, description } = req.body;

    // Validate property
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Validate recipient
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    const complaint = await Complaint.create({
      property: propertyId,
      admin: req.user.id,
      recipient: recipientId,
      description,
      assignmentHistory: [{
        from: req.user.id,
        to: recipientId,
        note: "Initial assignment"
      }]
    });

    // Create notification for recipient
    await Notification.create({
      recipient: recipientId,
      message: `A new property complaint/alert has been raised for: ${property.title}. Please review.`,
      type: "warning",
      relatedId: complaint._id,
    });

    res.status(201).json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forward a complaint to another officer
// @route   PUT /api/complaints/:id/forward
// @access  Admin, Government Officer
exports.forwardComplaint = async (req, res) => {
  try {
    const { nextRecipientId, note } = req.body;
    const complaint = await Complaint.findById(req.params.id).populate("property");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Authorization: Only admin or the current recipient can forward
    const currentRecipientId = complaint.recipient.toString();
    const isAdmin = req.user.role === "Admin";
    if (!isAdmin && currentRecipientId !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to forward this complaint" });
    }

    // Validate next recipient
    const nextRecipient = await User.findById(nextRecipientId);
    if (!nextRecipient) {
      return res.status(404).json({ message: "Next recipient not found" });
    }

    // Update complaint
    complaint.assignmentHistory.push({
      from: req.user.id,
      to: nextRecipientId,
      note
    });
    complaint.recipient = nextRecipientId;
    complaint.status = "Forwarded";
    await complaint.save();

    // Notify next recipient
    await Notification.create({
      recipient: nextRecipientId,
      message: `A complaint for property: ${complaint.property.title} has been forwarded to you.`,
      type: "info",
      relatedId: complaint._id,
    });

    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all complaints for a recipient (User or Officer)
// @route   GET /api/complaints/me
// @access  Private
exports.getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ recipient: req.user.id })
      .populate("property")
      .populate("admin", "fullName email");
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all complaints for admin
// @route   GET /api/complaints/admin
// @access  Admin
exports.getAdminComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("property")
      .populate("recipient", "fullName email role")
      .populate("admin", "fullName email");
    res.json(complaints);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit report for a complaint
// @route   PUT /api/complaints/:id/report
// @access  Private
exports.submitReport = async (req, res) => {
  try {
    const { content } = req.body;
    const complaint = await Complaint.findById(req.params.id).populate("property");

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (complaint.recipient.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    complaint.report = {
      content,
      submittedAt: Date.now(),
    };
    complaint.status = "Resolved";
    await complaint.save();

    // Create notification for admin
    await Notification.create({
      recipient: complaint.admin,
      message: `A report has been submitted for property: ${complaint.property.title}`,
      type: "success",
      relatedId: complaint._id,
    });

    res.json(complaint);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
