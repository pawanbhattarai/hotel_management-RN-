import {
  restaurantTables,
  menuCategories,
  menuDishes,
  restaurantOrders,
  restaurantOrderItems,
  restaurantBills,
  type RestaurantTable,
  type InsertRestaurantTable,
  type MenuCategory,
  type InsertMenuCategory,
  type MenuDish,
  type InsertMenuDish,
  type RestaurantOrder,
  type InsertRestaurantOrder,
  type RestaurantOrderItem,
  type InsertRestaurantOrderItem,
  type RestaurantBill,
  type InsertRestaurantBill,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, ilike } from "drizzle-orm";

export class RestaurantStorage {
  // Restaurant Tables
  async getRestaurantTables(branchId?: number): Promise<RestaurantTable[]> {
    if (branchId) {
      return await db
        .select()
        .from(restaurantTables)
        .where(and(eq(restaurantTables.isActive, true), eq(restaurantTables.branchId, branchId)))
        .orderBy(restaurantTables.name);
    }
    
    return await db
      .select()
      .from(restaurantTables)
      .where(eq(restaurantTables.isActive, true))
      .orderBy(restaurantTables.name);
  }

  async getRestaurantTable(id: number): Promise<RestaurantTable | undefined> {
    const [table] = await db.select().from(restaurantTables).where(eq(restaurantTables.id, id));
    return table;
  }

  async createRestaurantTable(table: InsertRestaurantTable): Promise<RestaurantTable> {
    const [result] = await db.insert(restaurantTables).values(table).returning();
    return result;
  }

  async updateRestaurantTable(id: number, table: Partial<InsertRestaurantTable>): Promise<RestaurantTable> {
    const [result] = await db
      .update(restaurantTables)
      .set({ ...table, updatedAt: sql`NOW()` })
      .where(eq(restaurantTables.id, id))
      .returning();
    return result;
  }

  async deleteRestaurantTable(id: number): Promise<void> {
    await db
      .update(restaurantTables)
      .set({ isActive: false, updatedAt: sql`NOW()` })
      .where(eq(restaurantTables.id, id));
  }

