const express = require("express");
const {
  raiseComplaint,
  getMyComplaints,
  getAdminComplaints,
  submitReport,
  forwardComplaint,
} = require("../controllers/complaintController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, authorize("Admin"), raiseComplaint);
router.get("/me", protect, getMyComplaints);
router.get("/admin", protect, authorize("Admin"), getAdminComplaints);
router.put("/:id/report", protect, submitReport);
router.put("/:id/forward", protect, forwardComplaint);

module.exports = router;
