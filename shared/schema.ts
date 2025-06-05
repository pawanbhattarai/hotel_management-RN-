import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  date,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - mandatory for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["superadmin", "branch-admin", "front-desk"] }).notNull().default("front-desk"),
  branchId: integer("branch_id"),
  isActive: boolean("is_active").default(true),
  permissions: jsonb("permissions").default('[]'),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Branches table
export const branches = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Room types table
export const roomTypes = pgTable("room_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  maxOccupancy: integer("max_occupancy").notNull(),
  amenities: jsonb("amenities"),
  branchId: integer("branch_id"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Rooms table
export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  number: varchar("number", { length: 20 }).notNull(),
  floor: integer("floor"),
  roomTypeId: integer("room_type_id").notNull(),
  branchId: integer("branch_id").notNull(),
  status: varchar("status", { 
    enum: ["available", "occupied", "maintenance", "housekeeping", "out-of-order", "reserved"] 
  }).notNull().default("available"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Guests table
export const guests = pgTable("guests", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  idType: varchar("id_type", { enum: ["passport", "driving-license", "national-id"] }),
  idNumber: varchar("id_number", { length: 100 }),
  address: text("address"),
  dateOfBirth: date("date_of_birth"),
  nationality: varchar("nationality", { length: 100 }),
  branchId: integer("branch_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reservations table
export const reservations = pgTable("reservations", {
  id: uuid("id").defaultRandom().primaryKey(),
  confirmationNumber: varchar("confirmation_number", { length: 20 }).notNull().unique(),
  guestId: integer("guest_id").notNull(),
  branchId: integer("branch_id").notNull(),
  status: varchar("status", { 
    enum: ["confirmed", "pending", "checked-in", "checked-out", "cancelled", "no-show"] 
  }).notNull().default("pending"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  notes: text("notes"),
  createdById: varchar("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Reservation rooms table (for multiple rooms per reservation)
export const reservationRooms = pgTable("reservation_rooms", {
  id: serial("id").primaryKey(),
  reservationId: uuid("reservation_id").notNull(),
  roomId: integer("room_id").notNull(),
  checkInDate: date("check_in_date").notNull(),
  checkOutDate: date("check_out_date").notNull(),
  adults: integer("adults").notNull().default(1),
  children: integer("children").notNull().default(0),
  ratePerNight: decimal("rate_per_night", { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  specialRequests: text("special_requests"),
  actualCheckIn: timestamp("actual_check_in"),
  actualCheckOut: timestamp("actual_check_out"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  branch: one(branches, {
    fields: [users.branchId],
    references: [branches.id],
  }),
}));

export const branchesRelations = relations(branches, ({ many }) => ({
  users: many(users),
  rooms: many(rooms),
  roomTypes: many(roomTypes),
  guests: many(guests),
  reservations: many(reservations),
}));

export const roomTypesRelations = relations(roomTypes, ({ one, many }) => ({
  branch: one(branches, {
    fields: [roomTypes.branchId],
    references: [branches.id],
  }),
  rooms: many(rooms),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  roomType: one(roomTypes, {
    fields: [rooms.roomTypeId],
    references: [roomTypes.id],
  }),
  branch: one(branches, {
    fields: [rooms.branchId],
    references: [branches.id],
  }),
  reservationRooms: many(reservationRooms),
}));

export const guestsRelations = relations(guests, ({ one, many }) => ({
  branch: one(branches, {
    fields: [guests.branchId],
    references: [branches.id],
  }),
  reservations: many(reservations),
}));

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
  guest: one(guests, {
    fields: [reservations.guestId],
    references: [guests.id],
  }),
  branch: one(branches, {
    fields: [reservations.branchId],
    references: [branches.id],
  }),
  createdBy: one(users, {
    fields: [reservations.createdById],
    references: [users.id],
  }),
  reservationRooms: many(reservationRooms),
}));

export const reservationRoomsRelations = relations(reservationRooms, ({ one }) => ({
  reservation: one(reservations, {
    fields: [reservationRooms.reservationId],
    references: [reservations.id],
  }),
  room: one(rooms, {
    fields: [reservationRooms.roomId],
    references: [rooms.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertBranchSchema = createInsertSchema(branches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRoomTypeSchema = createInsertSchema(roomTypes).omit({
  id: true,
  createdAt: true,
});

export const insertRoomSchema = createInsertSchema(rooms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGuestSchema = createInsertSchema(guests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReservationSchema = createInsertSchema(reservations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReservationRoomSchema = createInsertSchema(reservationRooms).omit({
  id: true,
  createdAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type RoomType = typeof roomTypes.$inferSelect;
export type InsertRoomType = z.infer<typeof insertRoomTypeSchema>;
export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;
export type Guest = typeof guests.$inferSelect;
export type InsertGuest = z.infer<typeof insertGuestSchema>;
export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type ReservationRoom = typeof reservationRooms.$inferSelect;
export type InsertReservationRoom = z.infer<typeof insertReservationRoomSchema>;