  // Menu Categories
  async getMenuCategories(branchId?: number): Promise<MenuCategory[]> {
    if (branchId) {
      return await db
        .select()
        .from(menuCategories)
        .where(and(eq(menuCategories.isActive, true), eq(menuCategories.branchId, branchId)))
        .orderBy(menuCategories.sortOrder, menuCategories.name);
    }
    
    return await db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.isActive, true))
      .orderBy(menuCategories.sortOrder, menuCategories.name);
  }

  async getMenuCategory(id: number): Promise<MenuCategory | undefined> {
    const [category] = await db.select().from(menuCategories).where(eq(menuCategories.id, id));
    return category;
  }

  async createMenuCategory(category: InsertMenuCategory): Promise<MenuCategory> {
    const [result] = await db.insert(menuCategories).values(category).returning();
    return result;
  }

  async updateMenuCategory(id: number, category: Partial<InsertMenuCategory>): Promise<MenuCategory> {
    const [result] = await db
      .update(menuCategories)
      .set({ ...category, updatedAt: sql`NOW()` })
      .where(eq(menuCategories.id, id))
      .returning();
    return result;
  }

  async deleteMenuCategory(id: number): Promise<void> {
    await db
      .update(menuCategories)
      .set({ isActive: false, updatedAt: sql`NOW()` })
      .where(eq(menuCategories.id, id));
  }

  // Menu Dishes
  async getMenuDishes(branchId?: number, categoryId?: number): Promise<MenuDish[]> {
    let conditions = [eq(menuDishes.isActive, true)];
    
    if (branchId) {
      conditions.push(eq(menuDishes.branchId, branchId));
    }
    
    if (categoryId) {
      conditions.push(eq(menuDishes.categoryId, categoryId));
    }
    
    return await db
      .select()
      .from(menuDishes)
      .where(and(...conditions))
      .orderBy(menuDishes.sortOrder, menuDishes.name);
  }

  async getMenuDish(id: number): Promise<MenuDish | undefined> {
    const [dish] = await db.select().from(menuDishes).where(eq(menuDishes.id, id));
    return dish;
  }

  async createMenuDish(dish: InsertMenuDish): Promise<MenuDish> {
    const [result] = await db.insert(menuDishes).values(dish).returning();
    return result;
  }

  async updateMenuDish(id: number, dish: Partial<InsertMenuDish>): Promise<MenuDish> {
    const [result] = await db
      .update(menuDishes)
      .set({ ...dish, updatedAt: sql`NOW()` })
      .where(eq(menuDishes.id, id))
      .returning();
    return result;
  }

  async deleteMenuDish(id: number): Promise<void> {
    await db
      .update(menuDishes)
      .set({ isActive: false, updatedAt: sql`NOW()` })
      .where(eq(menuDishes.id, id));
  }

  // Restaurant Orders
  async getRestaurantOrders(branchId?: number, status?: string): Promise<RestaurantOrder[]> {
    let conditions = [];
    
    if (branchId) {
      conditions.push(eq(restaurantOrders.branchId, branchId));
    }
    
    if (status) {
      conditions.push(eq(restaurantOrders.status, status as any));
    }

    return await db
      .select()
      .from(restaurantOrders)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(restaurantOrders.createdAt));
  }

  async getRestaurantOrder(id: string): Promise<RestaurantOrder | undefined> {
    const [order] = await db
      .select()
      .from(restaurantOrders)
      .where(eq(restaurantOrders.id, id));

    return order;
  }

  async getRestaurantOrderItems(orderId: string): Promise<RestaurantOrderItem[]> {
    return await db
      .select()
      .from(restaurantOrderItems)
      .where(eq(restaurantOrderItems.orderId, orderId));
  }

  async createRestaurantOrder(order: InsertRestaurantOrder, items: InsertRestaurantOrderItem[]): Promise<RestaurantOrder> {
    return await db.transaction(async (tx) => {
      // Create order
      const [newOrder] = await tx.insert(restaurantOrders).values(order).returning();
      
      // Create order items with the new order ID
      const orderItemsWithOrderId = items.map(item => ({
        ...item,
        orderId: newOrder.id,
      }));
      
      await tx.insert(restaurantOrderItems).values(orderItemsWithOrderId);
      
      // Update table status to occupied
      await tx
        .update(restaurantTables)
        .set({ status: 'occupied', updatedAt: sql`NOW()` })
        .where(eq(restaurantTables.id, order.tableId));
      
      return newOrder;
    });
  }

  async updateRestaurantOrder(id: string, order: Partial<InsertRestaurantOrder>): Promise<RestaurantOrder> {
    const [result] = await db
      .update(restaurantOrders)
      .set({ ...order, updatedAt: sql`NOW()` })
      .where(eq(restaurantOrders.id, id))
      .returning();
    return result;
  }

  async updateRestaurantOrderStatus(id: string, status: string): Promise<RestaurantOrder> {
    const updateData: any = { status, updatedAt: sql`NOW()` };
    
    if (status === 'served') {
      updateData.servedAt = sql`NOW()`;
    } else if (status === 'completed') {
      updateData.completedAt = sql`NOW()`;
      
      // Set table status back to open when order is completed
      const [order] = await db.select().from(restaurantOrders).where(eq(restaurantOrders.id, id));
      if (order) {
        await db
          .update(restaurantTables)
          .set({ status: 'open', updatedAt: sql`NOW()` })
          .where(eq(restaurantTables.id, order.tableId));
      }
    }

    const [result] = await db
      .update(restaurantOrders)
      .set(updateData)
      .where(eq(restaurantOrders.id, id))
      .returning();
    return result;
  }

  // Restaurant Bills
  async getRestaurantBills(branchId?: number): Promise<RestaurantBill[]> {
    if (branchId) {
      return await db
        .select()
        .from(restaurantBills)
        .where(eq(restaurantBills.branchId, branchId))
        .orderBy(desc(restaurantBills.createdAt));
    }

    return await db
      .select()
      .from(restaurantBills)
      .orderBy(desc(restaurantBills.createdAt));
  }

  async getRestaurantBill(id: string): Promise<RestaurantBill | undefined> {
    const [bill] = await db
      .select()
      .from(restaurantBills)
      .where(eq(restaurantBills.id, id));

    return bill;
  }

  async createRestaurantBill(bill: InsertRestaurantBill): Promise<RestaurantBill> {
    const [result] = await db.insert(restaurantBills).values(bill).returning();
    return result;
  }

  async updateRestaurantBill(id: string, bill: Partial<InsertRestaurantBill>): Promise<RestaurantBill> {
    const [result] = await db
      .update(restaurantBills)
      .set({ ...bill, updatedAt: sql`NOW()` })
      .where(eq(restaurantBills.id, id))
      .returning();
    return result;
  }

  // KOT/BOT Operations
  async generateKOT(orderId: string): Promise<{ kotItems: RestaurantOrderItem[]; orderNumber: string }> {
    return await db.transaction(async (tx) => {
      // Get order details
      const [order] = await tx.select().from(restaurantOrders).where(eq(restaurantOrders.id, orderId));
      if (!order) throw new Error('Order not found');

      // Get items that need KOT (not already generated)
      const kotItems = await tx
        .select()
        .from(restaurantOrderItems)
        .where(and(
          eq(restaurantOrderItems.orderId, orderId),
          eq(restaurantOrderItems.isKot, false)
        ));

      // Mark items as KOT generated
      if (kotItems.length > 0) {
        await tx
          .update(restaurantOrderItems)
          .set({ isKot: true })
          .where(and(
            eq(restaurantOrderItems.orderId, orderId),
            eq(restaurantOrderItems.isKot, false)
          ));

        // Mark order as KOT generated
        await tx
          .update(restaurantOrders)
          .set({ kotGenerated: true, kotGeneratedAt: sql`NOW()` })
          .where(eq(restaurantOrders.id, orderId));
      }

      return { 
        kotItems, 
        orderNumber: order.orderNumber 
      };
    });
  }

  async generateBOT(orderId: string): Promise<{ botItems: RestaurantOrderItem[]; orderNumber: string }> {
    return await db.transaction(async (tx) => {
      // Get order details
      const [order] = await tx.select().from(restaurantOrders).where(eq(restaurantOrders.id, orderId));
      if (!order) throw new Error('Order not found');

      // Get beverage items that need BOT (beverages only)
      const botItems = await tx
        .select()
        .from(restaurantOrderItems)
        .where(and(
          eq(restaurantOrderItems.orderId, orderId),
          eq(restaurantOrderItems.isBot, false)
        ));

      // Mark items as BOT generated
      if (botItems.length > 0) {
        await tx
          .update(restaurantOrderItems)
          .set({ isBot: true })
          .where(and(
            eq(restaurantOrderItems.orderId, orderId),
            eq(restaurantOrderItems.isBot, false)
          ));

        // Mark order as BOT generated
        await tx
          .update(restaurantOrders)
          .set({ botGenerated: true, botGeneratedAt: sql`NOW()` })
          .where(eq(restaurantOrders.id, orderId));
      }

      return { 
        botItems, 
        orderNumber: order.orderNumber 
      };
    });
  }

  // Restaurant Dashboard Metrics
  async getRestaurantDashboardMetrics(branchId?: number): Promise<{
    totalOrders: number;
    totalRevenue: number;
    activeOrders: number;
    availableTables: number;
    tableStatusCounts: Record<string, number>;
  }> {
    const today = new Date().toISOString().split('T')[0];

    // Total orders today
    let totalOrdersConditions = [sql`DATE(${restaurantOrders.createdAt}) = ${today}`];
    if (branchId) {
      totalOrdersConditions.push(eq(restaurantOrders.branchId, branchId));
    }

    const [{ count: totalOrders }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(restaurantOrders)
      .where(and(...totalOrdersConditions));

    // Total revenue today
    let totalRevenueConditions = [
      sql`DATE(${restaurantOrders.createdAt}) = ${today}`,
      eq(restaurantOrders.paymentStatus, 'paid')
    ];
    if (branchId) {
      totalRevenueConditions.push(eq(restaurantOrders.branchId, branchId));
    }

    const [{ sum: totalRevenue }] = await db
      .select({ sum: sql<number>`COALESCE(SUM(${restaurantOrders.totalAmount}), 0)` })
      .from(restaurantOrders)
      .where(and(...totalRevenueConditions));

    // Active orders (not completed or cancelled)
    let activeOrdersConditions = [sql`${restaurantOrders.status} NOT IN ('completed', 'cancelled')`];
    if (branchId) {
      activeOrdersConditions.push(eq(restaurantOrders.branchId, branchId));
    }

    const [{ count: activeOrders }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(restaurantOrders)
      .where(and(...activeOrdersConditions));

    // Table status counts
    let tableConditions = [eq(restaurantTables.isActive, true)];
    if (branchId) {
      tableConditions.push(eq(restaurantTables.branchId, branchId));
    }

    const tableStatusResults = await db
      .select({
        status: restaurantTables.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(restaurantTables)
      .where(and(...tableConditions))
      .groupBy(restaurantTables.status);

    const tableStatusCounts = tableStatusResults.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalOrders,
      totalRevenue: totalRevenue || 0,
      activeOrders,
      availableTables: tableStatusCounts.open || 0,
      tableStatusCounts,
    };
  }
}

export const restaurantStorage = new RestaurantStorage();