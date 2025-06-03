
import { storage } from "./storage";

export async function seedDefaultUsers() {
  try {
    // Check if any users exist
    const existingUsers = await storage.getAllUsers();
    
    if (existingUsers.length === 0) {
      // Create a default superadmin user
      const defaultUser = {
        id: "admin001",
        email: "admin@hotel.com",
        password: "admin123", // Change this in production!
        firstName: "System",
        lastName: "Administrator",
        role: "superadmin" as const,
        branchId: null, // Superadmin can access all branches
        isActive: true,
      };

      await storage.upsertUser(defaultUser);
      console.log("✅ Default admin user created:");
      console.log("Email: admin@hotel.com");
      console.log("Password: admin123");
      console.log("Role: superadmin");
    } else {
      console.log("Users already exist in the database");
    }
  } catch (error) {
    console.error("Error seeding users:", error);
  }
}
