const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Otp = require("../models/Otp");
const createToken = require("../utils/createToken");
const sendEmail = require("../utils/sendEmail");
const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");
const Property = require("../models/Property");
const Invitation = require("../models/Invitation");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const sendOtp = async (req, res, next) => {
  try {
    const { email, type } = req.body; // type: 'signup' or 'login'
    
    const existingUser = await User.findOne({ email });
    
    if (type === "signup" && existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    if (type === "login" && !existingUser) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Save to DB
    await Otp.deleteMany({ email });
    await Otp.create({ email, otp: otpCode });

    const subject = type === "login" ? "Login OTP - Land Registry System" : "Signup OTP - Land Registry System";
    const text = type === "login" 
      ? `Your One-Time Password (OTP) for logging in is: ${otpCode}. It is valid for 10 minutes.`
      : `Your One-Time Password (OTP) for signing up is: ${otpCode}. It is valid for 10 minutes.`;

    // Send email
    await sendEmail({ to: email, subject, text });

    console.log("----------------------------------------");
    console.log(`🔑 OTP (${type}) for ${email}: ${otpCode}`);
    console.log("----------------------------------------");

    return res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Error sending OTP:", error);
    if (error.code === "EAUTH") {
       return res.status(500).json({ message: "Email configuration error. Please check EMAIL_USER and EMAIL_PASS." });
    }
    next(error);
  }
};

const loginWithOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const validOtp = await Otp.findOne({ email, otp });
    if (!validOtp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Your account has been suspended" });
    }

    // Delete used OTP
    await Otp.deleteMany({ email });

    const token = createToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

const signup = async (req, res, next) => {
  try {
    const { fullName, email, password, role, governmentId, otp } = req.body;

    if (role === "Admin") {
      return res.status(403).json({ message: "Admin registration is restricted. Hardcoded only." });
    }

    // Verify OTP
    const validOtp = await Otp.findOne({ email, otp });
    if (!validOtp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      role: "User", // Force new registrations to be User. Admins must promote them.
      governmentId,
    });

    // Delete used OTP
    await Otp.deleteMany({ email });

    const token = createToken(user);

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

const googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;
    
    // Verify the Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;
    
    let user = await User.findOne({ email });
    let message = "Login successful";
    
    if (!user) {
      // Create new user automatically (they are already verified by Google)
      // We generate a random password since they login via Google
      const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(randomPassword, 12);
      
      // Assign Admin role only to the hardcoded admin email
      const assignedRole = "User";
      
      user = await User.create({
        fullName: name,
        email,
        password: hashedPassword,
        role: assignedRole,
      });
      message = "User registered and logged in successfully";
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Your account has been suspended. Contact the administrator." });
    }
    
    const token = createToken(user);

    return res.status(200).json({
      message,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(401).json({ message: "Invalid Google credential" });
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.password || typeof user.password !== "string") {
      return res.status(400).json({
        message:
          "This account is missing a password hash. Please reset password or re-register this account.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Your account has been suspended. Contact the administrator." });
    }

    const token = createToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res) => {
  return res.status(200).json({ user: req.user });
};

const logout = async (req, res) => {
  return res.status(200).json({ message: "Logout successful" });
};

const listUsers = async (req, res, next) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    return res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await Otp.deleteMany({ email });
    await Otp.create({ email, otp: otpCode });

    // Send email
    await sendEmail({
      to: email,
      subject: "Password Reset OTP - Land Registry System",
      text: `Your password reset OTP is: ${otpCode}. It is valid for 10 minutes. If you did not request this, please ignore this email.`,
    });

    console.log(`Password reset OTP for ${email}: ${otpCode}`);

    return res.status(200).json({ message: "Password reset OTP sent to your email" });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    // Verify OTP
    const validOtp = await Otp.findOne({ email, otp });
    if (!validOtp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    await Otp.deleteMany({ email });

    return res.status(200).json({ message: "Password reset successfully. You can now login with your new password." });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (req.user._id.toString() === userId) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "Admin") {
      return res.status(403).json({ message: "Cannot delete an Admin account" });
    }

    // Delete all properties owned by this user
    await Property.deleteMany({ owner: userId });

    await user.deleteOne();
    return res.status(200).json({ message: `User "${user.fullName}" and their properties deleted successfully` });
  } catch (error) {
    next(error);
  }
};

const changeUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (req.user._id.toString() === userId) {
      return res.status(400).json({ message: "You cannot change your own role" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "Admin") {
      return res.status(403).json({ message: "Cannot modify an Admin account" });
    }

    user.role = role;
    await user.save();

    return res.status(200).json({ message: `${user.fullName}'s role changed to ${role}` });
  } catch (error) {
    next(error);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (req.user._id.toString() === userId) {
      return res.status(400).json({ message: "You cannot suspend your own account" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "Admin") {
      return res.status(403).json({ message: "Cannot suspend an Admin account" });
    }

    user.isActive = !user.isActive;
    await user.save();

    const status = user.isActive ? "activated" : "suspended";
    return res.status(200).json({ message: `${user.fullName}'s account has been ${status}`, isActive: user.isActive });
  } catch (error) {
    next(error);
  }
};

const inviteOfficer = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    const assignedRole = role || "Government Officer";

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 hour expiry

    await Invitation.deleteMany({ email }); // Delete any old pending invites for this email
    await Invitation.create({
      email,
      token,
      invitedBy: req.user._id,
      expiresAt,
      role: assignedRole
    });

    const setupUrl = `${process.env.CLIENT_URL}/pages/invite.html?token=${token}`;

    console.log("----------------------------------------");
    console.log(`🎟️ ${assignedRole.toUpperCase()} INVITATION CREATED`);
    console.log(`Email: ${email}`);
    console.log(`Link: ${setupUrl}`);
    console.log("----------------------------------------");
    await sendEmail({
      to: email,
      subject: `Invitation to Join Land Registry System as ${assignedRole}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #0b2e59;">Land Registry System Invitation</h2>
          <p>You have been invited by an Administrator to join the platform as a <strong>${assignedRole}</strong>.</p>
          <p>Click the button below to set up your account. This link will expire in 48 hours.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setupUrl}" style="display: inline-block; padding: 12px 24px; background-color: #0b2e59; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Set Up Your Account</a>
          </div>
          <p style="color: #666; font-size: 0.9rem;">If the button above doesn't work, copy and paste this URL into your browser:</p>
          <p style="word-break: break-all; color: #0b2e59; font-size: 0.8rem;">${setupUrl}</p>
        </div>
      `,
    });

    return res.status(200).json({ message: "Invitation sent successfully" });
  } catch (error) {
    next(error);
  }
};

const setupOfficer = async (req, res, next) => {
  try {
    const { token, fullName, password, governmentId } = req.body;

    const invitation = await Invitation.findOne({ token });
    if (!invitation) {
      return res.status(400).json({ message: "Invalid or expired invitation token" });
    }

    const existingUser = await User.findOne({ email: invitation.email });
    if (existingUser) {
      await invitation.deleteOne();
      return res.status(400).json({ message: "User already exists with this email" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      fullName,
      email: invitation.email,
      password: hashedPassword,
      role: invitation.role || "Government Officer",
      governmentId,
    });

    await invitation.deleteOne();

    const authToken = createToken(user);

    return res.status(201).json({
      message: "Account created successfully",
      token: authToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
