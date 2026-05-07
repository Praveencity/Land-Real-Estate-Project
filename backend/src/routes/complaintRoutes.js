const express = require("express");
const { body } = require("express-validator");
const { fileComplaint, getComplaints, getComplaintById, updateComplaintStatus } = require("../controllers/complaintController");
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");

const router = express.Router();

// File a complaint — Officer (property) or User (officer)
router.post(
  "/",
  protect,
  authorize("Government Officer", "User"),
  [
    body("type").isIn(["property", "officer"]).withMessage("Type must be 'property' or 'officer'"),
    body("title").trim().notEmpty().withMessage("Title is required").isLength({ max: 150 }),
    body("description").trim().notEmpty().withMessage("Description is required").isLength({ max: 2000 }),
  ],
  validate,
  fileComplaint
);

// Get complaints — admin sees all, others see own
router.get("/", protect, getComplaints);

// Get single complaint
router.get("/:id", protect, getComplaintById);

// Admin updates complaint status
router.patch(
  "/:id/status",
  protect,
  authorize("Admin"),
  [
    body("status")
      .isIn(["Pending", "Under Review", "Resolved", "Dismissed"])
      .withMessage("Invalid status"),
  ],
  validate,
  updateComplaintStatus
);

module.exports = router;
