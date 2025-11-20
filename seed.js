require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@test.com";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error("Error: ADMIN_PASSWORD must be set in .env");
    process.exit(1);
  }

  // Create superadmin if doesn't exist
  const existing = await User.findOne({ username: adminUsername });
  if (!existing) {
    await User.create({
      username: adminUsername,
      email: adminEmail,
      password: adminPassword,
      role: "superadmin",
    });
    console.log(`Superadmin created: ${adminUsername}`);
  } else {
    console.log("Superadmin already exists");
  }

  await mongoose.disconnect();
}

seed().catch(console.error);
