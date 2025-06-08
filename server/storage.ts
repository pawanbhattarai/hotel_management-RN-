import {
  users,
  branches,
  rooms,
  roomTypes,
  guests,
  reservations,
  reservationRooms,
  hotelSettings,
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
  type HotelSettings,
  type InsertHotelSettings,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, between, sql, ilike, notInArray } from "drizzle-orm";

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
  getRooms(branchId?: number, status?: string): Promise<(Room & { roomType: RoomType; branch: Branch })[]>;
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

  // Super admin dashboard metrics (all branches)
  getSuperAdminDashboardMetrics(): Promise<{
    totalBranches: number;
    totalReservations: number;
    totalRevenue: number;
    totalRooms: number;
    branchMetrics: Array<{
      branchId: number;
      branchName: string;
      totalReservations: number;
      occupancyRate: number;
      revenue: number;
      availableRooms: number;
    }>;
  }>;

  // Room availability
  getAvailableRooms(branchId: number, checkIn: string, checkOut: string): Promise<Room[]>;

  // Hotel settings operations
  getHotelSettings(branchId?: number): Promise<HotelSettings | undefined>;
  upsertHotelSettings(settings: InsertHotelSettings): Promise<HotelSettings>;

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
  async getRooms(branchId?: number, status?: string): Promise<(Room & { roomType: RoomType; branch: Branch })[]> {
    const conditions = [eq(rooms.isActive, true)];

    if (branchId) {
      conditions.push(eq(rooms.branchId, branchId));
    }

    if (status) {
      conditions.push(sql`${rooms.status} = ${status}`);
    }

    const query = db.query.rooms.findMany({
      with: {
        roomType: true,
        branch: true,
      },
      where: and(...conditions),
      orderBy: [rooms.branchId, rooms.number],
    });

    return await query;
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
    return await db.select().from(rooms)
      .where(and(eq(rooms.branchId, branchId), eq(rooms.isActive, true)))
      .orderBy(rooms.number);
  }

  // Room type operations
  async getRoomTypes(branchId?: number): Promise<RoomType[]> {
    let conditions = [eq(roomTypes.isActive, true)];
    if (branchId) {
      conditions.push(eq(roomTypes.branchId, branchId));
    }
    return await db.select().from(roomTypes)
      .where(and(...conditions))
      .orderBy(roomTypes.name);
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
    let conditions = [eq(guests.isActive, true)];
    if (branchId) {
      conditions.push(eq(guests.branchId, branchId));
    }
    return await db.select().from(guests)
      .where(and(...conditions))
      .orderBy(desc(guests.createdAt));
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

      // Update guest reservation count
      await tx
        .update(guests)
        .set({
          reservationCount: sql`${guests.reservationCount} + 1`,
        })
        .where(eq(guests.id, reservation.guestId));

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
    
    // Total reservations (active reservations only)
    let totalReservationsQuery = db
      .select({ count: sql`count(*)`.as('count') })
      .from(reservations)
      .where(sql`${reservations.status} != 'cancelled'`);
    
    if (branchId) {
      totalReservationsQuery = totalReservationsQuery.where(eq(reservations.branchId, branchId));
    }
    
    const [{ count: totalReservations }] = await totalReservationsQuery;

    // Room status counts with proper filtering
    let roomStatusQuery = db
      .select({
        status: rooms.status,
        count: sql`count(*)`.as('count'),
      })
      .from(rooms)
      .where(eq(rooms.isActive, true))
      .groupBy(rooms.status);
      
    if (branchId) {
      roomStatusQuery = roomStatusQuery.where(eq(rooms.branchId, branchId));
    }
    
    const statusResults = await roomStatusQuery;
    const roomStatusCounts = statusResults.reduce((acc, { status, count }) => {
      acc[status] = Number(count);
      return acc;
    }, {} as Record<string, number>);

    const availableRooms = roomStatusCounts['available'] || 0;
    const occupiedRooms = roomStatusCounts['occupied'] || 0;
    const maintenanceRooms = roomStatusCounts['maintenance'] || 0;
    const totalRooms = availableRooms + occupiedRooms + maintenanceRooms;
    const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    // Revenue today - sum of paid amounts for today's reservations (check-ins today or active today)
    let revenueTodayQuery = db
      .select({ total: sql`COALESCE(SUM(CAST(${reservations.paidAmount} AS DECIMAL)), 0)`.as('total') })
      .from(reservations)
      .innerJoin(reservationRooms, eq(reservations.id, reservationRooms.reservationId))
      .where(
        and(
          sql`DATE(${reservationRooms.checkInDate}) <= ${today}`,
          sql`DATE(${reservationRooms.checkOutDate}) >= ${today}`,
          sql`${reservations.status} != 'cancelled'`
        )
      );
      
    if (branchId) {
      revenueTodayQuery = revenueTodayQuery.where(eq(reservations.branchId, branchId));
    }
      
    const [{ total: revenueToday }] = await revenueTodayQuery;

    return {
      totalReservations: Number(totalReservations),
      occupancyRate: Math.round(occupancyRate * 100) / 100,
      revenueToday: Number(revenueToday || 0),
      availableRooms,
      roomStatusCounts,
    };
  }

  // Super admin dashboard metrics
  async getSuperAdminDashboardMetrics(): Promise<{
    totalBranches: number;
    totalReservations: number;
    totalRevenue: number;
    totalRooms: number;
    branchMetrics: Array<{
      branchId: number;
      branchName: string;
      totalReservations: number;
      occupancyRate: number;
      revenue: number;
      availableRooms: number;
    }>;
  }> {
    // Get all branches
    const branchesData = await db.select().from(branches).where(eq(branches.isActive, true));
    
    // Get global metrics - total active reservations
    const [{ count: totalReservations }] = await db
      .select({ count: sql`count(*)`.as('count') })
      .from(reservations)
      .where(sql`${reservations.status} != 'cancelled'`);
      
    // Total revenue from all active reservations today
    const today = new Date().toISOString().split('T')[0];
    const [{ total: totalRevenue }] = await db
      .select({ total: sql`COALESCE(SUM(CAST(${reservations.paidAmount} AS DECIMAL)), 0)`.as('total') })
      .from(reservations)
      .innerJoin(reservationRooms, eq(reservations.id, reservationRooms.reservationId))
      .where(
        and(
          sql`DATE(${reservationRooms.checkInDate}) <= ${today}`,
          sql`DATE(${reservationRooms.checkOutDate}) >= ${today}`,
          sql`${reservations.status} != 'cancelled'`
        )
      );
      
    const [{ count: totalRooms }] = await db
      .select({ count: sql`count(*)`.as('count') })
      .from(rooms)
      .where(eq(rooms.isActive, true));

    // Get metrics per branch
    const branchMetrics = await Promise.all(
      branchesData.map(async (branch) => {
        const metrics = await this.getDashboardMetrics(branch.id);
        
        return {
          branchId: branch.id,
          branchName: branch.name,
          totalReservations: metrics.totalReservations,
          occupancyRate: metrics.occupancyRate,
          revenue: metrics.revenueToday,
          availableRooms: metrics.availableRooms,
        };
      })
    );

    return {
      totalBranches: branchesData.length,
      totalReservations: Number(totalReservations),
      totalRevenue: Number(totalRevenue),
      totalRooms: Number(totalRooms),
      branchMetrics,
    };
  }

  // Room availability
  async getAvailableRooms(branchId: number, checkIn: string, checkOut: string): Promise<Room[]> {
    const reservedRoomIds = await db
      .select({ roomId: reservationRooms.roomId })
      .from(reservationRooms)
      .where(
        or(
          and(
            sql`${reservationRooms.checkInDate} <= ${checkIn}`,
            sql`${reservationRooms.checkOutDate} > ${checkIn}`
          ),
          and(
            sql`${reservationRooms.checkInDate} < ${checkOut}`,
            sql`${reservationRooms.checkOutDate} >= ${checkOut}`
          ),
          and(
            sql`${reservationRooms.checkInDate} >= ${checkIn}`,
            sql`${reservationRooms.checkOutDate} <= ${checkOut}`
          )
        )
      );

    const reservedIds = reservedRoomIds.map(r => r.roomId);

    const availableRoomsQuery = db
      .select()
      .from(rooms)
      .where(
        and(
          eq(rooms.branchId, branchId),
          eq(rooms.isActive, true),
          sql`${rooms.status} = 'available'`,
          reservedIds.length > 0 ? notInArray(rooms.id, reservedIds) : sql`1=1`
        )
      );

    return await availableRoomsQuery;
  }

  // Hotel settings operations
  async getHotelSettings(branchId?: number): Promise<HotelSettings | undefined> {
    const [settings] = await db
      .select()
      .from(hotelSettings)
      .where(
        branchId
          ? eq(hotelSettings.branchId, branchId)
          : sql`${hotelSettings.branchId} IS NULL`
      )
      .orderBy(desc(hotelSettings.createdAt))
      .limit(1);
    return settings;
  }

  async upsertHotelSettings(settings: InsertHotelSettings): Promise<HotelSettings> {
    const existingSettings = await this.getHotelSettings(settings.branchId || undefined);
    
    if (existingSettings) {
      const [updatedSettings] = await db
        .update(hotelSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(hotelSettings.id, existingSettings.id))
        .returning();
      return updatedSettings;
    } else {
      const [newSettings] = await db
        .insert(hotelSettings)
        .values(settings)
        .returning();
      return newSettings;
    }
  }
}

export const storage = new DatabaseStorage();