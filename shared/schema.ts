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
  updatedAt: timestamp("updated_at").defaultNow(),
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
  reservationCount: integer("reservation_count").notNull().default(0),
  branchId: integer("branch_id").notNull(),
  isActive: boolean("is_active").default(true),
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

// Hotel settings table - for hotel information and billing details
export const hotelSettings = pgTable("hotel_settings", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id"), // null for global settings
  hotelName: varchar("hotel_name", { length: 255 }),
  hotelChain: varchar("hotel_chain", { length: 255 }),
  logo: text("logo"), // URL or base64
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  website: varchar("website", { length: 255 }),
  taxNumber: varchar("tax_number", { length: 100 }),
  registrationNumber: varchar("registration_number", { length: 100 }),
  checkInTime: varchar("check_in_time", { length: 10 }).default("15:00"),
  checkOutTime: varchar("check_out_time", { length: 10 }).default("11:00"),
  currency: varchar("currency", { length: 10 }).default("NPR"),
  timeZone: varchar("time_zone", { length: 50 }).default("Asia/Kathmandu"),
  billingFooter: text("billing_footer"),
  termsAndConditions: text("terms_and_conditions"),
  cancellationPolicy: text("cancellation_policy"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const hotelSettingsRelations = relations(hotelSettings, ({ one }) => ({
  branch: one(branches, {
    fields: [hotelSettings.branchId],
    references: [branches.id],
  }),
}));

// Push subscriptions table for browser notifications
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
}));

// Notification history table
export const notificationHistory = pgTable("notification_history", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { 
    enum: ["new-reservation", "check-in", "check-out", "maintenance"] 
  }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  data: jsonb("data"), // Additional context data
  isRead: boolean("is_read").default(false),
  reservationId: uuid("reservation_id").references(() => reservations.id),
  roomId: integer("room_id").references(() => rooms.id),
  branchId: integer("branch_id").references(() => branches.id),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  readAt: timestamp("read_at"),
});

