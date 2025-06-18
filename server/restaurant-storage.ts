import {
  restaurantTables,
  menuCategories,
  menuDishes,
  restaurantOrders,
  restaurantOrderItems,
  restaurantBills,
  taxes,
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
  type Tax,
  type InsertTax,
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

  async createRestaurantTablesBulk(tables: InsertRestaurantTable[]): Promise<RestaurantTable[]> {
    return await db.insert(restaurantTables).values(tables).returning();
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

  async createMenuCategoriesBulk(categories: InsertMenuCategory[]): Promise<MenuCategory[]> {
    return await db.insert(menuCategories).values(categories).returning();
  }

  // Menu Dishes
  async getMenuDishes(branchId?: number, categoryId?: number): Promise<any[]> {
    let conditions = [eq(menuDishes.isActive, true)];

    if (branchId) {
      conditions.push(eq(menuDishes.branchId, branchId));
    }

    if (categoryId) {
      conditions.push(eq(menuDishes.categoryId, categoryId));
    }

    return await db
      .select({
        id: menuDishes.id,
        name: menuDishes.name,
        price: menuDishes.price,
        image: menuDishes.image,
        categoryId: menuDishes.categoryId,
        branchId: menuDishes.branchId,
        description: menuDishes.description,
        ingredients: menuDishes.ingredients,
        isVegetarian: menuDishes.isVegetarian,
        isVegan: menuDishes.isVegan,
        spiceLevel: menuDishes.spiceLevel,
        preparationTime: menuDishes.preparationTime,
        isActive: menuDishes.isActive,
        sortOrder: menuDishes.sortOrder,
        createdAt: menuDishes.createdAt,
        updatedAt: menuDishes.updatedAt,
        category: {
          id: menuCategories.id,
          name: menuCategories.name,
          branchId: menuCategories.branchId,
          isActive: menuCategories.isActive,
          sortOrder: menuCategories.sortOrder,
          createdAt: menuCategories.createdAt,
          updatedAt: menuCategories.updatedAt,
        },
      })
      .from(menuDishes)
      .innerJoin(menuCategories, eq(menuDishes.categoryId, menuCategories.id))
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

  async createMenuDishesBulk(dishes: InsertMenuDish[]): Promise<MenuDish[]> {
    return await db.insert(menuDishes).values(dishes).returning();
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

  async getRestaurantOrderItems(orderId: string): Promise<any[]> {
    return await db
      .select({
        id: restaurantOrderItems.id,
        orderId: restaurantOrderItems.orderId,
        dishId: restaurantOrderItems.dishId,
        quantity: restaurantOrderItems.quantity,
        unitPrice: restaurantOrderItems.unitPrice,
        totalPrice: restaurantOrderItems.totalPrice,
        specialInstructions: restaurantOrderItems.specialInstructions,
        status: restaurantOrderItems.status,
        isKot: restaurantOrderItems.isKot,
        isBot: restaurantOrderItems.isBot,
        createdAt: restaurantOrderItems.createdAt,
        dish: {
          id: menuDishes.id,
          name: menuDishes.name,
          price: menuDishes.price,
          categoryId: menuDishes.categoryId,
          description: menuDishes.description,
          ingredients: menuDishes.ingredients,
          isVegetarian: menuDishes.isVegetarian,
          isVegan: menuDishes.isVegan,
          spiceLevel: menuDishes.spiceLevel,
          preparationTime: menuDishes.preparationTime,
        }
      })
      .from(restaurantOrderItems)
      .innerJoin(menuDishes, eq(restaurantOrderItems.dishId, menuDishes.id))
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

  async updateRestaurantOrderStatus(id: string, status: string, userId?: string): Promise<RestaurantOrder> {
    return await db.transaction(async (tx) => {
      // Get order details first to access tableId
      const [order] = await tx.select().from(restaurantOrders).where(eq(restaurantOrders.id, id));
      if (!order) throw new Error('Order not found');

      const updateData: any = { status, updatedAt: sql`NOW()` };

      if (status === 'served') {
        updateData.servedAt = sql`NOW()`;
      } else if (status === 'completed') {
        updateData.completedAt = sql`NOW()`;

        // Set table status back to open when order is completed
        await tx
          .update(restaurantTables)
          .set({ status: 'open', updatedAt: sql`NOW()` })
          .where(eq(restaurantTables.id, order.tableId));
      }

      const [result] = await tx
        .update(restaurantOrders)
        .set(updateData)
        .where(eq(restaurantOrders.id, id))
        .returning();
      return result;
    });
  }

  // Restaurant Bills
  async getRestaurantBills(branchId?: number): Promise<any[]> {
    let conditions = [];

    if (branchId) {
      conditions.push(eq(restaurantBills.branchId, branchId));
    }

    try {
      // Simple query to get bills first
      const bills = await db
        .select()
        .from(restaurantBills)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(restaurantBills.createdAt));

      // Manually fetch related data to avoid JOIN issues
      const billsWithRelations = [];

      for (const bill of bills) {
        let order = null;
        let table = null;

        try {
          // Get order data
          const orderResults = await db
            .select()
            .from(restaurantOrders)
            .where(eq(restaurantOrders.id, bill.orderId))
            .limit(1);

          if (orderResults.length > 0) {
            order = orderResults[0];
          }
        } catch (error) {
          console.error(`Error fetching order for bill ${bill.id}:`, error);
        }

        try {
          // Get table data
          const tableResults = await db
            .select()
            .from(restaurantTables)
            .where(eq(restaurantTables.id, bill.tableId))
            .limit(1);

          if (tableResults.length > 0) {
            table = tableResults[0];
          }
        } catch (error) {
          console.error(`Error fetching table for bill ${bill.id}:`, error);
        }

        billsWithRelations.push({
          ...bill,
          order,
          table,
        });
      }

      return billsWithRelations;
    } catch (error) {
      console.error('Error in getRestaurantBills:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }

  async getRestaurantBill(id: string): Promise<any | undefined> {
    const [bill] = await db
      .select({
        id: restaurantBills.id,
        billNumber: restaurantBills.billNumber,
        orderId: restaurantBills.orderId,
        tableId: restaurantBills.tableId,
        branchId: restaurantBills.branchId,
        customerName: restaurantBills.customerName,
        customerPhone: restaurantBills.customerPhone,
        subtotal: restaurantBills.subtotal,
        taxAmount: restaurantBills.taxAmount,
        taxPercentage: restaurantBills.taxPercentage,
        discountAmount: restaurantBills.discountAmount,
        discountPercentage: restaurantBills.discountPercentage,
        serviceChargeAmount: restaurantBills.serviceChargeAmount,
        serviceChargePercentage: restaurantBills.serviceChargePercentage,
        totalAmount: restaurantBills.totalAmount,
        paidAmount: restaurantBills.paidAmount,
        changeAmount: restaurantBills.changeAmount,
        paymentStatus: restaurantBills.paymentStatus,
        paymentMethod: restaurantBills.paymentMethod,
        notes: restaurantBills.notes,
        createdAt: restaurantBills.createdAt,
        updatedAt: restaurantBills.updatedAt,
        order: {
          id: restaurantOrders.id,
          orderNumber: restaurantOrders.orderNumber,
          tableId: restaurantOrders.tableId,
          status: restaurantOrders.status,
          totalAmount: restaurantOrders.totalAmount,
        },
        table: {
          id: restaurantTables.id,
          name: restaurantTables.name,
          capacity: restaurantTables.capacity,
        },
      })
      .from(restaurantBills)
      .leftJoin(restaurantOrders, eq(restaurantBills.orderId, restaurantOrders.id))
      .leftJoin(restaurantTables, eq(restaurantBills.tableId, restaurantTables.id))
      .where(eq(restaurantBills.id, id));

    if (!bill) return undefined;

    // Get order items if order exists
    if (bill.order?.id) {
      const items = await this.getRestaurantOrderItems(bill.order.id);
      bill.order.items = items;
    }

    return bill;
  }

  async createRestaurantBill(bill: InsertRestaurantBill): Promise<RestaurantBill> {
    // Ensure the bill data has all required fields
    const billData = {
      ...bill,
      billNumber: bill.billNumber || `BILL${Date.now().toString().slice(-8)}`,
    };

    const [result] = await db.insert(restaurantBills).values(billData).returning();
    return result;
  }

  async updateRestaurantBill(id: string, billData: Partial<any>): Promise<any> {
    const [updatedBill] = await db
      .update(restaurantBills)
      .set({ ...billData, updatedAt: new Date() })
      .where(eq(restaurantBills.id, id))
      .returning();

    if (!updatedBill) {
      throw new Error('Bill not found');
    }

    // Return the updated bill with related data
    const billWithRelations = await db
      .select()
      .from(restaurantBills)
      .where(eq(restaurantBills.id, id));

    if (billWithRelations.length === 0) {
      throw new Error('Bill not found after update');
    }

    const bill = billWithRelations[0];

    // Get order data
    const [order] = await db
      .select()
      .from(restaurantOrders)
      .where(eq(restaurantOrders.id, bill.orderId));

    // Get table data
    const [table] = await db
      .select()
      .from(restaurantTables)
      .where(eq(restaurantTables.id, bill.tableId));

    return {
      ...bill,
      order: order || null,
      table: table || null,
    };
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

  async deleteBill(id: string): Promise<void> {
    await db.delete(restaurantBills).where(eq(restaurantBills.id, id));
  }

  // Tax/Charges Management
  async getTaxes(): Promise<Tax[]> {
    return await db
      .select()
      .from(taxes)
      .orderBy(taxes.taxName);
  }

  async getActiveTaxes(): Promise<Tax[]> {
    return await db
      .select()
      .from(taxes)
      .where(eq(taxes.status, 'active'))
      .orderBy(taxes.taxName);
  }

  async getActiveReservationTaxes(): Promise<Tax[]> {
    return await db
      .select()
      .from(taxes)
      .where(and(
        eq(taxes.status, 'active'),
        eq(taxes.applyToReservations, true)
      ))
      .orderBy(taxes.taxName);
  }

  async getActiveOrderTaxes(): Promise<Tax[]> {
    return await db
      .select()
      .from(taxes)
      .where(and(
        eq(taxes.status, 'active'),
        eq(taxes.applyToOrders, true)
      ))
      .orderBy(taxes.taxName);
  }

  async getTax(id: number): Promise<Tax | undefined> {
    const [tax] = await db.select().from(taxes).where(eq(taxes.id, id));
    return tax;
  }

  async createTax(tax: InsertTax): Promise<Tax> {
    const [result] = await db.insert(taxes).values(tax).returning();
    return result;
  }

  async updateTax(id: number, tax: Partial<InsertTax>): Promise<Tax> {
    const [result] = await db
      .update(taxes)
      .set({ ...tax, updatedAt: new Date() })
      .where(eq(taxes.id, id))
      .returning();
    return result;
  }

  async deleteTax(id: number): Promise<void> {
    await db.delete(taxes).where(eq(taxes.id, id));
  }

  // Restaurant Analytics Methods
  async getRevenueAnalytics(branchId?: number, period: string = '30d'): Promise<{
    totalRevenue: number;
    dailyRevenue: Array<{ date: string; revenue: number }>;
    hourlyRevenue: Array<{ hour: number; revenue: number }>;
    revenueGrowth: number;
  }> {
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    startDate.setHours(0, 0, 0, 0); // Ensure start date is at the beginning of the day

    let baseQuery = db
      .select({
        date: sql<string>`DATE(${restaurantOrders.createdAt})`,
        revenue: sql<number>`COALESCE(SUM(CAST(${restaurantOrders.totalAmount} AS DECIMAL)), 0)`
      })
      .from(restaurantOrders)
      .where(
        and(
          sql`${restaurantOrders.createdAt} >= ${startDate.toISOString()}`,
          eq(restaurantOrders.paymentStatus, 'paid')
        )
      )
      .groupBy(sql`DATE(${restaurantOrders.createdAt})`)
      .orderBy(sql`DATE(${restaurantOrders.createdAt})`);

    if (branchId) {
      baseQuery = baseQuery.where(eq(restaurantOrders.branchId, branchId));
    }

    const dailyRevenue = await baseQuery;

    // Hourly revenue
    let hourlyQuery = db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${restaurantOrders.createdAt})`,
        revenue: sql<number>`COALESCE(SUM(CAST(${restaurantOrders.totalAmount} AS DECIMAL)), 0)`
      })
      .from(restaurantOrders)
      .where(
        and(
          sql`${restaurantOrders.createdAt} >= ${startDate.toISOString()}`,
          eq(restaurantOrders.paymentStatus, 'paid')
        )
      )
      .groupBy(sql`EXTRACT(HOUR FROM ${restaurantOrders.createdAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${restaurantOrders.createdAt})`);

    if (branchId) {
      hourlyQuery = hourlyQuery.where(eq(restaurantOrders.branchId, branchId));
    }

    const hourlyRevenue = await hourlyQuery;

    const currentRevenue = dailyRevenue.reduce((sum, day) => sum + Number(day.revenue), 0);

    // Calculate growth (comparing current period to the previous period of the same length)
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - periodDays);

    let previousRevenueQuery = db
      .select({
        revenue: sql<number>`COALESCE(SUM(CAST(${restaurantOrders.totalAmount} AS DECIMAL)), 0)`
      })
      .from(restaurantOrders)
      .where(
        and(
          sql`${restaurantOrders.createdAt} >= ${previousStartDate.toISOString()}`,
          sql`${restaurantOrders.createdAt} < ${startDate.toISOString()}`,
          eq(restaurantOrders.paymentStatus, 'paid')
        )
      );

    if (branchId) {
      previousRevenueQuery = previousRevenueQuery.where(eq(restaurantOrders.branchId, branchId));
    }

    const [{ revenue: previousRevenue }] = await previousRevenueQuery;

    const revenueGrowth = previousRevenue
      ? ((currentRevenue - Number(previousRevenue)) / Number(previousRevenue)) * 100
      : 0;

    return {
      totalRevenue: currentRevenue,
      dailyRevenue,
      hourlyRevenue,
      revenueGrowth
    };
  }

  async getOrderAnalytics(branchId?: number, period: string = '30d'): Promise<{
    totalOrders: number;
    ordersToday: number;
    averageOrderValue: number;
    dailyOrders: Array<{ date: string; orders: number }>;
    ordersByStatus: Array<{ status: string; count: number }>;
  }> {
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    let totalOrdersQuery = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(restaurantOrders)
      .where(sql`${restaurantOrders.createdAt} >= ${startDate.toISOString()}`);

    if (branchId) {
      totalOrdersQuery = totalOrdersQuery.where(eq(restaurantOrders.branchId, branchId));
    }

    const [{ count: totalOrders }] = await totalOrdersQuery;

    // Daily orders
    let dailyOrdersQuery = db
      .select({
        date: sql<string>`DATE(${restaurantOrders.createdAt})`,
        orders: sql<number>`COUNT(*)`
      })
      .from(restaurantOrders)
      .where(sql`${restaurantOrders.createdAt} >= ${startDate.toISOString()}`)
      .groupBy(sql`DATE(${restaurantOrders.createdAt})`)
      .orderBy(sql`DATE(${restaurantOrders.createdAt})`);

    if (branchId) {
      dailyOrdersQuery = dailyOrdersQuery.where(eq(restaurantOrders.branchId, branchId));
    }

    const dailyOrders = await dailyOrdersQuery;

    // Orders by status
    let statusQuery = db
      .select({
        status: restaurantOrders.status,
        count: sql<number>`COUNT(*)`
      })
      .from(restaurantOrders)
      .where(sql`${restaurantOrders.createdAt} >= ${startDate.toISOString()}`)
      .groupBy(restaurantOrders.status);

    if (branchId) {
      statusQuery = statusQuery.where(eq(restaurantOrders.branchId, branchId));
    }

    const ordersByStatus = await statusQuery;

    // Today's orders
    const today = new Date().toISOString().split('T')[0];
    let todayQuery = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(restaurantOrders)
      .where(sql`DATE(${restaurantOrders.createdAt}) = ${today}`);

    if (branchId) {
      todayQuery = todayQuery.where(eq(restaurantOrders.branchId, branchId));
    }

    const [{ count: ordersToday }] = await todayQuery;

    // Average order value
    let avgQuery = db
      .select({ avg: sql<number>`COALESCE(AVG(CAST(${restaurantOrders.totalAmount} AS DECIMAL)), 0)` })
      .from(restaurantOrders)
      .where(
        and(
          sql`${restaurantOrders.createdAt} >= ${startDate.toISOString()}`,
          eq(restaurantOrders.paymentStatus, 'paid')
        )
      );

    if (branchId) {
      avgQuery = avgQuery.where(eq(restaurantOrders.branchId, branchId));
    }

    const [{ avg: averageOrderValue }] = await avgQuery;

    return {
      totalOrders,
      ordersToday,
      averageOrderValue,
      dailyOrders,
      ordersByStatus
    };
  }

  async getDishAnalytics(branchId?: number): Promise<{
    topDishes: Array<{ id: string; name: string; totalOrders: number; totalRevenue: number }>;
    categoryPerformance: Array<{ categoryName: string; totalRevenue: number; totalOrders: number }>;
  }> {
    // Top dishes
    let dishQuery = db
      .select({
        id: menuDishes.id,
        name: menuDishes.name,
        totalOrders: sql<number>`COUNT(${restaurantOrderItems.id})`,
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${restaurantOrderItems.totalPrice} AS DECIMAL)), 0)`
      })
      .from(menuDishes)
      .leftJoin(restaurantOrderItems, eq(menuDishes.id, restaurantOrderItems.dishId))
      .leftJoin(restaurantOrders, eq(restaurantOrderItems.orderId, restaurantOrders.id))
      .where(eq(restaurantOrders.paymentStatus, 'paid'))
      .groupBy(menuDishes.id, menuDishes.name)
      .orderBy(sql`COUNT(${restaurantOrderItems.id}) DESC`)
      .limit(10);

    if (branchId) {
      dishQuery = dishQuery.where(eq(menuDishes.branchId, branchId));
    }

    const topDishes = await dishQuery;

    // Category performance
    let categoryQuery = db
      .select({
        categoryName: menuCategories.name,
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${restaurantOrderItems.totalPrice} AS DECIMAL)), 0)`,
        totalOrders: sql<number>`COUNT(${restaurantOrderItems.id})`
      })
      .from(menuCategories)
      .leftJoin(menuDishes, eq(menuCategories.id, menuDishes.categoryId))
      .leftJoin(restaurantOrderItems, eq(menuDishes.id, restaurantOrderItems.dishId))
      .leftJoin(restaurantOrders, eq(restaurantOrderItems.orderId, restaurantOrders.id))
      .where(eq(restaurantOrders.paymentStatus, 'paid'))
      .groupBy(menuCategories.id, menuCategories.name)
      .orderBy(sql`SUM(CAST(${restaurantOrderItems.totalPrice} AS DECIMAL)) DESC`);

    if (branchId) {
      categoryQuery = categoryQuery.where(eq(menuCategories.branchId, branchId));
    }

    const categoryPerformance = await categoryQuery;

    return {
      topDishes,
      categoryPerformance
    };
  }

  async getTableAnalytics(branchId?: number): Promise<{
    tablePerformance: Array<{ tableName: string; totalRevenue: number; totalOrders: number }>;
    tableUtilization: Array<{ id: string; tableName: string; capacity: number; utilizationRate: number }>;
    averageTurnover: number;
  }> {
    // Table performance
    let performanceQuery = db
      .select({
        tableName: restaurantTables.name,
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${restaurantOrders.totalAmount} AS DECIMAL)), 0)`,
        totalOrders: sql<number>`COUNT(${restaurantOrders.id})`
      })
      .from(restaurantTables)
      .leftJoin(restaurantOrders, eq(restaurantTables.id, restaurantOrders.tableId))
      .where(eq(restaurantOrders.paymentStatus, 'paid'))
      .groupBy(restaurantTables.id, restaurantTables.name)
      .orderBy(sql`SUM(CAST(${restaurantOrders.totalAmount} AS DECIMAL)) DESC`);

    if (branchId) {
      performanceQuery = performanceQuery.where(eq(restaurantTables.branchId, branchId));
    }

    const tablePerformance = await performanceQuery;

    // Table utilization (simplified calculation)
    let utilizationQuery = db
      .select({
        id: restaurantTables.id,
        tableName: restaurantTables.name,
        capacity: restaurantTables.capacity,
        orderCount: sql<number>`COUNT(${restaurantOrders.id})`
      })
      .from(restaurantTables)
      .leftJoin(restaurantOrders, eq(restaurantTables.id, restaurantOrders.tableId))
      .groupBy(restaurantTables.id, restaurantTables.name, restaurantTables.capacity);

    if (branchId) {
      utilizationQuery = utilizationQuery.where(eq(restaurantTables.branchId, branchId));
    }

    const utilizationData = await utilizationQuery;

    const tableUtilization = utilizationData.map(table => ({
      ...table,
      utilizationRate: Math.min(Math.round((table.orderCount / 30) * 100), 100) // Simplified: orders per month as utilization
    }));

    // Average turnover (simplified)
    const averageTurnover = tablePerformance.length > 0 
      ? tablePerformance.reduce((sum, table) => sum + table.totalOrders, 0) / tablePerformance.length / 30 
      : 0;

    return {
      tablePerformance,
      tableUtilization,
      averageTurnover
    };
  }

  async getOperationalAnalytics(branchId?: number): Promise<{
    peakHours: Array<{ hour: number; orderCount: number }>;
    avgPreparationTime: number;
    avgServiceTime: number;
    cancellationRate: number;
    customerSatisfaction: number;
  }> {
    // Peak hours
    let peakHoursQuery = db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${restaurantOrders.createdAt})`,
        orderCount: sql<number>`COUNT(*)`
      })
      .from(restaurantOrders)
      .groupBy(sql`EXTRACT(HOUR FROM ${restaurantOrders.createdAt})`)
      .orderBy(sql`COUNT(*) DESC`);

    if (branchId) {
      peakHoursQuery = peakHoursQuery.where(eq(restaurantOrders.branchId, branchId));
    }

    const peakHours = await peakHoursQuery;

    // Cancellation rate
    let totalOrdersQuery = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(restaurantOrders);

    let cancelledOrdersQuery = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(restaurantOrders)
      .where(eq(restaurantOrders.status, 'cancelled'));

    if (branchId) {
      totalOrdersQuery = totalOrdersQuery.where(eq(restaurantOrders.branchId, branchId));
      cancelledOrdersQuery = cancelledOrdersQuery.where(eq(restaurantOrders.branchId, branchId));
    }

    const [{ count: totalOrders }] = await totalOrdersQuery;
    const [{ count: cancelledOrders }] = await cancelledOrdersQuery;

    const cancellationRate = totalOrders > 0 ? (cancelledOrders / totalOrders) * 100 : 0;

    return {
      peakHours,
      avgPreparationTime: 15, // Mock data
      avgServiceTime: 25, // Mock data
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      customerSatisfaction: 4.2 // Mock data
    };
  }
}

export const restaurantStorage = new RestaurantStorage();