require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const User = require("./models/User");
const bcrypt = require("bcryptjs");

const seedAdmin = async () => {
  try {
    const adminEmail = "landregistry3@gmail.com";
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin@1234!", 12);
      await User.create({
        fullName: "System Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "Admin",
        governmentId: "ADMIN-SYS-001",
        governmentIdStatus: "Verified"
      });
      console.log("Hardcoded Admin user created.");
    }
  } catch (err) {
    if (err.code === 11000) {
      console.log("Admin user already exists (duplicate key).");
    } else {
      console.error("Error seeding admin:", err.message);
    }
  }
};

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB();
    await seedAdmin();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
})();
