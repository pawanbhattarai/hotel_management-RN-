import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { restaurantStorage } from "./restaurant-storage";
import { inventoryStorage } from "./inventory-storage";
import { dishIngredientsStorage } from "./dish-ingredients-storage";
import { roleStorage } from "./role-storage";
import { NotificationService } from "./notifications";
import {
  insertBranchSchema,
  insertRoomSchema,
  insertRoomTypeSchema,
  insertGuestSchema,
  insertReservationSchema,
  insertReservationRoomSchema,
  insertUserSchema,
  insertHotelSettingsSchema,
  insertPushSubscriptionSchema,
  insertRestaurantTableSchema,
  insertMenuCategorySchema,
  insertMenuDishSchema,
  insertRestaurantOrderSchema,
  insertRestaurantOrderItemSchema,
  insertRestaurantBillSchema,
  insertTaxSchema,
  updateTaxSchema,
  insertMeasuringUnitSchema,
  insertStockCategorySchema,
  insertSupplierSchema,
  insertStockItemSchema,
  insertStockConsumptionSchema,
  insertDishIngredientSchema,
} from "@shared/schema";
import { QRService } from "./qr-service";
import { z } from "zod";
import { broadcastChange } from "./middleware/websocket";
import { enforceBranchIsolation, getBranchFilter, canAccessBranch } from "./middleware/branchIsolation";

