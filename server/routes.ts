import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
} from "@shared/schema";
import { z } from "zod";
import { NotificationService } from "./notifications";

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

  if (userRole === "branch-admin" || userRole === "front-desk") {
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
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  }));

  // Custom auth middleware
  const isAuthenticated = (req: any, res: any, next: any) => {
    if (req.session && req.session.user) {
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  };

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

      const users = await storage.getAllUsers();
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

      const userData = insertUserSchema.parse(req.body);
      const newUser = await storage.upsertUser(userData);
      res.status(201).json(newUser);
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
      const userData = insertUserSchema.partial().parse(req.body);
      const updatedUser = await storage.updateUser(userId, userData);
      res.json(updatedUser);
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
      if (!user) return res.status(401).json({ message: "User not found" });

      const { branchId: queryBranchId, status } = req.query;
      let branchId = user.role === "superadmin" ? 
        (queryBranchId ? parseInt(queryBranchId as string) : undefined) : 
        user.branchId!;

      const rooms = await storage.getRooms(branchId, status as string);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Failed to fetch rooms" });
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
      
      // Send maintenance notification if room status changed to maintenance
      if (roomData.status && (roomData.status === 'maintenance' || roomData.status === 'out-of-order')) {
        try {
          const branch = await storage.getBranch(existingRoom.branchId);
          const roomType = await storage.getRoomType(existingRoom.roomTypeId);
          
          if (branch && roomType) {
            await NotificationService.sendMaintenanceNotification(
              { ...existingRoom, roomType },
              branch,
              roomData.status
            );
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
        // Search guest by phone number
        const branchId = user.role === "superadmin" ? undefined : user.branchId!;
        const guests = await storage.searchGuests(phone as string, branchId);
        res.json(guests);
      } else {
        // Get all guests
        const branchId = user.role === "superadmin" ? undefined : user.branchId!;
        const guests = await storage.getGuests(branchId);
        res.json(guests);
      }
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

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const guests = await storage.searchGuests(query, branchId);
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

      const guestData = insertGuestSchema.parse(req.body);

      if (
        !checkBranchPermissions(user.role, user.branchId, guestData.branchId)
      ) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions for this branch" });
      }

      const guest = await storage.createGuest(guestData);
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

      // Check if user has permission for the guest's branch
      const existingGuest = await storage.getGuest(guestId);
      if (
        !existingGuest ||
        !checkBranchPermissions(user.role, user.branchId, existingGuest.branchId)
      ) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions for this guest" });
      }

      const guest = await storage.updateGuest(guestId, guestData);
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

      // Check if user has permission for the guest's branch
      const existingGuest = await storage.getGuest(guestId);
      if (
        !existingGuest ||
        !checkBranchPermissions(user.role, user.branchId, existingGuest.branchId)
      ) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions for this guest" });
      }

      // Instead of hard delete, we'll mark as inactive
      await storage.updateGuest(guestId, { isActive: false });
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

      // Generate confirmation number
      const confirmationNumber = `RES${Date.now().toString().slice(-8)}`;
      const reservationWithConfirmation = {
        ...reservationData,
        guestId: guest.id,
        confirmationNumber,
        createdById: user.id,
      };

      const reservation = await storage.createReservation(
        reservationWithConfirmation,
        roomsData,
      );

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
            reservationData.checkInDate,
            reservationData.checkOutDate
          );
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

      if (!existingReservation) {
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
      // Convert paidAmount to string if it's a number
      if (bodyData.paidAmount && typeof bodyData.paidAmount === 'number') {
        bodyData.paidAmount = bodyData.paidAmount.toString();
      }
      const validatedData = insertReservationSchema.partial().parse(bodyData);
      const reservation = await storage.updateReservation(
        reservationId,
        validatedData,
      );

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
            default:
              newRoomStatus = 'reserved';
          }
          await storage.updateRoom(roomReservation.roomId, { status: newRoomStatus as any });
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
        )
      ) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions for this branch" });
      }

      // Cancel the reservation and free up rooms
      await storage.updateReservation(reservationId, { status: "cancelled" });

      // Update room status back to available
      for (const roomReservation of existingReservation.reservationRooms) {
        await storage.updateRoom(roomReservation.roomId, { status: "available" });
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

  // Create a new reservation
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

      // Generate confirmation number
      const confirmationNumber = `RES${Date.now().toString().slice(-8)}`;
      const reservationWithConfirmation = {
        ...reservationData,
        guestId: guest.id,
        confirmationNumber,
        createdById: user.id,
      };

      const reservation = await storage.createReservation(
        reservationWithConfirmation,
        roomsData,
      );

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
            reservationData.checkInDate,
            reservationData.checkOutDate
          );
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

  // Update a reservation
  app.patch("/api/reservations/:id", isAuthenticated, async (req: any, res) => {
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
        )
      ) {
        return res
          .status(403)
          .json({ message: "Insufficient permissions for this branch" });
      }

      const bodyData = req.body;
      // Convert paidAmount to string if it's a number
      if (bodyData.paidAmount && typeof bodyData.paidAmount === 'number') {
        bodyData.paidAmount = bodyData.paidAmount.toString();
      }
      const validatedData = insertReservationSchema.partial().parse(bodyData);
      const reservation = await storage.updateReservation(
        reservationId,
        validatedData,
      );

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
            default:
              newRoomStatus = 'reserved';
          }
          await storage.updateRoom(roomReservation.roomId, { status: newRoomStatus as any });
        }

        // Send notifications for status changes
        try {
          const branch = await storage.getBranch(existingReservation.branchId);
          const firstRoom = existingReservation.reservationRooms[0];
          
          if (branch && firstRoom) {
            if (validatedData.status === 'checked-in') {
              await NotificationService.sendCheckInNotification(
                existingReservation.guest,
                firstRoom.room,
                branch,
                reservationId
              );
            } else if (validatedData.status === 'checked-out') {
              await NotificationService.sendCheckOutNotification(
                existingReservation.guest,
                firstRoom.room,
                branch,
                reservationId
              );
            }
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

  // Push notification routes
  app.get("/api/notifications/vapid-key", async (req, res) => {
    res.json({ publicKey: NotificationService.getVapidPublicKey() });
  });

  app.post("/api/notifications/subscribe", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      // Only allow admin users to subscribe to notifications
      if (user.role !== 'superadmin' && user.role !== 'branch-admin') {
        return res.status(403).json({ message: "Only admin users can subscribe to notifications" });
      }

      const { endpoint, p256dh, auth } = req.body;

      if (!endpoint || !p256dh || !auth) {
        return res.status(400).json({ message: "Missing required subscription data" });
      }

      // Check if subscription already exists
      const existingSubscription = await storage.getPushSubscription(user.id, endpoint);
      if (existingSubscription) {
        return res.json(existingSubscription);
      }

      // Create new subscription
      const subscription = await storage.createPushSubscription({
        userId: user.id,
        endpoint,
        p256dh,
        auth,
      });

      console.log(`✅ Push subscription created for user ${user.id}`);
      res.json(subscription);
    } catch (error) {
      console.error("Error creating push subscription:", error);
      res.status(500).json({ message: "Failed to create push subscription" });
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
      console.log(`✅ Push subscription deleted for user ${user.id}`);
      res.json({ message: "Unsubscribed successfully" });
    } catch (error) {
      console.error("Error deleting push subscription:", error);
      res.status(500).json({ message: "Failed to unsubscribe" });
    }
  });

  app.post("/api/notifications/test", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      // Only allow admin users to send test notifications
      if (user.role !== 'superadmin' && user.role !== 'branch-admin') {
        return res.status(403).json({ message: "Only admin users can send test notifications" });
      }

      await NotificationService.sendToAllAdmins({
        title: '🧪 Test Notification',
        body: `Test notification sent by ${user.firstName || user.email} at ${new Date().toLocaleString()}`,
        tag: 'test-notification',
        data: {
          type: 'test',
          timestamp: new Date().toISOString(),
        }
      });

      console.log(`✅ Test notification sent by user ${user.id}`);
      res.json({ message: "Test notification sent successfully" });
    } catch (error) {
      console.error("Error sending test notification:", error);
      res.status(500).json({ message: "Failed to send test notification" });
    }
  });

  app.post("/api/notifications/subscribe", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      // Only allow admin users to subscribe
      if (user.role !== "superadmin" && user.role !== "branch-admin") {
        return res.status(403).json({ message: "Only admin users can subscribe to notifications" });
      }

      const validatedData = insertPushSubscriptionSchema.parse({
        ...req.body,
        userId: user.id,
      });

      const subscription = await storage.createPushSubscription(validatedData);
      res.json(subscription);
    } catch (error) {
      console.error("Error creating push subscription:", error);
      res.status(500).json({ message: "Failed to create push subscription" });
    }
  });

  app.delete("/api/notifications/unsubscribe", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: "User not found" });

      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ message: "Endpoint is required" });
      }

      await storage.deletePushSubscription(user.id, endpoint);
      res.json({ message: "Unsubscribed successfully" });
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ message: "Failed to remove push subscription" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}