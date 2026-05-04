require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
const url = require("url");

async function checkDatabaseConnection() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("❌ MONGO_URI is not defined in .env");
    process.exit(1);
  }

  console.log("🔍 Testing MongoDB Connection...");
  console.log("URI Format:", uri.startsWith("mongodb+srv") ? "SRV Cluster" : "Standard Connection");

  // Step 1: Check DNS resolution if SRV
  if (uri.startsWith("mongodb+srv://")) {
    try {
      const parsedUrl = new url.URL(uri);
      const hostname = parsedUrl.hostname;
      console.log(`\n📡 Step 1: Checking DNS resolution for ${hostname}...`);
      
      const records = await dns.promises.resolveSrv(`_mongodb._tcp.${hostname}`);
      console.log("✅ DNS Resolution successful. Found cluster nodes:", records.map(r => r.name).join(", "));
    } catch (err) {
      console.error("❌ DNS Resolution failed. This usually means:");
      console.error("   1. Your MongoDB Atlas Free Cluster has been PAUSED. Go to Atlas and click 'Resume'.");
      console.error("   2. You have a local internet/DNS issue blocking SRV queries.");
      console.error(`   Error details: ${err.message}`);
      process.exit(1);
    }
  }

  // Step 2: Test actual connection
  console.log("\n🔗 Step 2: Attempting to connect to the database...");
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("✅ Connection Successful! Your IP is whitelisted and the cluster is active.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Connection Failed.");
    if (err.message.includes("bad auth") || err.message.includes("Authentication failed")) {
      console.error("   Reason: Incorrect Username or Password in MONGO_URI.");
    } else if (err.message.includes("serverSelectionTimeout")) {
      console.error("   Reason: Connection timed out. This almost ALWAYS means your current IP Address is NOT whitelisted in MongoDB Atlas.");
    } else {
      console.error(`   Reason: ${err.message}`);
    }
    process.exit(1);
  }
}

checkDatabaseConnection();
