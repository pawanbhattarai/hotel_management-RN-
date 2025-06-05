import {
  users,
  branches,
  rooms,
  roomTypes,
  guests,
  reservations,
  reservationRooms,
  type User,
  type UpsertUser,
  type Branch,
  type InsertBranch,
  type Room,
  type InsertRoom,
  type RoomType,
  type InsertRoomType,
  type Guest,
  type InsertGuest,
  type Reservation,
  type InsertReservation,
  type ReservationRoom,
  type InsertReservationRoom,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, between, sql, ilike } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, user: Partial<UpsertUser>): Promise<User>;

  // Branch operations
  getBranches(): Promise<Branch[]>;
  getBranch(id: number): Promise<Branch | undefined>;
  createBranch(branch: InsertBranch): Promise<Branch>;
  updateBranch(id: number, branch: Partial<InsertBranch>): Promise<Branch>;

  // Room operations
  getRooms(branchId?: number): Promise<Room[]>;
  getRoom(id: number): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room>;
  getRoomsByBranch(branchId: number): Promise<Room[]>;

  // Room type operations
  getRoomTypes(branchId?: number): Promise<RoomType[]>;
  getRoomType(id: number): Promise<RoomType | undefined>;
  createRoomType(roomType: InsertRoomType): Promise<RoomType>;
  updateRoomType(id: number, roomType: Partial<InsertRoomType>): Promise<RoomType>;

  // Guest operations
  getGuests(branchId?: number): Promise<Guest[]>;
  getGuest(id: number): Promise<Guest | undefined>;
  createGuest(guest: InsertGuest): Promise<Guest>;
  updateGuest(id: number, guest: Partial<InsertGuest>): Promise<Guest>;
  searchGuests(query: string, branchId?: number): Promise<Guest[]>;

  // Reservation operations
  getReservations(branchId?: number): Promise<(Reservation & { guest: Guest; reservationRooms: (ReservationRoom & { room: Room & { roomType: RoomType } })[] })[]>;
  getReservation(id: string): Promise<(Reservation & { guest: Guest; reservationRooms: (ReservationRoom & { room: Room & { roomType: RoomType } })[] }) | undefined>;
  createReservation(reservation: InsertReservation, rooms: InsertReservationRoom[]): Promise<Reservation>;
  updateReservation(id: string, reservation: Partial<InsertReservation>): Promise<Reservation>;

  // Dashboard metrics
  getDashboardMetrics(branchId?: number): Promise<{
    totalReservations: number;
    occupancyRate: number;
    revenueToday: number;
    availableRooms: number;
    roomStatusCounts: Record<string, number>;
  }>;

  // Room availability
  getAvailableRooms(branchId: number, checkIn: string, checkOut: string): Promise<Room[]>;

    getUserByEmail(email: string): Promise<User | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations - mandatory for Replit Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true)).orderBy(users.firstName, users.lastName);
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Branch operations
  async getBranches(): Promise<Branch[]> {
    return await db.select().from(branches).where(eq(branches.isActive, true)).orderBy(branches.name);
  }

  async getBranch(id: number): Promise<Branch | undefined> {
    const [branch] = await db.select().from(branches).where(eq(branches.id, id));
    return branch;
  }

  async createBranch(branch: InsertBranch): Promise<Branch> {
    const [newBranch] = await db.insert(branches).values(branch).returning();
    return newBranch;
  }

  async updateBranch(id: number, branch: Partial<InsertBranch>): Promise<Branch> {
    const [updatedBranch] = await db
      .update(branches)
      .set({ ...branch, updatedAt: new Date() })
      .where(eq(branches.id, id))
      .returning();
    return updatedBranch;
  }

  // Room operations
  async getRooms(branchId?: number): Promise<Room[]> {
    let query = db.select().from(rooms).where(eq(rooms.isActive, true));
    if (branchId) {
      query = db.select().from(rooms).where(and(eq(rooms.isActive, true), eq(rooms.branchId, branchId)));
    }
    return await query.orderBy(rooms.number);
  }

  async getRoom(id: number): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    return room;
  }

  async createRoom(room: InsertRoom): Promise<Room> {
    const [newRoom] = await db.insert(rooms).values(room).returning();
    return newRoom;
  }

  async updateRoom(id: number, room: Partial<InsertRoom>): Promise<Room> {
    const [updatedRoom] = await db
      .update(rooms)
      .set({ ...room, updatedAt: new Date() })
      .where(eq(rooms.id, id))
      .returning();
    return updatedRoom;
  }

  async getRoomsByBranch(branchId: number): Promise<Room[]> {
    return await db
      .select()
      .from(rooms)
      .where(and(eq(rooms.branchId, branchId), eq(rooms.isActive, true)))
      .orderBy(rooms.number);
  }

  // Room type operations
  async getRoomTypes(branchId?: number): Promise<RoomType[]> {
    if (branchId) {
      // For specific branch, return both branch-specific and unassigned room types
      return await db.select().from(roomTypes)
        .where(and(
          eq(roomTypes.isActive, true),
          or(
            eq(roomTypes.branchId, branchId),
            sql`${roomTypes.branchId} IS NULL`
          )
        ))
        .orderBy(roomTypes.name);
    } else {
      // For superadmin, return all active room types
      return await db.select().from(roomTypes)
        .where(eq(roomTypes.isActive, true))
        .orderBy(roomTypes.name);
    }
  }

  async getRoomType(id: number): Promise<RoomType | undefined> {
    const [roomType] = await db.select().from(roomTypes).where(eq(roomTypes.id, id));
    return roomType;
  }

  async createRoomType(roomType: InsertRoomType): Promise<RoomType> {
    const [newRoomType] = await db.insert(roomTypes).values(roomType).returning();
    return newRoomType;
  }

  async updateRoomType(id: number, roomType: Partial<InsertRoomType>): Promise<RoomType> {
    const [updatedRoomType] = await db
      .update(roomTypes)
      .set({
        ...roomType,
        updatedAt: new Date(),
      })
      .where(eq(roomTypes.id, id))
      .returning();
    return updatedRoomType;
  }

  // Guest operations
  async getGuests(branchId?: number): Promise<Guest[]> {
    const query = db.select().from(guests);
    if (branchId) {
      query.where(eq(guests.branchId, branchId));
    }
    return await query.orderBy(desc(guests.createdAt));
  }

  async getGuest(id: number): Promise<Guest | undefined> {
    const [guest] = await db.select().from(guests).where(eq(guests.id, id));
    return guest;
  }

  async createGuest(guest: InsertGuest): Promise<Guest> {
    const [newGuest] = await db.insert(guests).values(guest).returning();
    return newGuest;
  }

  async updateGuest(id: number, guest: Partial<InsertGuest>): Promise<Guest> {
    const [updatedGuest] = await db
      .update(guests)
      .set({ ...guest, updatedAt: new Date() })
      .where(eq(guests.id, id))
      .returning();
    return updatedGuest;
  }

  async searchGuests(query: string, branchId?: number): Promise<Guest[]> {
    const searchCondition = or(
      ilike(guests.firstName, `%${query}%`),
      ilike(guests.lastName, `%${query}%`),
      ilike(guests.email, `%${query}%`),
      ilike(guests.phone, `%${query}%`)
    );

    const conditions = branchId 
      ? and(searchCondition, eq(guests.branchId, branchId))
      : searchCondition;

    return await db.select().from(guests).where(conditions).limit(10);
  }

  // Reservation operations
  async getReservations(branchId?: number): Promise<(Reservation & { guest: Guest; reservationRooms: (ReservationRoom & { room: Room & { roomType: RoomType } })[] })[]> {
    const query = db.query.reservations.findMany({
      with: {
        guest: true,
        reservationRooms: {
          with: {
            room: {
              with: {
                roomType: true,
              },
            },
          },
        },
      },
      where: branchId ? eq(reservations.branchId, branchId) : undefined,
      orderBy: desc(reservations.createdAt),
    });

    return await query;
  }

  async getReservation(id: string): Promise<(Reservation & { guest: Guest; reservationRooms: (ReservationRoom & { room: Room & { roomType: RoomType } })[] }) | undefined> {
    return await db.query.reservations.findFirst({
      with: {
        guest: true,
        reservationRooms: {
          with: {
            room: {
              with: {
                roomType: true,
              },
            },
          },
        },
      },
      where: eq(reservations.id, id),
    });
  }

  async createReservation(reservation: InsertReservation, roomsData: InsertReservationRoom[]): Promise<Reservation> {
    return await db.transaction(async (tx) => {
      const [newReservation] = await tx.insert(reservations).values(reservation).returning();

      const roomsWithReservationId = roomsData.map(room => ({
        ...room,
        reservationId: newReservation.id,
      }));

      await tx.insert(reservationRooms).values(roomsWithReservationId);

      return newReservation;
    });
  }

  async updateReservation(id: string, reservation: Partial<InsertReservation>): Promise<Reservation> {
    const [updatedReservation] = await db
      .update(reservations)
      .set({ ...reservation, updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();
    return updatedReservation;
  }

  // Dashboard metrics
  async getDashboardMetrics(branchId?: number): Promise<{
    totalReservations: number;
    occupancyRate: number;
    revenueToday: number;
    availableRooms: number;
    roomStatusCounts: Record<string, number>;
  }> {
    const today = new Date().toISOString().split('T')[0];

    // Total reservations
    let totalReservationsQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(reservations);

    if (branchId) {
      totalReservationsQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(reservations)
        .where(eq(reservations.branchId, branchId));
    }

    const [{ count: totalReservations }] = await totalReservationsQuery;

    // Room status counts
    let roomStatusQuery = db
      .select({
        status: rooms.status,
        count: sql<number>`count(*)`,
      })
      .from(rooms)
      .where(eq(rooms.isActive, true))
      .groupBy(rooms.status);

    if (branchId) {
      roomStatusQuery = db
        .select({
          status: rooms.status,
          count: sql<number>`count(*)`,
        })
        .from(rooms)
        .where(and(eq(rooms.isActive, true), eq(rooms.branchId, branchId)))
        .groupBy(rooms.status);
    }

    const roomStatusResults = await roomStatusQuery;
    const roomStatusCounts = roomStatusResults.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {} as Record<string, number>);

    // Calculate occupancy rate
    const totalRooms = Object.values(roomStatusCounts).reduce((sum, count) => sum + count, 0);
    const occupiedRooms = roomStatusCounts.occupied || 0;
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    // Revenue today (simplified - sum of paid amounts for today's check-ins)
    let revenueTodayQuery = db
      .select({ sum: sql<number>`COALESCE(SUM(${reservations.paidAmount}), 0)` })
      .from(reservations)
      .innerJoin(reservationRooms, eq(reservations.id, reservationRooms.reservationId))
      .where(eq(reservationRooms.checkInDate, today));

    if (branchId) {
      revenueTodayQuery = db
        .select({ sum: sql<number>`COALESCE(SUM(${reservations.paidAmount}), 0)` })
        .from(reservations)
        .innerJoin(reservationRooms, eq(reservations.id, reservationRooms.reservationId))
        .where(and(
          eq(reservationRooms.checkInDate, today),
          eq(reservations.branchId, branchId)
        ));
    }

    const [{ sum: revenueToday }] = await revenueTodayQuery;

    return {
      totalReservations,
      occupancyRate: Math.round(occupancyRate),
      revenueToday: revenueToday || 0,
      availableRooms: roomStatusCounts.available || 0,
      roomStatusCounts,
    };
  }

  // Room availability
  async getAvailableRooms(branchId: number, checkIn: string, checkOut: string): Promise<Room[]> {
    // Get rooms that are not reserved for the given date range
    const reservedRoomIds = db
      .select({ roomId: reservationRooms.roomId })
      .from(reservationRooms)
      .where(
        and(
          or(
            between(reservationRooms.checkInDate, checkIn, checkOut),
            between(reservationRooms.checkOutDate, checkIn, checkOut),
            and(
              sql`${reservationRooms.checkInDate} <= ${checkIn}`,
              sql`${reservationRooms.checkOutDate} >= ${checkOut}`
            )
          )
        )
      );

    return await db
      .select()
      .from(rooms)
      .where(
        and(
          eq(rooms.branchId, branchId),
          eq(rooms.isActive, true),
          eq(rooms.status, 'available'),
          sql`${rooms.id} NOT IN ${reservedRoomIds}`
        )
      )
      .orderBy(rooms.number);
  }
}

export const storage = new DatabaseStorage();