export const notificationHistoryRelations = relations(notificationHistory, ({ one }) => ({
  user: one(users, {
    fields: [notificationHistory.userId],
    references: [users.id],
  }),
  reservation: one(reservations, {
    fields: [notificationHistory.reservationId],
    references: [reservations.id],
  }),
  room: one(rooms, {
    fields: [notificationHistory.roomId],
    references: [rooms.id],
  }),
  branch: one(branches, {
    fields: [notificationHistory.branchId],
    references: [branches.id],
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
  updatedAt: true,
}).extend({
  basePrice: z.union([z.string(), z.number()]).transform((val) => 
    typeof val === 'number' ? val.toString() : val
  ),
  branchId: z.union([z.number(), z.null()]).optional(),
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

export const insertHotelSettingsSchema = createInsertSchema(hotelSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationHistorySchema = createInsertSchema(notificationHistory).omit({
  id: true,
  sentAt: true,
});

// Restaurant Management System (RMS) Tables

// Restaurant tables for seating management
export const restaurantTables = pgTable("restaurant_tables", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  capacity: integer("capacity").notNull(),
  status: varchar("status", { 
    enum: ["open", "occupied", "maintenance"] 
  }).notNull().default("open"),
  branchId: integer("branch_id").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Menu categories
export const menuCategories = pgTable("menu_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  branchId: integer("branch_id").notNull(),
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Menu dishes
export const menuDishes = pgTable("menu_dishes", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  image: text("image"), // URL or path to image
  categoryId: integer("category_id").notNull(),
  branchId: integer("branch_id").notNull(),
  description: text("description"),
  ingredients: text("ingredients"),
  isVegetarian: boolean("is_vegetarian").default(false),
  isVegan: boolean("is_vegan").default(false),
  spiceLevel: varchar("spice_level", { 
    enum: ["mild", "medium", "hot", "extra-hot"] 
  }),
  preparationTime: integer("preparation_time"), // in minutes
  isActive: boolean("is_active").default(true),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Restaurant orders
export const restaurantOrders = pgTable("restaurant_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: varchar("order_number", { length: 20 }).notNull().unique(),
  tableId: integer("table_id").notNull(),
  branchId: integer("branch_id").notNull(),
  status: varchar("status", { 
    enum: ["pending", "confirmed", "preparing", "ready", "served", "completed", "cancelled"] 
  }).notNull().default("pending"),
  orderType: varchar("order_type", { 
    enum: ["dine-in", "takeaway", "delivery"] 
  }).notNull().default("dine-in"),
  customerName: varchar("customer_name", { length: 100 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  paymentStatus: varchar("payment_status", { 
    enum: ["pending", "partial", "paid"] 
  }).notNull().default("pending"),
  paymentMethod: varchar("payment_method", { 
    enum: ["cash", "card", "digital", "bank-transfer"] 
  }),
  notes: text("notes"),
  kotGenerated: boolean("kot_generated").default(false),
  botGenerated: boolean("bot_generated").default(false),
  kotGeneratedAt: timestamp("kot_generated_at"),
  botGeneratedAt: timestamp("bot_generated_at"),
  servedAt: timestamp("served_at"),
  completedAt: timestamp("completed_at"),
  createdById: text("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order items
export const restaurantOrderItems = pgTable("restaurant_order_items", {
  id: serial("id").primaryKey(),
  orderId: uuid("order_id").notNull(),
  dishId: integer("dish_id").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  specialInstructions: text("special_instructions"),
  status: varchar("status", { 
    enum: ["pending", "preparing", "ready", "served"] 
  }).notNull().default("pending"),
  isKot: boolean("is_kot").default(false), // Kitchen Order Ticket item
  isBot: boolean("is_bot").default(false), // Beverage Order Ticket item
  createdAt: timestamp("created_at").defaultNow(),
});

// Restaurant billing
export const restaurantBills = pgTable("restaurant_bills", {
  id: uuid("id").primaryKey().defaultRandom(),
  billNumber: varchar("bill_number", { length: 20 }).notNull().unique(),
  orderId: uuid("order_id").notNull(),
  tableId: integer("table_id").notNull(),
  branchId: integer("branch_id").notNull(),
  customerName: varchar("customer_name", { length: 100 }),
  customerPhone: varchar("customer_phone", { length: 20 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0"),
  taxPercentage: decimal("tax_percentage", { precision: 5, scale: 2 }).default("13"), // VAT in Nepal
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0"),
  discountPercentage: decimal("discount_percentage", { precision: 5, scale: 2 }).default("0"),
  serviceChargeAmount: decimal("service_charge_amount", { precision: 10, scale: 2 }).default("0"),
  serviceChargePercentage: decimal("service_charge_percentage", { precision: 5, scale: 2 }).default("10"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default("0"),
  changeAmount: decimal("change_amount", { precision: 10, scale: 2 }).default("0"),
  paymentStatus: varchar("payment_status", { 
    enum: ["pending", "partial", "paid"] 
  }).notNull().default("pending"),
  paymentMethod: varchar("payment_method", { 
    enum: ["cash", "card", "digital", "bank-transfer"] 
  }),
  isPrinted: boolean("is_printed").default(false),
  printedAt: timestamp("printed_at"),
  createdById: text("created_by_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Restaurant Relations
export const restaurantTablesRelations = relations(restaurantTables, ({ one, many }) => ({
  branch: one(branches, {
    fields: [restaurantTables.branchId],
    references: [branches.id],
  }),
  orders: many(restaurantOrders),
  bills: many(restaurantBills),
}));

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
  branch: one(branches, {
    fields: [menuCategories.branchId],
    references: [branches.id],
  }),
  dishes: many(menuDishes),
}));

export const menuDishesRelations = relations(menuDishes, ({ one, many }) => ({
  category: one(menuCategories, {
    fields: [menuDishes.categoryId],
    references: [menuCategories.id],
  }),
  branch: one(branches, {
    fields: [menuDishes.branchId],
    references: [branches.id],
  }),
  orderItems: many(restaurantOrderItems),
}));

export const restaurantOrdersRelations = relations(restaurantOrders, ({ one, many }) => ({
  table: one(restaurantTables, {
    fields: [restaurantOrders.tableId],
    references: [restaurantTables.id],
  }),
  branch: one(branches, {
    fields: [restaurantOrders.branchId],
    references: [branches.id],
  }),
  createdBy: one(users, {
    fields: [restaurantOrders.createdById],
    references: [users.id],
  }),
  items: many(restaurantOrderItems),
  bill: one(restaurantBills, {
    fields: [restaurantOrders.id],
    references: [restaurantBills.orderId],
  }),
}));

export const restaurantOrderItemsRelations = relations(restaurantOrderItems, ({ one }) => ({
  order: one(restaurantOrders, {
    fields: [restaurantOrderItems.orderId],
    references: [restaurantOrders.id],
  }),
  dish: one(menuDishes, {
    fields: [restaurantOrderItems.dishId],
    references: [menuDishes.id],
  }),
}));

export const restaurantBillsRelations = relations(restaurantBills, ({ one }) => ({
  order: one(restaurantOrders, {
    fields: [restaurantBills.orderId],
    references: [restaurantOrders.id],
  }),
  table: one(restaurantTables, {
    fields: [restaurantBills.tableId],
    references: [restaurantTables.id],
  }),
  branch: one(branches, {
    fields: [restaurantBills.branchId],
    references: [branches.id],
  }),
  createdBy: one(users, {
    fields: [restaurantBills.createdById],
    references: [users.id],
  }),
}));

// Restaurant Insert Schemas
export const insertRestaurantTableSchema = createInsertSchema(restaurantTables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMenuCategorySchema = createInsertSchema(menuCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMenuDishSchema = createInsertSchema(menuDishes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  price: z.union([z.string(), z.number()]).transform((val) => 
    typeof val === 'number' ? val.toString() : val
  ),
});

export const insertRestaurantOrderSchema = createInsertSchema(restaurantOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRestaurantOrderItemSchema = createInsertSchema(restaurantOrderItems).omit({
  id: true,
  createdAt: true,
});

export const insertRestaurantBillSchema = createInsertSchema(restaurantBills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
export type HotelSettings = typeof hotelSettings.$inferSelect;
export type InsertHotelSettings = z.infer<typeof insertHotelSettingsSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;
export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = z.infer<typeof insertNotificationHistorySchema>;

// Restaurant Types
export type RestaurantTable = typeof restaurantTables.$inferSelect;
export type InsertRestaurantTable = z.infer<typeof insertRestaurantTableSchema>;
export type MenuCategory = typeof menuCategories.$inferSelect;
export type InsertMenuCategory = z.infer<typeof insertMenuCategorySchema>;
export type MenuDish = typeof menuDishes.$inferSelect;
export type InsertMenuDish = z.infer<typeof insertMenuDishSchema>;
export type RestaurantOrder = typeof restaurantOrders.$inferSelect;
export type InsertRestaurantOrder = z.infer<typeof insertRestaurantOrderSchema>;
export type RestaurantOrderItem = typeof restaurantOrderItems.$inferSelect;
export type InsertRestaurantOrderItem = z.infer<typeof insertRestaurantOrderItemSchema>;
export type RestaurantBill = typeof restaurantBills.$inferSelect;
export type InsertRestaurantBill = z.infer<typeof insertRestaurantBillSchema>;