import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertBranchSchema,
  insertRoomSchema,
  insertRoomTypeSchema,
  insertGuestSchema,
  insertReservationSchema,
  insertReservationRoomSchema,
} from "@shared/schema";
import { z } from "zod";

// Helper function to check user permissions based on role and branch
function checkBranchPermissions(userRole: string, userBranchId: number | null, targetBranchId?: number) {
  if (userRole === "superadmin") return true;
  if (!targetBranchId) return true; // For operations that don't specify a branch
  return userBranchId === targetBranchId;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branches = await storage.getBranches();
      
      // Filter branches based on user role
      if (user.role === "superadmin") {
        res.json(branches);
      } else {
        const userBranch = branches.filter(b => b.id === user.branchId);
        res.json(userBranch);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
      res.status(500).json({ message: "Failed to fetch branches" });
    }
  });

  app.post("/api/branches", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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

  // Room routes
  app.get("/api/rooms", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const rooms = await storage.getRooms(branchId);
      res.json(rooms);
    } catch (error) {
      console.error("Error fetching rooms:", error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.post("/api/rooms", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !["superadmin", "branch-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const roomData = insertRoomSchema.parse(req.body);
      
      if (!checkBranchPermissions(user.role, user.branchId, roomData.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this branch" });
      }

      const room = await storage.createRoom(roomData);
      res.status(201).json(room);
    } catch (error) {
      console.error("Error creating room:", error);
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.patch("/api/rooms/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) return res.status(401).json({ message: "User not found" });

      const roomId = parseInt(req.params.id);
      const existingRoom = await storage.getRoom(roomId);
      
      if (!existingRoom) {
        return res.status(404).json({ message: "Room not found" });
      }

      if (!checkBranchPermissions(user.role, user.branchId, existingRoom.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this branch" });
      }

      const roomData = insertRoomSchema.partial().parse(req.body);
      const room = await storage.updateRoom(roomId, roomData);
      res.json(room);
    } catch (error) {
      console.error("Error updating room:", error);
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  // Room type routes
  app.get("/api/room-types", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || !["superadmin", "branch-admin"].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const roomTypeData = insertRoomTypeSchema.parse(req.body);
      
      if (!checkBranchPermissions(user.role, user.branchId, roomTypeData.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this branch" });
      }

      const roomType = await storage.createRoomType(roomTypeData);
      res.status(201).json(roomType);
    } catch (error) {
      console.error("Error creating room type:", error);
      res.status(500).json({ message: "Failed to create room type" });
    }
  });

  // Guest routes
  app.get("/api/guests", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const guests = await storage.getGuests(branchId);
      res.json(guests);
    } catch (error) {
      console.error("Error fetching guests:", error);
      res.status(500).json({ message: "Failed to fetch guests" });
    }
  });

  app.get("/api/guests/search", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) return res.status(401).json({ message: "User not found" });

      const guestData = insertGuestSchema.parse(req.body);
      
      if (!checkBranchPermissions(user.role, user.branchId, guestData.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this branch" });
      }

      const guest = await storage.createGuest(guestData);
      res.status(201).json(guest);
    } catch (error) {
      console.error("Error creating guest:", error);
      res.status(500).json({ message: "Failed to create guest" });
    }
  });

  // Reservation routes
  app.get("/api/reservations", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) return res.status(401).json({ message: "User not found" });

      const reservation = await storage.getReservation(req.params.id);
      
      if (!reservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      if (!checkBranchPermissions(user.role, user.branchId, reservation.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this branch" });
      }

      res.json(reservation);
    } catch (error) {
      console.error("Error fetching reservation:", error);
      res.status(500).json({ message: "Failed to fetch reservation" });
    }
  });

  const createReservationSchema = z.object({
    reservation: insertReservationSchema,
    rooms: z.array(insertReservationRoomSchema),
  });

  app.post("/api/reservations", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) return res.status(401).json({ message: "User not found" });

      const { reservation: reservationData, rooms: roomsData } = createReservationSchema.parse(req.body);
      
      if (!checkBranchPermissions(user.role, user.branchId, reservationData.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this branch" });
      }

      // Generate confirmation number
      const confirmationNumber = `RES${Date.now().toString().slice(-8)}`;
      const reservationWithConfirmation = {
        ...reservationData,
        confirmationNumber,
        createdById: user.id,
      };

      const reservation = await storage.createReservation(reservationWithConfirmation, roomsData);
      res.status(201).json(reservation);
    } catch (error) {
      console.error("Error creating reservation:", error);
      res.status(500).json({ message: "Failed to create reservation" });
    }
  });

  app.patch("/api/reservations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) return res.status(401).json({ message: "User not found" });

      const reservationId = req.params.id;
      const existingReservation = await storage.getReservation(reservationId);
      
      if (!existingReservation) {
        return res.status(404).json({ message: "Reservation not found" });
      }

      if (!checkBranchPermissions(user.role, user.branchId, existingReservation.branchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this branch" });
      }

      const reservationData = insertReservationSchema.partial().parse(req.body);
      const reservation = await storage.updateReservation(reservationId, reservationData);
      res.json(reservation);
    } catch (error) {
      console.error("Error updating reservation:", error);
      res.status(500).json({ message: "Failed to update reservation" });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) return res.status(401).json({ message: "User not found" });

      const branchId = user.role === "superadmin" ? undefined : user.branchId!;
      const metrics = await storage.getDashboardMetrics(branchId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Room availability
  app.get("/api/rooms/availability", isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user) return res.status(401).json({ message: "User not found" });

      const { branchId, checkIn, checkOut } = req.query;
      
      if (!branchId || !checkIn || !checkOut) {
        return res.status(400).json({ message: "Missing required parameters" });
      }

      const targetBranchId = parseInt(branchId as string);
      
      if (!checkBranchPermissions(user.role, user.branchId, targetBranchId)) {
        return res.status(403).json({ message: "Insufficient permissions for this branch" });
      }

      const availableRooms = await storage.getAvailableRooms(
        targetBranchId,
        checkIn as string,
        checkOut as string
      );
      res.json(availableRooms);
    } catch (error) {
      console.error("Error fetching room availability:", error);
      res.status(500).json({ message: "Failed to fetch room availability" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