// Helper function to check user permissions based on role and branch
function checkBranchPermissions(
  userRole: string,
  userBranchId: number | null,
  targetBranchId?: number,
): boolean {
  if (userRole === "superadmin") {
    return true;
  }

  if (!targetBranchId) return true; // For operations that don't specify a branch

  if (userRole === "branch-admin") {
    return userBranchId === targetBranchId;
  }

  return false;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Import session with ES6 syntax
  const session = (await import('express-session')).default;

  // Auth middleware for session handling
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset maxAge on every request
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days - persistent until logout
    },
  }));

  // Custom auth middleware
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.session && req.session.user) {
      req.user = req.session.user; // Add user to request object
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  };

  // Combined auth and branch isolation middleware
  const requireAuthWithBranchIsolation = [isAuthenticated, enforceBranchIsolation];

  // Auth routes
  app.post("/api/auth/login", async (req: any, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Get user by email
      const user = await storage.getUserByEmail(email);

      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // In a real application, you would hash and compare passwords
      // For now, we'll use a simple comparison (NOT SECURE - implement proper password hashing)
      if (user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session
      req.session.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        branchId: user.branchId
      };

      res.json({ 
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          branchId: user.branchId
        }
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req: any, res) => {
    req.session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Branch routes
  app.get("/api/branches", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branches = await storage.getBranches();

      // Filter branches based on user role
      if (user.role === "superadmin") {
        res.json(branches);
      } else {
        const userBranch = branches.filter((b) => b.id === user.branchId);
        res.json(userBranch);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ message: "Failed to fetch branches" });
    }
  });

  app.post("/api/branches", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const branchData = insertBranchSchema.parse(req.body);
      const branch = await storage.createBranch(branchData);
      broadcastChange('branches', 'created', branch); // Broadcast change
      res.status(201).json(branch);
    } catch (error) {
      console.error("Error creating branch:", error);
      res.status(500).json({ message: "Failed to create branch" });
    }
  });

  app.put("/api/branches/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const branchId = parseInt(req.params.id);
      const branchData = insertBranchSchema.partial().parse(req.body);
      const branch = await storage.updateBranch(branchId, branchData);
      broadcastChange('branches', 'updated', branch); // Broadcast change
      res.json(branch);
    } catch (error) {
      console.error("Error updating branch:", error);
      res.status(500).json({ message: "Failed to update branch" });
    }
  });

  app.delete("/api/branches/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const branchId = parseInt(req.params.id);
      await storage.updateBranch(branchId, { isActive: false });
      broadcastChange('branches', 'deleted', { id: branchId }); // Broadcast change
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting branch:", error);
      res.status(500).json({ message: "Failed to delete branch" });
    }
  });

  // User management routes
  app.get("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const users = await storage.getAllUsersWithCustomRoles();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { customRoleIds, ...userData } = req.body;
      const validatedUserData = insertUserSchema.parse(userData);
      const newUser = await storage.upsertUser(validatedUserData);

      // Handle custom role assignments
      if (customRoleIds && customRoleIds.length > 0) {
        await roleStorage.assignRolesToUser(newUser.id, customRoleIds);
      }

      // Get user with custom roles for response
      const userWithRoles = await storage.getUserWithCustomRoles(newUser.id);

      broadcastChange('users', 'created', userWithRoles); // Broadcast change
      res.status(201).json(userWithRoles);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const userId = req.params.id;
      const { customRoleIds, ...userData } = req.body;
      const validatedUserData = insertUserSchema.partial().parse(userData);
      const updatedUser = await storage.updateUser(userId, validatedUserData);

      // Handle custom role assignments
      if (customRoleIds !== undefined) {
        await roleStorage.assignRolesToUser(userId, customRoleIds);
      }

      // Get user with custom roles for response
      const userWithRoles = await storage.getUserWithCustomRoles(userId);

      broadcastChange('users', 'updated', userWithRoles); // Broadcast change
      res.json(userWithRoles);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const userId = req.params.id;
      await storage.updateUser(userId, { isActive: false });
      broadcastChange('users', 'deleted', { id: userId }); // Broadcast change
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Room routes
  app.get("/api/rooms", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        console.error("❌ User not found during rooms fetch");
        return res.status(401).json({ message: "User not found" });
      }

      const { branchId: queryBranchId, status } = req.query;
      let branchId = user.role === "superadmin" ? 
        (queryBranchId ? parseInt(queryBranchId as string) : undefined) : 
        user.branchId!;

      console.log("🔍 Fetching rooms with filters:", { 
        branchId, 
        status, 
        userRole: user.role,
        queryBranchId: queryBranchId 
      });

      // Validate branchId if provided
      if (queryBranchId && isNaN(parseInt(queryBranchId as string))) {
        console.error("❌ Invalid branchId provided:", queryBranchId);
        return res.status(400).json({ message: "Invalid branch ID" });
      }

      const rooms = await storage.getRooms(branchId, status as string);
      console.log("✅ Rooms found:", rooms?.length || 0);
      
      // Ensure we always return a valid JSON response
      const response = rooms || [];
      res.status(200).json(response);
    } catch (error) {
      console.error("❌ Error fetching rooms:", error);
      // Make sure we return JSON even on error
      res.status(500).json({ 
        message: "Failed to fetch rooms",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/rooms", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || !["superadmin", "branch-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const roomData = insertRoomSchema.parse(req.body);

      if (
        !checkBranchPermissions(user.role, user.branchId, roomData.branchId)
      ) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions for this branch" });
      }

      const room = await storage.createRoom(roomData);
      broadcastChange('rooms', 'created', room); // Broadcast change
      res.status(201).json(room);
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.put("/api/rooms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || !["superadmin", "branch-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const roomId = parseInt(req.params.id);
      const roomData = insertRoomSchema.partial().parse(req.body);

      // Check if user has permission for the room's branch
      const existingRoom = await storage.getRoom(roomId);
      if (
        !existingRoom ||
        !checkBranchPermissions(user.role, user.branchId, existingRoom.branchId)
      ) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions for this room" });
      }

      const room = await storage.updateRoom(roomId, roomData);
      broadcastChange('rooms', 'updated', room); // Broadcast change
      res.json(room);
    } catch (error) {
      console.error("Error updating room:", error);
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  app.delete("/api/rooms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || !["superadmin", "branch-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const roomId = parseInt(req.params.id);

      // Check if user has permission for the room's branch
      const existingRoom = await storage.getRoom(roomId);
      if (
        !existingRoom ||
        !checkBranchPermissions(user.role, user.branchId, existingRoom.branchId)
      ) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions for this room" });
      }

      await storage.updateRoom(roomId, { isActive: false });
      broadcastChange('rooms', 'deleted', { id: roomId }); // Broadcast change
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting room:", error);
      res.status(500).json({ message: "Failed to delete room" });
    }
  });

  app.patch("/api/rooms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const roomId = parseInt(req.params.id);
      const existingRoom = await storage.getRoom(roomId);

      if (!existingRoom) {
        return res.status(404).json({ message: "Room not found" });
      }

      if (
        !checkBranchPermissions(user.role, user.branchId, existingRoom.branchId)
      ) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions for this branch" });
      }

      const roomData = insertRoomSchema.partial().parse(req.body);
      const room = await storage.updateRoom(roomId, roomData);
        broadcastChange('rooms', 'updated', room); // Broadcast change

      // Send maintenance notification if room status changed to maintenance
      if (roomData.status && (roomData.status === 'maintenance' || roomData.status === 'out-of-order')) {
        try {
          console.log(`🔧 Room ${existingRoom.number} status changed to ${roomData.status}, sending notification...`);

          const branch = await storage.getBranch(existingRoom.branchId);
          const roomType = await storage.getRoomType(existingRoom.roomTypeId);

          if (branch && roomType) {
            console.log(`📨 Sending maintenance notification for room ${existingRoom.number} at branch ${branch.name}`);
            await NotificationService.sendMaintenanceNotification(
              { ...existingRoom, roomType },
              branch,
              roomData.status
            );
            console.log(`Maintenance notification sent for room ${existingRoom.number}`);
          } else {
            console.warn(` Missing branch or room type data for maintenance notification`);
          }
        } catch (notificationError) {
          console.error("Failed to send maintenance notification:", notificationError);
        }
      }

      res.json(room);
    } catch (error) {
      console.error("Error updating room:", error);
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  // Room type routes
  app.get("/api/room-types", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      // For superadmin, return all room types. For branch users, return room types for their branch + unassigned ones
      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const roomTypes = await storage.getRoomTypes(branchId);
      res.json(roomTypes);
    } catch (error) {
      console.error("Error fetching room types:", error);
      res.status(500).json({ message: "Failed to fetch room types" });
    }
  });

  app.post("/api/room-types", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Insufficient permissions. Only superadmin can create room types." });
      }

      const roomTypeData = insertRoomTypeSchema.parse(req.body);
      const roomType = await storage.createRoomType(roomTypeData);
      broadcastChange('room-types', 'created', roomType); // Broadcast change
      res.status(201).json(roomType);
    } catch (error) {
      console.error("Error creating room type:", error);
      res.status(500).json({ message: "Failed to create room type" });
    }
  });

  app.patch("/api/room-types/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Insufficient permissions. Only superadmin can update room types." });
      }

      const roomTypeId = parseInt(req.params.id);
      const roomTypeData = insertRoomTypeSchema.partial().parse(req.body);
      const roomType = await storage.updateRoomType(roomTypeId, roomTypeData);
      broadcastChange('room-types', 'updated', roomType); // Broadcast change
      res.json(roomType);
    } catch (error) {
      console.error("Error updating room type:", error);
      res.status(500).json({ message: "Failed to update room type" });
    }
  });

  app.delete("/api/room-types/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Insufficient permissions. Only superadmin can delete room types." });
      }

      const roomTypeId = parseInt(req.params.id);
      await storage.updateRoomType(roomTypeId, { isActive: false });
      broadcastChange('room-types', 'deleted', { id: roomTypeId }); // Broadcast change
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting room type:", error);
      res.status(500).json({ message: "Failed to delete room type" });
    }
  });

  // Guest routes
  app.get("/api/guests", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const { phone } = req.query;

      if (phone) {
        // Search guest by phone number - this returns any guest with this phone number from any branch
        const guest = await storage.findGuestByPhone(phone as string);
        return res.json(guest || null);
      }

      // Guests are now centrally accessible to all users
      const guests = await storage.getGuests();
      res.json(guests);
    } catch (error) {
      console.error("Error fetching guests:", error);
      res.status(500).json({ message: "Failed to fetch guests" });
    }
  });

  app.get("/api/guests/search", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const query = req.query.q as string;
      if (!query) return res.json([]);

      // Search all guests regardless of branch
      const guests = await storage.searchGuests(query);
      res.json(guests);
    } catch (error) {
      console.error("Error searching guests:", error);
      res.status(500).json({ message: "Failed to search guests" });
    }
  });

  app.post("/api/guests", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      // Guests are now centrally stored, no branch isolation needed
      const guestData = insertGuestSchema.parse(req.body);
      
      // Check if guest with this phone number already exists
      if (guestData.phone) {
        const existingGuest = await storage.findGuestByPhone(guestData.phone);
        if (existingGuest) {
          return res.status(409).json({ 
            message: "Guest with this phone number already exists",
            guest: existingGuest 
          });
        }
      }

      const guest = await storage.createGuest(guestData);
      broadcastChange('guests', 'created', guest); // Broadcast change
      res.status(201).json(guest);
    } catch (error) {
      console.error("Error creating guest:", error);
      res.status(500).json({ message: "Failed to create guest" });
    }
  });

  app.put("/api/guests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const guestId = parseInt(req.params.id);
      const guestData = insertGuestSchema.partial().parse(req.body);

      // Guests are centrally accessible, no branch permission check needed
      const existingGuest = await storage.getGuest(guestId);
      if (!existingGuest) {
        return res.status(404).json({ message: "Guest not found" });
      }

      const guest = await storage.updateGuest(guestId, guestData);
      broadcastChange('guests', 'updated', guest); // Broadcast change
      res.json(guest);
    } catch (error) {
      console.error("Error updating guest:", error);
      res.status(500).json({ message: "Failed to update guest" });
    }
  });

  app.delete("/api/guests/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const guestId = parseInt(req.params.id);

      // Guests are centrally accessible, no branch permission check needed
      const existingGuest = await storage.getGuest(guestId);
      if (!existingGuest) {
        return res.status(404).json({ message: "Guest not found" });
      }

      // Instead of hard delete, we'll mark as inactive
      await storage.updateGuest(guestId, { isActive: false });
      broadcastChange('guests', 'deleted', { id: guestId }); // Broadcast change
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting guest:", error);
      res.status(500).json({ message: "Failed to delete guest" });
    }
  });

  // Reservation routes
  app.get("/api/reservations", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const reservations = await storage.getReservations(branchId);
      res.json(reservations);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      res.status(500).json({ message: "Failed to fetch reservations" });
    }
  });

  app.get("/api/reservations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const reservation = await storage.getReservation(req.params.id);

      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      if (
        !checkBranchPermissions(user.role, user.branchId, reservation.branchId)
      ) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions for this branch" });
      }

      res.json(reservation);
    } catch (error) {
      console.error("Error fetching reservation:", error);
      res.status(500).json({ message: "Failed to fetch reservation" });
    }
  });

  const createReservationSchema = z.object({
    guest: insertGuestSchema,
    reservation: insertReservationSchema.omit({ 
      guestId: true, 
      confirmationNumber: true, 
      createdById: true 
    }),
    rooms: z.array(insertReservationRoomSchema.omit({ 
      reservationId: true 
    })),
  });

  app.post("/api/reservations", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      // Parse the request body first without validation that requires generated fields
      const requestData = req.body;
      const guestData = requestData.guest;
      const reservationData = requestData.reservation;
      const roomsData = requestData.rooms;

      if (
        !checkBranchPermissions(
          user.role,
          user.branchId,
          reservationData.branchId,
        )
      ) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions for this branch" });
      }

      // Check if guest already exists by phone number
      let guest;
      if (guestData.phone) {
        const existingGuests = await storage.searchGuests(guestData.phone);
        if (existingGuests.length > 0) {
          guest = existingGuests[0];
        }
      }

      // Create new guest if not found
      if (!guest) {
        guest = await storage.createGuest({
          ...guestData,
          branchId: reservationData.branchId,
        });
      }

      // Calculate taxes dynamically
      const subtotal = roomsData.reduce((sum: number, room: any) => {
        return sum + parseFloat(room.totalAmount);
      }, 0);

      let totalTaxAmount = 0;
      let appliedTaxes = [];

      // Get active reservation taxes
      const activeTaxes = await restaurantStorage.getActiveReservationTaxes();
      if (activeTaxes && activeTaxes.length > 0) {
        activeTaxes.forEach((tax: any) => {
          const taxAmount = (subtotal * parseFloat(tax.rate)) / 100;
          totalTaxAmount += taxAmount;
          appliedTaxes.push({
            taxId: tax.id,
            taxName: tax.taxName,
            rate: tax.rate,
            amount: taxAmount.toFixed(2)
          });
        });
      }

      const finalTotalAmount = subtotal + totalTaxAmount;

      // Generate confirmation number
      const confirmationNumber = `RES${Date.now().toString().slice(-8)}`;
      const reservationWithConfirmation = {
        ...reservationData,
        guestId: guest.id,
        confirmationNumber,
        createdById: user.id,
        totalAmount: finalTotalAmount.toString(),
        appliedTaxes: JSON.stringify(appliedTaxes),
        taxAmount: totalTaxAmount.toString(),
      };

      const reservation = await storage.createReservation(
        reservationWithConfirmation,
        roomsData,
      );
      broadcastChange('reservations', 'created', reservation); // Broadcast change

      // Update room status to reserved
      for (const roomData of roomsData) {
        await storage.updateRoom(roomData.roomId, { status: "reserved" });
      }

      // Send new reservation notification
      try {
        const branch = await storage.getBranch(reservationData.branchId);
        const room = await storage.getRoom(roomsData[0].roomId);
        const roomType = await storage.getRoomType(room?.roomTypeId || 0);

        if (branch && room && roomType) {
          await NotificationService.sendNewReservationNotification(
            guest,
            { ...room, roomType },
            branch,
            reservation.id,
            roomsData[0].checkInDate,
            roomsData[0].checkOutDate
          );
          console.log(`📧 New reservation notification sent for reservation ${reservation.id}`);
        }
      } catch (notificationError) {
        console.error("Failed to send new reservation notification:", notificationError);
      }

      res.status(201).json(reservation);
    } catch (error) {
      console.error("Error creating reservation:", error);
      res.status(500).json({ message: "Failed to create reservation" });
    }
  });

  app.patch("/api/reservations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const reservationId = req.params.id;
      const existingReservation = await storage.getReservation(reservationId);

      if (!existingReservation){
        return res.status(404).json({ message: "Reservation not found" });
      }

      if (
        !checkBranchPermissions(
          user.role,
          user.branchId,
          existingReservation.branchId,
        )
      ) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions for this branch" });
      }

      const bodyData = req.body;
      // Convert numeric fields to strings if they're numbers
      if (bodyData.paidAmount && typeof bodyData.paidAmount === 'number') {
        bodyData.paidAmount = bodyData.paidAmount.toString();
      }
      if (bodyData.totalAmount && typeof bodyData.totalAmount === 'number') {
        bodyData.totalAmount = bodyData.totalAmount.toString();
      }
      if (bodyData.taxAmount && typeof bodyData.taxAmount === 'number') {
        bodyData.taxAmount = bodyData.taxAmount.toString();
      }
      const validatedData = insertReservationSchema.partial().parse(bodyData);
      const reservation = await storage.updateReservation(
        reservationId,
        validatedData,
      );
      broadcastChange('reservations', 'updated', reservation); // Broadcast change

      // Update room status based on reservation status
      if (validatedData.status) {
        for (const roomReservation of existingReservation.reservationRooms) {
          let newRoomStatus;
          switch (validatedData.status) {
            case 'checked-in':
              newRoomStatus = 'occupied';
              break;
            case 'checked-out':
              newRoomStatus = 'available';
              break;
            case 'cancelled':
              newRoomStatus = 'available';
              break;
            case 'confirmed':
            case 'pending':
              newRoomStatus = 'reserved';
              break;
            default:
              newRoomStatus = 'reserved';
          }
          await storage.updateRoom(roomReservation.roomId, { status: newRoomStatus });
          broadcastChange('rooms', 'updated', { id: roomReservation.roomId, status: newRoomStatus });
        }

        // Send notifications for status changes
        try {
          console.log(`Reservation ${reservationId} status changed to ${validatedData.status}, sending notification...`);

          const branch = await storage.getBranch(existingReservation.branchId);
          const firstRoom = existingReservation.reservationRooms[0];

          if (branch && firstRoom) {
            if (validatedData.status === 'checked-in') {
              console.log(`Sending check-in notification for reservation ${reservationId}`);
              await NotificationService.sendCheckInNotification(
                existingReservation.guest,
                firstRoom.room,
                branch,
                reservationId
              );
              console.log(`Check-in notification sent for reservation ${reservationId}`);
            } else if (validatedData.status === 'checked-out') {
              console.log(`Sending check-out notification for reservation ${reservationId}`);
              await NotificationService.sendCheckOutNotification(
                existingReservation.guest,
                firstRoom.room,
                branch,
                reservationId
              );
              console.log(`Check-out notification sent for reservation ${reservationId}`);
            }
          } else {
            console.warn(`Missing branch or room data for status change notification`);
          }
        } catch (notificationError) {
          console.error("Failed to send status change notification:", notificationError);
        }
      }

      res.json(reservation);
    } catch (error) {
      console.error("Error updating reservation:", error);
      res.status(500).json({ message: "Failed to update reservation" });
    }
  });

  app.delete("/api/reservations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const reservationId = req.params.id;
      const existingReservation = await storage.getReservation(reservationId);

      if (!existingReservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      if (
        !checkBranchPermissions(
          user.role,
          user.branchId,
          existingReservation.branchId,
        )      ) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions for this branch" });
      }

      // Cancel the reservation and free up rooms
      await storage.updateReservation(reservationId, { status: "cancelled" });
      broadcastChange('reservations', 'deleted', { id: reservationId }); // Broadcast change

      // Update room status back to available
      for (const roomReservation of existingReservation.reservationRooms) {
        await storage.updateRoom(roomReservation.roomId, { status: "available" });
        broadcastChange('rooms', 'updated', { id: roomReservation.roomId, status: "available" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error cancelling reservation:", error);
      res.status(500).json({ message: "Failed to cancel reservation" });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const metrics = await storage.getDashboardMetrics(branchId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Today's reservations
  app.get("/api/dashboard/today-reservations", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const limit = parseInt(req.query.limit as string) || 5;
      const reservations = await storage.getTodayReservations(branchId, limit);
      res.json(reservations);
    } catch (error) {
      console.error("Error fetching today's reservations:", error);
      res.status(500).json({ message: "Failed to fetch today's reservations" });
    }
  });

  // Today's restaurant orders
  app.get("/api/restaurant/dashboard/today-orders", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const limit = parseInt(req.query.limit as string) || 5;
      const orders = await restaurantStorage.getTodayOrders(branchId, limit);
      res.json(orders);
    } catch (error) {
      console.error("Error fetching today's orders:", error);
      res.status(500).json({ message: "Failed to fetch today's orders" });
    }
  });

  // Super admin dashboard metrics
  app.get("/api/dashboard/super-admin-metrics", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const metrics = await storage.getSuperAdminDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching super admin metrics:", error);
      res.status(500).json({ message: "Failed to fetch super admin metrics" });
    }
  });

  // Advanced Analytics Endpoints
  app.get("/api/analytics/revenue", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const period = req.query.period || '30d';
      const analytics = await storage.getRevenueAnalytics(branchId, period as string);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching revenue analytics:", error);
      res.status(500).json({ message: "Failed to fetch revenue analytics" });
    }
  });

  app.get("/api/analytics/occupancy", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const period = req.query.period || '30d';
      const analytics = await storage.getOccupancyAnalytics(branchId, period as string);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching occupancy analytics:", error);
      res.status(500).json({ message: "Failed to fetch occupancy analytics" });
    }
  });

  app.get("/api/analytics/guests", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const analytics = await storage.getGuestAnalytics(branchId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching guest analytics:", error);
      res.status(500).json({ message: "Failed to fetch guest analytics" });
    }
  });

  app.get("/api/analytics/rooms", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const analytics = await storage.getRoomPerformanceAnalytics(branchId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching room performance analytics:", error);
      res.status(500).json({ message: "Failed to fetch room performance analytics" });
    }
  });

  app.get("/api/analytics/operations", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const analytics = await storage.getOperationalAnalytics(branchId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching operational analytics:", error);
      res.status(500).json({ message: "Failed to fetch operational analytics" });
    }
  });

  // Custom Role Management Routes
  app.get("/api/roles", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Only superadmins can access role management" });
      }

      const roles = await roleStorage.getCustomRoles();

      // Get permissions for each role
      const rolesWithPermissions = await Promise.all(
        roles.map(async (role) => {
          const permissions = await roleStorage.getRolePermissions(role.id);
          return { ...role, permissions };
        })
      );

      res.json(rolesWithPermissions);
    } catch (error) {
      console.error("Error fetching custom roles:", error);
      res.status(500).json({ message: "Failed to fetch custom roles" });
    }
  });

  app.get("/api/roles/modules/available", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Only superadmins can access modules" });
      }

      const modules = roleStorage.getAvailableModules();
      res.json(modules);
    } catch (error) {
      console.error("Error fetching available modules:", error);
      res.status(500).json({ message: "Failed to fetch available modules" });
    }
  });

  app.post("/api/roles", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Only superadmins can create roles" });
      }

      const { name, description, permissions } = req.body;

      if (!name || !name.trim()) {
        return res.status(400).json({ message: "Role name is required" });
      }

      // Create the role
      const role = await roleStorage.createCustomRole({
        name: name.trim(),
        description: description || "",
      });

      // Set permissions if provided
      if (permissions && permissions.length > 0) {
        await roleStorage.setRolePermissions(role.id, permissions);
      }

      // Return role with permissions
      const roleWithPermissions = await roleStorage.getCustomRole(role.id);
      res.status(201).json(roleWithPermissions);
    } catch (error) {
      console.error("Error creating custom role:", error);
      res.status(500).json({ message: "Failed to create custom role" });
    }
  });

  app.put("/api/roles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Only superadmins can update roles" });
      }

      const roleId = parseInt(req.params.id);
      const { name, description, permissions } = req.body;

      // Update the role
      await roleStorage.updateCustomRole(roleId, {
        name: name?.trim(),
        description,
      });

      // Update permissions if provided
      if (permissions !== undefined) {
        await roleStorage.setRolePermissions(roleId, permissions);
      }

      // Return updated role with permissions
      const roleWithPermissions = await roleStorage.getCustomRole(roleId);
      res.json(roleWithPermissions);
    } catch (error) {
      console.error("Error updating custom role:", error);
      res.status(500).json({ message: "Failed to update custom role" });
    }
  });

  app.delete("/api/roles/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Only superadmins can delete roles" });
      }

      const roleId = parseInt(req.params.id);
      await roleStorage.deleteCustomRole(roleId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting custom role:", error);
      res.status(500).json({ message: "Failed to delete custom role" });
    }
  });

  // Inventory Bulk Operations
  app.post("/api/inventory/stock-categories/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { categories } = req.body;
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const results = [];
      for (const category of categories) {
        const validatedData = insertStockCategorySchema.parse(category);
        const newCategory = await inventoryStorage.createStockCategory(validatedData);
        results.push(newCategory);
      }

      res.status(201).json(results);
    } catch (error) {
      console.error("Error creating stock categories in bulk:", error);
      res.status(500).json({ message: "Failed to create stock categories in bulk" });
    }
  });

  app.post("/api/inventory/measuring-units/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { units } = req.body;
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const results = [];
      for (const unit of units) {
        const validatedData = insertMeasuringUnitSchema.parse(unit);
        const newUnit = await inventoryStorage.createMeasuringUnit(validatedData);
        results.push(newUnit);
      }

      res.status(201).json(results);
    } catch (error) {
      console.error("Error creating measuring units in bulk:", error);
      res.status(500).json({ message: "Failed to create measuring units in bulk" });
    }
  });

  app.post("/api/inventory/suppliers/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { suppliers } = req.body;
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const results = [];
      for (const supplier of suppliers) {
        const validatedData = insertSupplierSchema.parse(supplier);
        const newSupplier = await inventoryStorage.createSupplier(validatedData);
        results.push(newSupplier);
      }

      res.status(201).json(results);
    } catch (error) {
      console.error("Error creating suppliers in bulk:", error);
      res.status(500).json({ message: "Failed to create suppliers in bulk" });
    }
  });

  app.post("/api/inventory/stock-items/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const { items } = req.body;
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const results = [];
      for (const item of items) {
        // Ensure branchId is set properly
        const itemWithBranch = {
          ...item,
          branchId: user.role === "superadmin" ? item.branchId || user.branchId : user.branchId,
        };

        // Check permissions
        if (!checkBranchPermissions(user.role, user.branchId, itemWithBranch.branchId)) {
          return res.status(403).json({ message: "Insufficient permissions for one or more items" });
        }

        const validatedData = insertStockItemSchema.parse(itemWithBranch);
        const newItem = await inventoryStorage.createStockItem(validatedData);
        results.push(newItem);
      }

      res.status(201).json(results);
    } catch (error) {
      console.error("Error creating stock items in bulk:", error);
      res.status(500).json({ message: "Failed to create stock items in bulk" });
    }
  });

  // Restaurant Analytics Endpoints
  app.get("/api/restaurant/analytics/revenue", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const period = req.query.period || '30d';
      const analytics = await restaurantStorage.getRevenueAnalytics(branchId, period as string);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching restaurant revenue analytics:", error);
      res.status(500).json({ message: "Failed to fetch restaurant revenue analytics" });
    }
  });

  app.get("/api/restaurant/analytics/orders", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const period = req.query.period || '30d';
      const analytics = await restaurantStorage.getOrderAnalytics(branchId, period as string);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching restaurant order analytics:", error);
      res.status(500).json({ message: "Failed to fetch restaurant order analytics" });
    }
  });

  app.get("/api/restaurant/analytics/dishes", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const analytics = await restaurantStorage.getDishAnalytics(branchId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching restaurant dish analytics:", error);
      res.status(500).json({ message: "Failed to fetch restaurant dish analytics" });
    }
  });

  app.get("/api/restaurant/analytics/tables", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const analytics = await restaurantStorage.getTableAnalytics(branchId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching restaurant table analytics:", error);
      res.status(500).json({ message: "Failed to fetch restaurant table analytics" });
    }
  });

  app.get("/api/restaurant/analytics/operations", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const analytics = await restaurantStorage.getOperationalAnalytics(branchId);
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching restaurant operational analytics:", error);
      res.status(500).json({ message: "Failed to fetch restaurant operational analytics" });
    }
  });

  // Hotel settings
  app.get("/api/hotel-settings", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const { branchId } = req.query;
      const targetBranchId = branchId ? parseInt(branchId as string) : undefined;

      if (targetBranchId && !checkBranchPermissions(user.role, user.branchId, targetBranchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this branch" });
      }

      const settings = await storage.getHotelSettings(targetBranchId);
      res.json(settings || {});
    } catch (error) {
      console.error("Error fetching hotel settings:", error);
      res.status(500).json({ message: "Failed to fetch hotel settings" });
    }
  });

  app.post("/api/hotel-settings", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const settingsData = insertHotelSettingsSchema.parse(req.body);
      const settings = await storage.upsertHotelSettings(settingsData);
      broadcastChange('hotel-settings', 'created', settings); // Broadcast change
      res.json(settings);
    } catch (error) {
      console.error("Error saving hotel settings:", error);
      res.status(500).json({ message: "Failed to save hotel settings" });
    }
  });

  app.put("/api/hotel-settings/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const settingsData = insertHotelSettingsSchema.parse(req.body);
      const settings = await storage.upsertHotelSettings(settingsData);
       broadcastChange('hotel-settings', 'updated', settings); // Broadcast change
      res.json(settings);
    } catch (error) {
      console.error("Error updating hotel settings:", error);
      res.status(500).json({ message: "Failed to update hotel settings" });
    }
  });

  // Profile management
  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      res.json(user);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const updateData = insertUserSchema.partial().parse(req.body);
      const updatedUser = await storage.updateUser(user.id, updateData);
       broadcastChange('profile', 'updated', updatedUser); // Broadcast change
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Room availability
  app.get("/api/rooms/availability", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const { branchId, checkIn, checkOut } = req.query;

      if (!branchId || !checkIn || !checkOut) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      const targetBranchId = parseInt(branchId as string);

      if (!checkBranchPermissions(user.role, user.branchId, targetBranchId)) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions for this branch" });
      }

      const availableRooms = await storage.getAvailableRooms(
        targetBranchId,
        checkIn as string,
        checkOut as string,
      );
      res.json(availableRooms);
    } catch (error) {
      console.error("Error fetching room availability:", error);
      res.status(500).json({ message: "Failed to fetch room availability" });
    }
  });

  // Push notification routes
  app.get("/api/notifications/vapid-key", async (req, res) => {
    res.json({ publicKey: NotificationService.getVapidPublicKey() });
  });

  app.post("/api/notifications/subscribe", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        console.error(" User not found during subscription");
        return res.status(401).json({ message: "User not found" });
      }

      console.log(`👤 User subscribing: ${user.id} (${user.email}) - Role: ${user.role}, Branch: ${user.branchId}`);

      // Only allow admin users to subscribe to notifications
      if (user.role !== 'superadmin' && user.role !== 'branch-admin') {
        console.warn(` Non-admin user ${user.id} (${user.role}) tried to subscribe to notifications`);
        return res.status(403).json({ message: "Only admin users can subscribe to notifications" });
      }

      const { endpoint, p256dh, auth } = req.body;

      if (!endpoint || !p256dh || !auth) {
        console.error(" Missing subscription data:", { 
          endpoint: !!endpoint, 
          p256dh: !!p256dh, 
          auth: !!auth,
          endpointType: typeof endpoint,
          p256dhType: typeof p256dh,
          authType: typeof auth
        });
        return res.status(400).json({ message: "Missing required subscription data" });
      }

      // Validate subscription data format
      if (typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string') {
        console.error(" Invalid subscription data types");
        return res.status(400).json({ message: "Invalid subscription data format" });
      }

      console.log(`📝 Creating push subscription for user ${user.id} (${user.email}):`, {
        endpoint: endpoint.substring(0, 50) + '...',
        endpointLength: endpoint.length,
        p256dhLength: p256dh.length,
        authLength: auth.length,
        userRole: user.role,
        branchId: user.branchId
      });

      // Check if subscription already exists
      try {
        const existingSubscription = await storage.getPushSubscription(user.id, endpoint);
        if (existingSubscription) {
          console.log(`♻️ Push subscription already exists for user ${user.id}, returning existing`);

          // Verify it's still in the admin subscriptions list
          const allSubscriptions = await storage.getAllAdminSubscriptions();
          const isInAdminList = allSubscriptions.some(sub => sub.userId === user.id && sub.endpoint === endpoint);
          console.log(` Subscription found in admin list: ${isInAdminList}`);

          return res.json(existingSubscription);
        }
      } catch (error) {
        console.error(" Error checking existing subscription:", error);
        // Continue with creating new subscription
      }

      // Create new subscription
      const subscription = await storage.createPushSubscription({
        userId: user.id,
        endpoint,
        p256dh,
        auth,
      });

      console.log(` Push subscription created successfully for user ${user.id} (${user.email})`);

      // Verify the subscription was saved and is accessible
      try {
        const allSubscriptions = await storage.getAllAdminSubscriptions();
        console.log(` Total admin subscriptions after creation: ${allSubscriptions.length}`);

        const userSubscriptions = allSubscriptions.filter(sub => sub.userId === user.id);
        console.log(`👤 Subscriptions for user ${user.id}: ${userSubscriptions.length}`);

        const adminUsers = allSubscriptions.map(sub => ({ 
          userId: sub.userId, 
          email: sub.user?.email, 
          role: sub.user?.role 
        }));
        console.log(`👥 All subscribed admin users:`, adminUsers);

        // Double-check the newly created subscription is in the list
        const newSubInList = allSubscriptions.some(sub => 
          sub.userId === user.id && sub.endpoint === endpoint
        );
        console.log(` New subscription found in admin list: ${newSubInList}`);

        if (!newSubInList) {
          console.error(` CRITICAL: New subscription not found in admin list!`);
        }
      } catch (verifyError) {
        console.error(" Error verifying subscription creation:", verifyError);
      }

      res.json({
        ...subscription,
        message: "Subscription created successfully"
        });
    } catch (error) {
      console.error(" Error creating push subscription:", error);
      res.status(500).json({ 
        message: "Failed to create push subscription",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.delete("/api/notifications/unsubscribe", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ message: "Missing endpoint" });
      }

      await storage.deletePushSubscription(user.id, endpoint);
      console.log(` Push subscription deleted for user ${user.id}`);
      res.json({ message: "Unsubscribed successfully" });
    } catch (error) {
      console.error("Error deleting push subscription:", error);
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  // Notification history routes
  app.get("/api/notifications/history", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      // Only allow admin users to view notification history
      if (user.role !== 'superadmin' && user.role !== 'branch-admin') {
        return res.status(403).json({ message: "Only admin users can view notification history" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const notifications = await storage.getNotificationHistory(user.id, limit);

      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notification history:", error);
      res.status(500).json({ message: "Failed to fetch notification history" });
    }
  });

  app.patch("/api/notifications/history/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsRead(notificationId, user.id);

      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/history/read-all", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      await storage.markAllNotificationsAsRead(user.id);

      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.get("/api/notifications/unread-count", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      // Only allow admin users to view unread count
      if (user.role !== 'superadmin' && user.role !== 'branch-admin') {
        return res.status(403).json({ message: "Only admin users can view notification count" });
      }

      const count = await storage.getUnreadNotificationCount(user.id);

      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ message: "Failed to fetch unread notification count" });
    }
  });

  // Restaurant Management System (RMS) Routes

  // Restaurant Tables
  app.get("/api/restaurant/tables", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const tables = await restaurantStorage.getRestaurantTables(branchId);
      res.json(tables);
    } catch (error) {
      console.error("Error fetching restaurant tables:", error);
      res.status(500).json({ message: "Failed to fetch restaurant tables" });
    }
  });

  app.post("/api/restaurant/tables", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const tableData = insertRestaurantTableSchema.parse(req.body);

      if (!checkBranchPermissions(user.role, user.branchId, tableData.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this branch" });
      }

      const table = await restaurantStorage.createRestaurantTable(tableData);
      res.status(201).json(table);
    } catch (error) {
      console.error("Error creating restaurant table:", error);
      res.status(500).json({ message: "Failed to create restaurant table" });
    }
  });

  // Bulk create tables
  app.post("/api/restaurant/tables/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const { tables } = req.body;
      if (!Array.isArray(tables) || tables.length === 0) {
        return res.status(400).json({ message: "Tables array is required" });
      }

      const validatedTables = tables.map(table => insertRestaurantTableSchema.parse(table));

      // Check permissions for all tables
      for (const table of validatedTables) {
        if (!checkBranchPermissions(user.role, user.branchId, table.branchId)) {
          return res.status(403).json({ message: "Insufficient permissions for one or more tables" });
        }
      }

      const createdTables = await restaurantStorage.createRestaurantTablesBulk(validatedTables);
      res.status(201).json(createdTables);
    } catch (error) {
      console.error("Error creating restaurant tables in bulk:", error);
      res.status(500).json({ message: "Failed to create restaurant tables" });
    }
  });

  app.put("/api/restaurant/tables/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const tableId = parseInt(req.params.id);
      const tableData = insertRestaurantTableSchema.partial().parse(req.body);

      const existingTable = await restaurantStorage.getRestaurantTable(tableId);
      if (!existingTable || !checkBranchPermissions(user.role, user.branchId, existingTable.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this table" });
      }

      const table = await restaurantStorage.updateRestaurantTable(tableId, tableData);
      res.json(table);
    } catch (error) {
      console.error("Error updating restaurant table:", error);
      res.status(500).json({ message: "Failed to update restaurant table" });
    }
  });

  app.delete("/api/restaurant/tables/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const tableId = parseInt(req.params.id);

      const existingTable = await restaurantStorage.getRestaurantTable(tableId);
      if (!existingTable || !checkBranchPermissions(user.role, user.branchId, existingTable.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this table" });
      }

      await restaurantStorage.deleteRestaurantTable(tableId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting restaurant table:", error);
      res.status(500).json({ message: "Failed to delete restaurant table" });
    }
  });

  // Menu Categories
  app.get("/api/restaurant/categories", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const categories = await restaurantStorage.getMenuCategories(branchId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching menu categories:", error);
      res.status(500).json({ message: "Failed to fetch menu categories" });
    }
  });

  app.post("/api/restaurant/categories", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const categoryData = insertMenuCategorySchema.parse(req.body);

      if (!checkBranchPermissions(user.role, user.branchId, categoryData.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this branch" });
      }

      const category = await restaurantStorage.createMenuCategory(categoryData);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating menu category:", error);
      res.status(500).json({ message: "Failed to create menu category" });
    }
  });

  // Bulk create categories
  app.post("/api/restaurant/categories/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const { categories } = req.body;
      if (!Array.isArray(categories) || categories.length === 0) {
        return res.status(400).json({ message: "Categories array is required" });
      }

      const validatedCategories = categories.map(category => insertMenuCategorySchema.parse(category));

      // Check permissions for all categories
      for (const category of validatedCategories) {
        if (!checkBranchPermissions(user.role, user.branchId, category.branchId)) {
          return res.status(403).json({ message: "Insufficient permissions for one or more categories" });
        }
      }

      const createdCategories = await restaurantStorage.createMenuCategoriesBulk(validatedCategories);
      res.status(201).json(createdCategories);
    } catch (error) {
      console.error("Error creating menu categories in bulk:", error);
      res.status(500).json({ message: "Failed to create menu categories" });
    }
  });

  app.put("/api/restaurant/categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const categoryId = parseInt(req.params.id);
      const categoryData = insertMenuCategorySchema.partial().parse(req.body);

      const existingCategory = await restaurantStorage.getMenuCategory(categoryId);
      if (!existingCategory || !checkBranchPermissions(user.role, user.branchId, existingCategory.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this category" });
      }

      const category = await restaurantStorage.updateMenuCategory(categoryId, categoryData);
      res.json(category);
    } catch (error) {
      console.error("Error updating menu category:", error);
      res.status(500).json({ message: "Failed to update menu category" });
    }
  });

  app.delete("/api/restaurant/categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const categoryId = parseInt(req.params.id);

      const existingCategory = await restaurantStorage.getMenuCategory(categoryId);
      if (!existingCategory || !checkBranchPermissions(user.role, user.branchId, existingCategory.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this category" });
      }

      await restaurantStorage.deleteMenuCategory(categoryId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting menu category:", error);
      res.status(500).json({ message: "Failed to delete menu category" });
    }
  });

  // Menu Dishes
  app.get("/api/restaurant/dishes", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const dishes = await restaurantStorage.getMenuDishes(branchId, categoryId);
      res.json(dishes);
    } catch (error) {
      console.error("Error fetching menu dishes:", error);
      res.status(500).json({ message: "Failed to fetch menu dishes" });
    }
  });

  app.post("/api/restaurant/dishes", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const dishData = insertMenuDishSchema.parse(req.body);

      if (!checkBranchPermissions(user.role, user.branchId, dishData.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this branch" });
      }

      const dish = await restaurantStorage.createMenuDish(dishData);
      res.status(201).json(dish);
    } catch (error) {
      console.error("Error creating menu dish:", error);
      res.status(500).json({ message: "Failed to create menu dish" });
    }
  });

  // Bulk create dishes
  app.post("/api/restaurant/dishes/bulk", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const { dishes } = req.body;
      if (!Array.isArray(dishes) || dishes.length === 0) {
        return res.status(400).json({ message: "Dishes array is required" });
      }

      const validatedDishes = dishes.map(dish => insertMenuDishSchema.parse(dish));

      // Check permissions for all dishes
      for (const dish of validatedDishes) {
        if (!checkBranchPermissions(user.role, user.branchId, dish.branchId)) {
          return res.status(403).json({ message: "Insufficient permissions for one or more dishes" });
        }
      }

      const createdDishes = await restaurantStorage.createMenuDishesBulk(validatedDishes);
      res.status(201).json(createdDishes);
    } catch (error) {
      console.error("Error creating menu dishes in bulk:", error);
      res.status(500).json({ message: "Failed to create menu dishes" });
    }
  });

  app.get("/api/restaurant/dishes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const dishId = parseInt(req.params.id);
      const dish = await restaurantStorage.getMenuDish(dishId);
      
      if (!dish) {
        return res.status(404).json({ message: "Dish not found" });
      }

      if (!checkBranchPermissions(user.role, user.branchId, dish.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this dish" });
      }

      res.json(dish);
    } catch (error) {
      console.error("Error fetching menu dish:", error);
      res.status(500).json({ message: "Failed to fetch menu dish" });
    }
  });

  app.put("/api/restaurant/dishes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const dishId = parseInt(req.params.id);
      const dishData = insertMenuDishSchema.partial().parse(req.body);

      const existingDish = await restaurantStorage.getMenuDish(dishId);
      if (!existingDish || !checkBranchPermissions(user.role, user.branchId, existingDish.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this dish" });
      }

      const dish = await restaurantStorage.updateMenuDish(dishId, dishData);
      res.json(dish);
    } catch (error) {
      console.error("Error updating menu dish:", error);
      res.status(500).json({ message: "Failed to update menu dish" });
    }
  });

  app.delete("/api/restaurant/dishes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const dishId = parseInt(req.params.id);

      const existingDish = await restaurantStorage.getMenuDish(dishId);
      if (!existingDish || !checkBranchPermissions(user.role, user.branchId, existingDish.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this dish" });
      }

      await restaurantStorage.deleteMenuDish(dishId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting menu dish:", error);
      res.status(500).json({ message: "Failed to delete menu dish" });
    }
  });

  // Restaurant Orders
  app.get("/api/restaurant/orders", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const status = req.query.status as string;
      const orders = await restaurantStorage.getRestaurantOrders(branchId, status);

      // Get order items for each order
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const items = await restaurantStorage.getRestaurantOrderItems(order.id);
          return { ...order, items };
        })
      );

      res.json(ordersWithItems);
    } catch (error) {
      console.error("Error fetching restaurant orders:", error);
      res.status(500).json({ message: "Failed to fetch restaurant orders" });
    }
  });

  app.get("/api/restaurant/orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const order = await restaurantStorage.getRestaurantOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (!checkBranchPermissions(user.role, user.branchId, order.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this order" });
      }

      const items = await restaurantStorage.getRestaurantOrderItems(order.id);
      res.json({ ...order, items });
    } catch (error) {
      console.error("Error fetching restaurant order:", error);
      res.status(500).json({ message: "Failed to fetch restaurant order" });
    }
  });

  const createOrderSchema = z.object({
    order: insertRestaurantOrderSchema.omit({ 
      id: true,
      orderNumber: true, 
      createdById: true 
    }),
    items: z.array(insertRestaurantOrderItemSchema.omit({ 
      id: true,
      orderId: true 
    })),
  });

  app.post("/api/restaurant/orders", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const { order: orderData, items: itemsData } = createOrderSchema.parse(req.body);

      if (!checkBranchPermissions(user.role, user.branchId, orderData.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this branch" });
      }

      // Generate order number
      const orderNumber = `ORD${Date.now().toString().slice(-8)}`;
      const orderWithNumber = {
        ...orderData,
        orderNumber,
        createdById: user.id,
      };

      const order = await restaurantStorage.createRestaurantOrder(orderWithNumber, itemsData);
      res.status(201).json(order);
    } catch (error) {
      console.error("Error creating restaurant order:", error);
      res.status(500).json({ message: "Failed to create restaurant order" });
    }
  });

  app.patch("/api/restaurant/orders/:id/status", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const orderId = req.params.id;
      const { status } = req.body;

      const existingOrder = await restaurantStorage.getRestaurantOrder(orderId);
      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (!checkBranchPermissions(user.role, user.branchId, existingOrder.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this order" });
      }

      const order = await restaurantStorage.updateRestaurantOrderStatus(orderId, status);
      res.json(order);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // KOT/BOT Generation
  app.post("/api/restaurant/orders/:id/kot", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const orderId = req.params.id;
      const existingOrder = await restaurantStorage.getRestaurantOrder(orderId);

      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (!checkBranchPermissions(user.role, user.branchId, existingOrder.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this order" });
      }

      const kotData = await restaurantStorage.generateKOT(orderId);
      res.json(kotData);
    } catch (error) {
      console.error("Error generating KOT:", error);
      res.status(500).json({ message: "Failed to generate KOT" });
    }
  });

  app.post("/api/restaurant/orders/:id/bot", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const orderId = req.params.id;
      const existingOrder = await restaurantStorage.getRestaurantOrder(orderId);

      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (!checkBranchPermissions(user.role, user.branchId, existingOrder.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this order" });
      }

      const botData = await restaurantStorage.generateBOT(orderId);
      res.json(botData);
    } catch (error) {
      console.error("Error generating BOT:", error);
      res.status(500).json({ message: "Failed to generate BOT" });
    }
  });

  // Dish Ingredients Management
  app.get("/api/restaurant/dishes/:dishId/ingredients", isAuthenticated, async (req: any, res) => {
    try {
      const dishId = parseInt(req.params.dishId);
      const ingredients = await dishIngredientsStorage.getDishIngredients(dishId);
      res.json(ingredients);
    } catch (error) {
      console.error("Error fetching dish ingredients:", error);
      res.status(500).json({ message: "Failed to fetch dish ingredients" });
    }
  });

  app.put("/api/restaurant/dishes/:dishId/ingredients", isAuthenticated, async (req: any, res) => {
    try {
      const dishId = parseInt(req.params.dishId);
      const ingredients = req.body.ingredients || [];
      
      // Validate each ingredient
      const validatedIngredients = ingredients.map((ingredient: any) => 
        insertDishIngredientSchema.parse({ ...ingredient, dishId })
      );

      const result = await dishIngredientsStorage.updateDishIngredientsBulk(dishId, validatedIngredients);
      res.json(result);
    } catch (error) {
      console.error("Error updating dish ingredients:", error);
      res.status(500).json({ message: "Failed to update dish ingredients" });
    }
  });

  app.get("/api/restaurant/dishes/:dishId/cost-calculation", isAuthenticated, async (req: any, res) => {
    try {
      const dishId = parseInt(req.params.dishId);
      const costCalculation = await dishIngredientsStorage.getDishCostCalculation(dishId);
      res.json(costCalculation);
    } catch (error) {
      console.error("Error calculating dish cost:", error);
      res.status(500).json({ message: "Failed to calculate dish cost" });
    }
  });

  // Restaurant Bills
  app.get("/api/restaurant/bills", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const bills = await restaurantStorage.getRestaurantBills(branchId);
      res.json(bills);
    } catch (error) {
      console.error("Error fetching restaurant bills:", error);
      res.status(500).json({ message: "Failed to fetch restaurant bills" });
    }
  });

  app.post("/api/restaurant/bills", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const billData = insertRestaurantBillSchema.parse({
        ...req.body,
        billNumber: `BILL${Date.now().toString().slice(-8)}`,
        createdById: user.id,
      });

      if (!checkBranchPermissions(user.role, user.branchId, billData.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this branch" });
      }

      // Check if bill already exists for this order
      const existingBills = await restaurantStorage.getRestaurantBills(billData.branchId);
      const duplicateBill = existingBills.find((bill: any) => bill.orderId === billData.orderId);

      if (duplicateBill) {
        return res.status(400).json({ message: "Bill already exists for this order" });
      }

      // Verify order exists and is in correct status
      const order = await restaurantStorage.getRestaurantOrder(billData.orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (!['pending', 'confirmed', 'preparing', 'ready', 'served'].includes(order.status)) {
        return res.status(400).json({ message: "Order must be active to create bill" });
      }

      const bill = await restaurantStorage.createRestaurantBill(billData);
      res.status(201).json(bill);
    } catch (error) {
      console.error("Error creating restaurant bill:", error);
      res.status(500).json({ message: "Failed to create restaurant bill" });
    }
  });

  app.put("/api/restaurant/bills/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const billId = req.params.id;
      const billData = insertRestaurantBillSchema.partial().parse(req.body);

      const existingBill = await restaurantStorage.getRestaurantBill(billId);
      if (!existingBill) {
        return res.status(404).json({ message: "Bill not found" });
      }

      if (!checkBranchPermissions(user.role, user.branchId, existingBill.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this bill" });
      }

      const bill = await restaurantStorage.updateRestaurantBill(billId, billData);
      res.json(bill);
    } catch (error) {
      console.error("Error updating restaurant bill:", error);
      res.status(500).json({ message: "Failed to update restaurant bill" });
    }
  });

  // Delete restaurant bill
  app.delete("/api/restaurant/bills/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await restaurantStorage.deleteBill(id);
      res.json({ message: "Bill deleted successfully" });
    } catch (error) {
      console.error("Error deleting restaurant bill:", error);
      res.status(500).json({ message: "Failed to delete bill" });
    }
  });

  // Clean up duplicate bills (admin only)
  app.post("/api/restaurant/bills/cleanup-duplicates", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || user.role !== "superadmin") {
        return res.status(403).json({ message: "Only superadmin can clean up duplicate bills" });
      }

      // This is a one-time cleanup for existing duplicate bills
      // In production, you'd want more sophisticated logic here
      res.json({ message: "Cleanup endpoint available for superadmin use" });
    } catch (error) {
      console.error("Error cleaning up duplicate bills:", error);
      res.status(500).json({ message: "Failed to clean up duplicate bills" });
    }
  });

  // Tax/Charges Management API Routes
  app.get("/api/taxes", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      // Only allow superadmin and branch-admin to access tax management
      if (!["superadmin", "branch-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const taxes = await restaurantStorage.getTaxes();
      res.json(taxes);
    } catch (error) {
      console.error("Error fetching taxes:", error);
      res.status(500).json({ message: "Failed to fetch taxes" });
    }
  });

  app.get("/api/taxes/active", isAuthenticated, async (req: any, res) => {
    try {
      const taxes = await restaurantStorage.getActiveTaxes();
      res.json(taxes);
    } catch (error) {
      console.error("Error fetching active taxes:", error);
      res.status(500).json({ message: "Failed to fetch active taxes" });
    }
  });

  app.get("/api/taxes/reservation", isAuthenticated, async (req: any, res) => {
    try {
      const taxes = await restaurantStorage.getActiveReservationTaxes();
      res.json(taxes);
    } catch (error) {
      console.error("Error fetching reservation taxes:", error);
      res.status(500).json({ message: "Failed to fetch reservation taxes" });
    }
  });

  app.get("/api/taxes/order", isAuthenticated, async (req: any, res) => {
    try {
      const taxes = await restaurantStorage.getActiveOrderTaxes();
      res.json(taxes);
    } catch (error) {
      console.error("Error fetching order taxes:", error);
      res.status(500).json({ message: "Failed to fetch order taxes" });
    }
  });

  app.post("/api/taxes", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      // Only allow superadmin and branch-admin to create taxes
      if (!["superadmin", "branch-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const taxData = insertTaxSchema.parse(req.body);
      const tax = await restaurantStorage.createTax(taxData);
      res.status(201).json(tax);
    } catch (error) {
      console.error("Error creating tax:", error);
      if (error.code === "23505") { // Unique constraint violation
        res.status(400).json({ message: "Tax name already exists" });
      } else {
        res.status(500).json({ message: "Failed to create tax" });
      }
    }
  });

  app.put("/api/taxes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      // Only allow superadmin and branch-admin to update taxes
      if (!["superadmin", "branch-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const taxId = parseInt(req.params.id);
      const taxData = updateTaxSchema.parse(req.body);

      const existingTax = await restaurantStorage.getTax(taxId);
      if (!existingTax) {
        return res.status(404).json({ message: "Tax not found" });
      }

      const tax = await restaurantStorage.updateTax(taxId, taxData);
      res.json(tax);
    } catch (error) {
      console.error("Error updating tax:", error);
      if (error.code === "23505") { // Unique constraint violation
        res.status(400).json({ message: "Tax name already exists" });
      } else {
        res.status(500).json({ message: "Failed to update tax" });
      }
    }
  });

  app.delete("/api/taxes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      // Only allow superadmin and branch-admin to delete taxes
      if (!["superadmin", "branch-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const taxId = parseInt(req.params.id);

      const existingTax = await restaurantStorage.getTax(taxId);
      if (!existingTax) {
        return res.status(404).json({ message: "Tax not found" });
      }

      await restaurantStorage.deleteTax(taxId);
      res.json({ message: "Tax deleted successfully" });
    } catch (error) {
      console.error("Error deleting tax:", error);
      res.status(500).json({ message: "Failed to delete tax" });
    }
  });

  // Restaurant Dashboard Metrics
  app.get("/api/restaurant/dashboard/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const metrics = await restaurantStorage.getRestaurantDashboardMetrics(branchId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching restaurant dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch restaurant dashboard metrics" });
    }
  });

  // Inventory Management Routes

  // Measuring Units
  app.get("/api/inventory/measuring-units", isAuthenticated, async (req: any, res) => {
    try {
      // Measuring units are global and not branch-specific
      const units = await inventoryStorage.getMeasuringUnits();
      res.json(units);
    } catch (error) {
      console.error("Error fetching measuring units:", error);
      res.status(500).json({ message: "Failed to fetch measuring units" });
    }
  });

  app.post("/api/inventory/measuring-units", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertMeasuringUnitSchema.parse(req.body);
      const unit = await inventoryStorage.createMeasuringUnit(validatedData);
      res.status(201).json(unit);
    } catch (error) {
      console.error("Error creating measuring unit:", error);
      res.status(500).json({ message: "Failed to create measuring unit" });
    }
  });

  app.put("/api/inventory/measuring-units/:id", isAuthenticated, async (req: any, res) => {
    try {
      const unitId = parseInt(req.params.id);
      const validatedData = insertMeasuringUnitSchema.partial().parse(req.body);
      const unit = await inventoryStorage.updateMeasuringUnit(unitId, validatedData);
      res.json(unit);
    } catch (error) {
      console.error("Error updating measuring unit:", error);
      res.status(500).json({ message: "Failed to update measuring unit" });
    }
  });

  app.delete("/api/inventory/measuring-units/:id", isAuthenticated, async (req: any, res) => {
    try {
      const unitId = parseInt(req.params.id);
      await inventoryStorage.deleteMeasuringUnit(unitId);
      res.json({ message: "Measuring unit deleted successfully" });
    } catch (error) {
      console.error("Error deleting measuring unit:", error);
      res.status(500).json({ message: "Failed to delete measuring unit" });
    }
  });

  // Stock Categories
  app.get("/api/inventory/stock-categories", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      // For superadmin, show all categories. For branch admin/staff, show their branch categories
      const branchId = user.role === "superadmin" ? undefined : user.branchId;
      const categories = await inventoryStorage.getStockCategories(branchId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching stock categories:", error);
      res.status(500).json({ message: "Failed to fetch stock categories" });
    }
  });

  app.get("/api/inventory/stock-categories/menu", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const categories = await inventoryStorage.getMenuStockCategories(branchId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching menu stock categories:", error);
      res.status(500).json({ message: "Failed to fetch menu stock categories" });
    }
  });

  app.post("/api/inventory/stock-categories", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      console.log("Creating stock category - User:", user.role, "Request body:", req.body);

      const validatedData = insertStockCategorySchema.parse({
        ...req.body,
        branchId: user.role === "superadmin" ? req.body.branchId || null : user.branchId,
      });

      console.log("Validated data:", validatedData);

      const category = await inventoryStorage.createStockCategory(validatedData);
      console.log("Category created:", category);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating stock category:", error);
      if (error instanceof Error) {
        res.status(400).json({ 
          message: "Failed to create stock category", 
          error: error.message 
        });
      } else {
        res.status(500).json({ message: "Failed to create stock category" });
      }
    }
  });

  app.put("/api/inventory/stock-categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      const validatedData = insertStockCategorySchema.partial().parse(req.body);
      const category = await inventoryStorage.updateStockCategory(categoryId, validatedData);
      res.json(category);
    } catch (error) {
      console.error("Error updating stock category:", error);
      res.status(500).json({ message: "Failed to update stock category" });
    }
  });

  app.delete("/api/inventory/stock-categories/:id", isAuthenticated, async (req: any, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      await inventoryStorage.deleteStockCategory(categoryId);
      res.json({ message: "Stock category deleted successfully" });
    } catch (error) {
      console.error("Error deleting stock category:", error);
      res.status(500).json({ message: "Failed to delete stock category" });
    }
  });



  // Suppliers
  app.get("/api/inventory/suppliers", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const suppliers = await inventoryStorage.getSuppliers(branchId);
      res.json(suppliers);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });

  app.post("/api/inventory/suppliers", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const validatedData = insertSupplierSchema.parse({
        ...req.body,
        branchId: user.role === "superadmin" ? req.body.branchId : user.branchId!,
      });

      const supplier = await inventoryStorage.createSupplier(validatedData);
      res.status(201).json(supplier);
    } catch (error) {
      console.error("Error creating supplier:", error);
      res.status(500).json({ message: "Failed to create supplier" });
    }
  });

  app.put("/api/inventory/suppliers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      const validatedData = insertSupplierSchema.partial().parse(req.body);
      const supplier = await inventoryStorage.updateSupplier(supplierId, validatedData);
      res.json(supplier);
    } catch (error) {
      console.error("Error updating supplier:", error);
      res.status(500).json({ message: "Failed to update supplier" });
    }
  });

  app.delete("/api/inventory/suppliers/:id", isAuthenticated, async (req: any, res) => {
    try {
      const supplierId = parseInt(req.params.id);
      await inventoryStorage.deleteSupplier(supplierId);
      res.json({ message: "Supplier deleted successfully" });
    } catch (error) {
      console.error("Error deleting supplier:", error);
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });

  // Stock items
  app.post("/api/inventory/stock-items", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const stockItemData = insertStockItemSchema.parse(req.body);

      if (!checkBranchPermissions(user.role, user.branchId, stockItemData.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const stockItem = await inventoryStorage.createStockItem(stockItemData);
      res.status(201).json(stockItem);
    } catch (error) {
      console.error("Error creating stock item:", error);
      res.status(500).json({ message: "Failed to create stock item" });
    }
  });

  app.get("/api/inventory/stock-items", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const items = await inventoryStorage.getStockItems(branchId, categoryId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching stock items:", error);
      res.status(500).json({ message: "Failed to fetch stock items" });
    }
  });

  app.get("/api/inventory/stock-items/menu", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const items = await inventoryStorage.getMenuStockItems(branchId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching menu stock items:", error);
      res.status(500).json({ message: "Failed to fetch menu stock items" });
    }
  });

  app.put("/api/inventory/stock-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const itemId = parseInt(req.params.id);
      const validatedData = insertStockItemSchema.partial().parse(req.body);
      const item = await inventoryStorage.updateStockItem(itemId, validatedData);
      res.json(item);
    } catch (error) {
      console.error("Error updating stock item:", error);
      res.status(500).json({ message: "Failed to update stock item" });
    }
  });

  app.delete("/api/inventory/stock-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const itemId = parseInt(req.params.id);
      await inventoryStorage.deleteStockItem(itemId);
      res.json({ message: "Stock item deleted successfully" });
    } catch (error) {
      console.error("Error deleting stock item:", error);
      res.status(500).json({ message: "Failed to delete stock item" });
    }
  });

  // Stock Consumption
  app.get("/api/inventory/consumption", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const orderId = req.query.orderId as string;
      const consumptions = await inventoryStorage.getStockConsumptions(branchId, orderId);
      res.json(consumptions);
    } catch (error) {
      console.error("Error fetching stock consumptions:", error);
      res.status(500).json({ message: "Failed to fetch stock consumptions" });
    }
  });

  app.get("/api/inventory/low-stock", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const items = await inventoryStorage.getLowStockItems(branchId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      res.status(500).json({ message: "Failed to fetch low stock items" });
    }
  });

  const requireAuth = (req: any, res: any, next: any) => {
    if (req.session && req.session.user) {
      req.user = req.session.user;
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  };

  // Get user permissions (for custom roles)
  app.get("/api/auth/user/permissions", requireAuth, async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const user = await storage.getUser(userId);
      if (!user || user.role !== "custom") {
        return res.json({});
      }

      // Use the getUserPermissions method which already aggregates permissions
      const permissions = await roleStorage.getUserPermissions(userId);
      console.log("User permissions found:", permissions);

      res.json(permissions);
    } catch (error) {
      console.error("Error fetching user permissions:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // QR Code routes for tables and rooms
  app.get("/api/qr/table/:id", isAuthenticated, async (req: any, res) => {
    try {
      const tableId = parseInt(req.params.id);
      const qrCode = await QRService.generateTableQR(tableId);
      const table = await restaurantStorage.getRestaurantTable(tableId);
      res.json({ qrCode, url: `${QRService.getBaseUrl()}/order/${table?.qrToken}` });
    } catch (error) {
      console.error("Error generating table QR code:", error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  app.get("/api/qr/room/:id", isAuthenticated, async (req: any, res) => {
    try {
      const roomId = parseInt(req.params.id);
      const qrCode = await QRService.generateRoomQR(roomId);
      const room = await storage.getRoom(roomId);
      res.json({ qrCode, url: `${QRService.getBaseUrl()}/order/${room?.qrToken}` });
    } catch (error) {
      console.error("Error generating room QR code:", error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  app.post("/api/qr/table/:id/regenerate", isAuthenticated, async (req: any, res) => {
    try {
      const tableId = parseInt(req.params.id);
      const result = await QRService.regenerateTableQR(tableId);
      res.json(result);
    } catch (error) {
      console.error("Error regenerating table QR code:", error);
      res.status(500).json({ message: "Failed to regenerate QR code" });
    }
  });

  app.post("/api/qr/room/:id/regenerate", isAuthenticated, async (req: any, res) => {
    try {
      const roomId = parseInt(req.params.id);
      const result = await QRService.regenerateRoomQR(roomId);
      res.json(result);
    } catch (error) {
      console.error("Error regenerating room QR code:", error);
      res.status(500).json({ message: "Failed to regenerate QR code" });
    }
  });

  // Public order page route (no authentication required)
  app.get("/api/order/info/:token", async (req: any, res) => {
    try {
      const token = req.params.token;
      const orderInfo = await QRService.validateQRToken(token);
      
      if (!orderInfo) {
        return res.status(404).json({ message: "Invalid QR code" });
      }

      // Get menu items for the branch
      const menuCategories = await restaurantStorage.getMenuCategories(orderInfo.branchId);
      const menuDishes = await restaurantStorage.getMenuDishes(orderInfo.branchId);
      
      res.json({
        location: orderInfo,
        menu: {
          categories: menuCategories,
          dishes: menuDishes
        }
      });
    } catch (error) {
      console.error("Error validating QR token:", error);
      res.status(500).json({ message: "Failed to validate QR code" });
    }
  });

  // Public order submission route (no authentication required)
  app.post("/api/order/submit/:token", async (req: any, res) => {
    try {
      const token = req.params.token;
      const orderInfo = await QRService.validateQRToken(token);
      
      if (!orderInfo) {
        return res.status(404).json({ message: "Invalid QR code" });
      }

      const { items, customerName, customerPhone, notes } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Order items are required" });
      }

      if (!customerName || !customerPhone) {
        return res.status(400).json({ message: "Customer name and phone are required" });
      }

      // Calculate totals
      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const dish = await restaurantStorage.getMenuDish(item.dishId);
        if (!dish) {
          return res.status(400).json({ message: `Dish with ID ${item.dishId} not found` });
        }

        const itemTotal = parseFloat(dish.price) * item.quantity;
        subtotal += itemTotal;

        orderItems.push({
          orderId: '', // Will be set after order creation
          dishId: item.dishId,
          quantity: item.quantity,
          unitPrice: dish.price,
          totalPrice: itemTotal.toString(),
          specialInstructions: item.specialInstructions || null
        });
      }

      // Create order
      const orderNumber = `ORD-${Date.now()}`;
      const orderData = {
        orderNumber,
        branchId: orderInfo.branchId,
        tableId: orderInfo.type === 'table' ? orderInfo.id : null,
        roomId: orderInfo.type === 'room' ? orderInfo.id : null,
        orderType: orderInfo.type,
        customerName,
        customerPhone,
        subtotal: subtotal.toString(),
        taxAmount: "0",
        totalAmount: subtotal.toString(),
        notes,
        createdById: null // No staff member created this order
      };

      const order = await restaurantStorage.createRestaurantOrder(orderData, orderItems);

      res.status(201).json({
        message: "Order placed successfully",
        orderNumber: order.orderNumber,
        orderId: order.id
      });
    } catch (error) {
      console.error("Error submitting order:", error);
      res.status(500).json({ message: "Failed to submit order" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}