const express = require("express");
const { body } = require("express-validator");
const {
  signup,
  login,
  getMe,
  logout,
  listUsers,
  deleteUser,
  changeUserRole,
  toggleUserStatus,
  sendOtp,
  loginWithOtp,
  googleAuth,
  forgotPassword,
  resetPassword,
  inviteOfficer,
  setupOfficer
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");

const router = express.Router();

router.post("/send-otp", [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail()
], validate, sendOtp);

router.post("/google", [
  body("credential").notEmpty().withMessage("Google credential is required")
], validate, googleAuth);

router.post("/forgot-password", [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail()
], validate, forgotPassword);

router.post("/reset-password", [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("otp").notEmpty().withMessage("OTP is required"),
  body("newPassword").isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
], validate, resetPassword);

router.post(
  "/signup",
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required"),
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Password must be at least 8 characters"),
    body("otp").notEmpty().withMessage("OTP is required"),
    body("role")
      .optional()
      .isIn(["Admin", "User", "Government Officer"])
      .withMessage("Invalid role"),
  ],
  validate,
  signup
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  validate,
  login
);

router.post(
  "/login-otp",
  [
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("otp").notEmpty().withMessage("OTP is required"),
  ],
  validate,
  loginWithOtp
);

router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.get("/users", protect, authorize("Admin", "Government Officer"), listUsers);
router.delete("/users/:userId", protect, authorize("Admin"), deleteUser);
router.patch("/users/:userId/role", protect, authorize("Admin"), [
  body("role").isIn(["User", "Government Officer"]).withMessage("Role must be User or Government Officer")
], validate, changeUserRole);
router.patch("/users/:userId/status", protect, authorize("Admin"), toggleUserStatus);

router.post("/invite-officer", protect, authorize("Admin"), [
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail()
], validate, inviteOfficer);

router.get("/invite/:token", async (req, res) => {
  try {
    const invitation = await require("../models/Invitation").findOne({ token: req.params.token });
    if (!invitation) return res.status(404).json({ message: "Invitation not found or expired" });
    res.status(200).json({ email: invitation.email, role: invitation.role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/setup-officer", [
  body("token").notEmpty().withMessage("Token is required"),
  body("fullName").trim().notEmpty().withMessage("Full name is required"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  body("governmentId").trim().notEmpty().withMessage("Government ID is required")
], validate, setupOfficer);

module.exports = router;
