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

  async updateRestaurantOrderStatus(id: string, status: string): Promise<RestaurantOrder> {
    return await db.transaction(async (tx) => {
      const updateData: any = { status, updatedAt: sql`NOW()` };
      
      if (status === 'served') {
        updateData.servedAt = sql`NOW()`;
      } else if (status === 'completed') {
        updateData.completedAt = sql`NOW()`;
        
        // Get order details
        const [order] = await tx.select().from(restaurantOrders).where(eq(restaurantOrders.id, id));
        if (order) {
          // Set table status back to open when order is completed
          await tx
            .update(restaurantTables)
            .set({ status: 'open', updatedAt: sql`NOW()` })
            .where(eq(restaurantTables.id, order.tableId));

          // Check if bill already exists for this order
          const [existingBill] = await tx
            .select()
            .from(restaurantBills)
            .where(eq(restaurantBills.orderId, order.id));

          // Auto-generate bill if not exists
          if (!existingBill) {
            const billNumber = `BILL${Date.now().toString().slice(-8)}`;
            const subtotal = parseFloat(order.totalAmount || "0");
            const serviceChargeAmount = subtotal * 0.10; // 10% service charge
            const taxAmount = (subtotal + serviceChargeAmount) * 0.13; // 13% VAT
            const totalAmount = subtotal + serviceChargeAmount + taxAmount;

            await tx.insert(restaurantBills).values({
              billNumber,
              orderId: order.id,
              tableId: order.tableId,
              branchId: order.branchId,
              customerName: order.customerName || "",
              customerPhone: order.customerPhone || "",
              subtotal: subtotal.toString(),
              taxAmount: taxAmount.toString(),
              taxPercentage: "13",
              discountAmount: "0",
              discountPercentage: "0",
              serviceChargeAmount: serviceChargeAmount.toString(),
              serviceChargePercentage: "10",
              totalAmount: totalAmount.toString(),
              paidAmount: "0",
              changeAmount: "0",
              paymentStatus: "pending",
              paymentMethod: "cash",
              notes: "Auto-generated bill",
            });
          }
        }
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

    const bills = await db
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
      })
      .from(restaurantBills)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(restaurantBills.createdAt));

    // Get related order and table data for each bill
    const billsWithRelations = await Promise.all(
      bills.map(async (bill) => {
        const [order] = await db
          .select({
            id: restaurantOrders.id,
            orderNumber: restaurantOrders.orderNumber,
            tableId: restaurantOrders.tableId,
            status: restaurantOrders.status,
            totalAmount: restaurantOrders.totalAmount,
          })
          .from(restaurantOrders)
          .where(eq(restaurantOrders.id, bill.orderId));

        const [table] = await db
          .select({
            id: restaurantTables.id,
            name: restaurantTables.name,
            capacity: restaurantTables.capacity,
          })
          .from(restaurantTables)
          .where(eq(restaurantTables.id, bill.tableId));

        return {
          ...bill,
          order: order || null,
          table: table || null,
        };
      })
    );

    return billsWithRelations;
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