import { storage } from "./storage";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Check if admin user already exists
    const existingAdmin = await storage.getUserByUsername("Admin");
    
    if (existingAdmin) {
      console.log("✅ Admin user already exists, skipping seed");
      return;
    }

    // Create default admin user
    const admin = await storage.createUser(
      "Admin",
      "Nogooms12",
      "Ahmed Mabrok",
      "dr_ahmed_sami@hotmail.com",
      "Director",
      "Starts12"
    );

    console.log("✅ Created default admin user:", {
      userId: admin.userId,
      username: admin.username,
      name: admin.name,
      email: admin.email,
      position: admin.position,
    });

    console.log("\n🎉 Database seeding complete!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("✅ Seed completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  });
