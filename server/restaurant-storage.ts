import {
  restaurantTables,
  menuCategories,
  menuDishes,
  restaurantOrders,
  restaurantOrderItems,
  restaurantBills,
  taxes,
  kotTickets,
  rooms,
  roomTypes,
  reservations,
  reservationRooms,
  guests,
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
  type KotTicket,
  type InsertKotTicket,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, sql, ilike, count, sum, gte, lt, isNotNull } from "drizzle-orm";

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
  async getRoomOrders(branchId?: number, status?: string): Promise<any[]> {
    let conditions = [eq(restaurantOrders.orderType, 'room')];
    
    if (branchId) {
      conditions.push(eq(restaurantOrders.branchId, branchId));
    }
    
    if (status) {
      conditions.push(eq(restaurantOrders.status, status as any));
    }

    const orders = await db
      .select()
      .from(restaurantOrders)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(restaurantOrders.createdAt));

    const ordersWithDetails = [];

    for (const order of orders) {
      let reservation = null;
      let items = [];
      let guest = null;

      // Get reservation details if reservationId exists
      if (order.reservationId) {
        try {
          const reservationQuery = await db
            .select()
            .from(reservations)
            .leftJoin(guests, eq(reservations.guestId, guests.id))
            .where(eq(reservations.id, order.reservationId))
            .limit(1);

          if (reservationQuery.length > 0) {
            reservation = reservationQuery[0].reservations;
            guest = reservationQuery[0].guests;
          }
        } catch (error) {
          console.error(`Error fetching reservation for order ${order.id}:`, error);
        }
      }

      // Get order items
      try {
        items = await this.getRestaurantOrderItems(order.id);
      } catch (error) {
        console.error(`Error fetching items for order ${order.id}:`, error);
      }

      ordersWithDetails.push({
        ...order,
        reservation,
        guest,
        items,
      });
    }

    return ordersWithDetails;

      try {
        // Get room details if roomId exists
        if (order.roomId) {
          const roomResults = await db
            .select({
              id: rooms.id,
              number: rooms.number,
              floor: rooms.floor,
              roomType: {
                id: roomTypes.id,
                name: roomTypes.name,
              }
            })
            .from(rooms)
            .innerJoin(roomTypes, eq(rooms.roomTypeId, roomTypes.id))
            .where(eq(rooms.id, order.roomId))
            .limit(1);

          if (roomResults.length > 0) {
            room = roomResults[0];
          }
        }
      } catch (error) {
        console.error(`Error fetching room for order ${order.id}:`, error);
      }

      try {
        // Get reservation details if reservationId exists
        if (order.reservationId) {
          const reservationResults = await db
            .select({
              id: reservations.id,
              guestId: reservations.guestId,
              status: reservations.status,
              guest: {
                firstName: guests.firstName,
                lastName: guests.lastName,
                phone: guests.phone,
                email: guests.email,
              }
            })
            .from(reservations)
            .innerJoin(guests, eq(reservations.guestId, guests.id))
            .where(eq(reservations.id, order.reservationId))
            .limit(1);

          if (reservationResults.length > 0) {
            reservation = reservationResults[0];
          }
        }
      } catch (error) {
        console.error(`Error fetching reservation for order ${order.id}:`, error);
      }

      try {
        // Get order items
        items = await this.getRestaurantOrderItems(order.id);
      } catch (error) {
        console.error(`Error fetching items for order ${order.id}:`, error);
      }

      ordersWithDetails.push({
        ...order,
        room,
        reservation,
        items,
      });
    }

    return ordersWithDetails;
  }

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

      const createdItems = await tx.insert(restaurantOrderItems).values(orderItemsWithOrderId).returning();

      // Process stock consumption for each item
      for (const item of createdItems) {
        if (item.dishId && item.quantity) {
          try {
            const { dishIngredientsStorage } = await import('./dish-ingredients-storage');
            await dishIngredientsStorage.processDishConsumption(
              item.dishId,
              item.quantity,
              item.orderId,
              item.id,
              order.branchId,
              order.createdById || 'system'
            );
          } catch (error) {
            console.error('Error processing dish consumption:', error);
            // Don't fail the order creation, just log the error
          }
        }
      }

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
  async generateKOT(orderId: string, createdById?: string): Promise<{ 
    kotNumber: string; 
    kotItems: (RestaurantOrderItem & { dish: { name: string } })[]; 
    kotTicket: KotTicket;
  }> {
    return await db.transaction(async (tx) => {
      // Get order details with table/room info
      const [order] = await tx
        .select({
          id: restaurantOrders.id,
          orderNumber: restaurantOrders.orderNumber,
          tableId: restaurantOrders.tableId,
          roomId: restaurantOrders.roomId,
          branchId: restaurantOrders.branchId,
          customerName: restaurantOrders.customerName,
          notes: restaurantOrders.notes,
        })
        .from(restaurantOrders)
        .where(eq(restaurantOrders.id, orderId));

      if (!order) throw new Error('Order not found');

      // Get items that need KOT (not already generated)
      const kotItems = await tx
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
          kotNumber: restaurantOrderItems.kotNumber,
          botNumber: restaurantOrderItems.botNumber,
          kotGeneratedAt: restaurantOrderItems.kotGeneratedAt,
          botGeneratedAt: restaurantOrderItems.botGeneratedAt,
          createdAt: restaurantOrderItems.createdAt,
          dish: {
            name: menuDishes.name,
          },
        })
        .from(restaurantOrderItems)
        .innerJoin(menuDishes, eq(restaurantOrderItems.dishId, menuDishes.id))
        .where(and(
          eq(restaurantOrderItems.orderId, orderId),
          eq(restaurantOrderItems.isKot, false)
        ));

      if (kotItems.length === 0) {
        throw new Error('No items available for KOT generation');
      }

      // Generate KOT number
      const kotNumber = `KOT-${Date.now()}`;

      // Create KOT ticket
      const [kotTicket] = await tx
        .insert(kotTickets)
        .values({
          kotNumber,
          orderId,
          tableId: order.tableId,
          roomId: order.roomId,
          branchId: order.branchId,
          customerName: order.customerName,
          itemCount: kotItems.length,
          notes: order.notes,
          createdById,
        })
        .returning();

      // Mark items as KOT generated with KOT number
      await tx
        .update(restaurantOrderItems)
        .set({ 
          isKot: true, 
          kotNumber,
          kotGeneratedAt: sql`NOW()`,
        })
        .where(and(
          eq(restaurantOrderItems.orderId, orderId),
          eq(restaurantOrderItems.isKot, false)
        ));

      // Update order status to confirmed when first KOT is generated
      await tx
        .update(restaurantOrders)
        .set({ 
          status: 'confirmed',
          updatedAt: sql`NOW()`
        })
        .where(eq(restaurantOrders.id, orderId));

      return { 
        kotNumber,
        kotItems,
        kotTicket,
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

  // KOT Management
  async getKotTickets(branchId?: number, status?: string): Promise<(KotTicket & { 
    table?: { name: string };
    order: { orderNumber: string };
    items: (RestaurantOrderItem & { dish: { name: string } })[];
  })[]> {
    let conditions = [];
    if (branchId) conditions.push(eq(kotTickets.branchId, branchId));
    if (status) conditions.push(eq(kotTickets.status, status));

    const tickets = await db
      .select({
        id: kotTickets.id,
        kotNumber: kotTickets.kotNumber,
        orderId: kotTickets.orderId,
        tableId: kotTickets.tableId,
        roomId: kotTickets.roomId,
        branchId: kotTickets.branchId,
        customerName: kotTickets.customerName,
        status: kotTickets.status,
        itemCount: kotTickets.itemCount,
        notes: kotTickets.notes,
        createdById: kotTickets.createdById,
        printedAt: kotTickets.printedAt,
        startedAt: kotTickets.startedAt,
        completedAt: kotTickets.completedAt,
        servedAt: kotTickets.servedAt,
        createdAt: kotTickets.createdAt,
        updatedAt: kotTickets.updatedAt,
        table: {
          name: restaurantTables.name,
        },
        order: {
          orderNumber: restaurantOrders.orderNumber,
        },
      })
      .from(kotTickets)
      .leftJoin(restaurantTables, eq(kotTickets.tableId, restaurantTables.id))
      .innerJoin(restaurantOrders, eq(kotTickets.orderId, restaurantOrders.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(kotTickets.createdAt));

    // Get items for each KOT
    const ticketsWithItems = await Promise.all(
      tickets.map(async (ticket) => {
        const items = await db
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
            kotNumber: restaurantOrderItems.kotNumber,
            botNumber: restaurantOrderItems.botNumber,
            kotGeneratedAt: restaurantOrderItems.kotGeneratedAt,
            botGeneratedAt: restaurantOrderItems.botGeneratedAt,
            createdAt: restaurantOrderItems.createdAt,
            dish: {
              name: menuDishes.name,
            },
          })
          .from(restaurantOrderItems)
          .innerJoin(menuDishes, eq(restaurantOrderItems.dishId, menuDishes.id))
          .where(eq(restaurantOrderItems.kotNumber, ticket.kotNumber));

        return { ...ticket, items };
      })
    );

    return ticketsWithItems;
  }

  async updateKotStatus(kotId: number, status: string, userId?: string): Promise<KotTicket> {
    return await db.transaction(async (tx) => {
      const updateData: any = { 
        status,
        updatedAt: sql`NOW()`,
      };

      // Set timestamps based on status
      switch (status) {
        case 'preparing':
          updateData.startedAt = sql`NOW()`;
          break;
        case 'ready':
          updateData.completedAt = sql`NOW()`;
          break;
        case 'served':
          updateData.servedAt = sql`NOW()`;
          break;
      }

      const [result] = await tx
        .update(kotTickets)
        .set(updateData)
        .where(eq(kotTickets.id, kotId))
        .returning();

      // Update corresponding order status based on KOT status
      if (result) {
        let orderStatus: string | null = null;
        
        switch (status) {
          case 'preparing':
            orderStatus = 'preparing';
            break;
          case 'ready':
            orderStatus = 'ready';
            break;
          case 'served':
            orderStatus = 'served';
            break;
        }

        if (orderStatus) {
          await tx
            .update(restaurantOrders)
            .set({ 
              status: orderStatus as any,
              updatedAt: sql`NOW()`,
              ...(orderStatus === 'served' && { servedAt: sql`NOW()` })
            })
            .where(eq(restaurantOrders.id, result.orderId));
        }
      }

      return result;
    });
  }

  async markKotPrinted(kotId: number): Promise<KotTicket> {
    const [result] = await db
      .update(kotTickets)
      .set({ printedAt: sql`NOW()` })
      .where(eq(kotTickets.id, kotId))
      .returning();

    return result;
  }

  async getRestaurantDashboardMetrics(branchId?: number) {
    const whereClause = branchId ? eq(restaurantOrders.branchId, branchId) : undefined;
    const tableWhereClause = branchId ? eq(restaurantTables.branchId, branchId) : undefined;

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayOrderStats, tableStats, todayRevenue] = await Promise.all([
      // Today's orders only
      db
        .select({
          total: count(),
        })
        .from(restaurantOrders)
        .where(
          and(
            whereClause,
            gte(restaurantOrders.createdAt, today),
            lt(restaurantOrders.createdAt, tomorrow)
          )
        ),
      // Current table status
      db
        .select({
          status: restaurantTables.status,
          count: count(),
        })
        .from(restaurantTables)
        .where(tableWhereClause)
        .groupBy(restaurantTables.status),
      // Today's revenue from orders
      db
        .select({
          totalRevenue: sum(restaurantOrders.totalAmount),
        })
        .from(restaurantOrders)
        .where(
          and(
            whereClause,
            gte(restaurantOrders.createdAt, today),
            lt(restaurantOrders.createdAt, tomorrow)
          )
        ),
    ]);

    const totalOrdersToday = todayOrderStats[0]?.total || 0;
    const totalRevenueToday = parseFloat(todayRevenue[0]?.totalRevenue || "0");

    const tableStatusCounts = tableStats.reduce((acc, stat) => {
      acc[stat.status] = stat.count;
      return acc;
    }, {} as Record<string, number>);

    const totalTables = Object.values(tableStatusCounts).reduce((sum, count) => sum + count, 0);
    const occupiedTables = tableStatusCounts.occupied || 0;
    const tableOccupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

    return {
      totalOrders: totalOrdersToday,
      totalRevenue: totalRevenueToday,
      tableOccupancyRate,
      availableTables: tableStatusCounts.open || 0,
      tableStatusCounts,
    };
  }

  async getTodayOrders(branchId?: number, limit: number = 5) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const whereClause = branchId 
      ? and(
          eq(restaurantOrders.branchId, branchId),
          gte(restaurantOrders.createdAt, today),
          lt(restaurantOrders.createdAt, tomorrow)
        )
      : and(
          gte(restaurantOrders.createdAt, today),
          lt(restaurantOrders.createdAt, tomorrow)
        );

    const orders = await db
      .select({
        id: restaurantOrders.id,
        orderNumber: restaurantOrders.orderNumber,
        status: restaurantOrders.status,
        totalAmount: restaurantOrders.totalAmount,
        createdAt: restaurantOrders.createdAt,
        tableName: restaurantTables.name,
      })
      .from(restaurantOrders)
      .leftJoin(restaurantTables, eq(restaurantOrders.tableId, restaurantTables.id))
      .where(whereClause)
      .orderBy(desc(restaurantOrders.createdAt))
      .limit(limit);

    return orders;
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
        date: sql<string>`DATE(${restaurantBills.createdAt})`,
        revenue: sql<number>`COALESCE(SUM(CAST(${restaurantBills.totalAmount} AS DECIMAL)), 0)`
      })
      .from(restaurantBills)
      .where(
        and(
          sql`${restaurantBills.createdAt} >= ${startDate.toISOString()}`,
          eq(restaurantBills.paymentStatus, 'paid')
        )
      )
      .groupBy(sql`DATE(${restaurantBills.createdAt})`)
      .orderBy(sql`DATE(${restaurantBills.createdAt})`);

    if (branchId) {
      baseQuery = baseQuery.where(eq(restaurantBills.branchId, branchId));
    }

    const dailyRevenue = await baseQuery;

    // Hourly revenue
    let hourlyQuery = db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${restaurantBills.createdAt})`,
        revenue: sql<number>`COALESCE(SUM(CAST(${restaurantBills.totalAmount} AS DECIMAL)), 0)`
      })
      .from(restaurantBills)
      .where(
        and(
          sql`${restaurantBills.createdAt} >= ${startDate.toISOString()}`,
          eq(restaurantBills.paymentStatus, 'paid')
        )
      )
      .groupBy(sql`EXTRACT(HOUR FROM ${restaurantBills.createdAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${restaurantBills.createdAt})`);

    if (branchId) {
      hourlyQuery = hourlyQuery.where(eq(restaurantBills.branchId, branchId));
    }

    const hourlyRevenue = await hourlyQuery;

    const currentRevenue = dailyRevenue.reduce((sum, day) => sum + Number(day.revenue), 0);

    // Calculate growth (comparing current period to the previous period of the same length)
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - periodDays);

    let previousRevenueQuery = db
      .select({
        revenue: sql<number>`COALESCE(SUM(CAST(${restaurantBills.totalAmount} AS DECIMAL)), 0)`
      })
      .from(restaurantBills)
      .where(
        and(
          sql`${restaurantBills.createdAt} >= ${previousStartDate.toISOString()}`,
          sql`${restaurantBills.createdAt} < ${startDate.toISOString()}`,
          eq(restaurantBills.paymentStatus, 'paid')
        )
      );

    if (branchId) {
      previousRevenueQuery = previousRevenueQuery.where(eq(restaurantBills.branchId, branchId));
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

    let baseConditions = [sql`${restaurantOrders.createdAt} >= ${startDate.toISOString()}`];
    if (branchId) {
      baseConditions.push(eq(restaurantOrders.branchId, branchId));
    }

    // Total orders in period
    const [{ count: totalOrders }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(restaurantOrders)
      .where(and(...baseConditions));

    // Daily orders
    const dailyOrders = await db
      .select({
        date: sql<string>`DATE(${restaurantOrders.createdAt})`,
        orders: sql<number>`COUNT(*)`
      })
      .from(restaurantOrders)
      .where(and(...baseConditions))
      .groupBy(sql`DATE(${restaurantOrders.createdAt})`)
      .orderBy(sql`DATE(${restaurantOrders.createdAt})`);

    // Orders by status
    const ordersByStatus = await db
      .select({
        status: restaurantOrders.status,
        count: sql<number>`COUNT(*)`
      })
      .from(restaurantOrders)
      .where(and(...baseConditions))
      .groupBy(restaurantOrders.status);

    // Today's orders
    const today = new Date().toISOString().split('T')[0];
    let todayConditions = [sql`DATE(${restaurantOrders.createdAt}) = ${today}`];
    if (branchId) {
      todayConditions.push(eq(restaurantOrders.branchId, branchId));
    }

    const [{ count: ordersToday }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(restaurantOrders)
      .where(and(...todayConditions));

    // Average order value from bills (more accurate than orders) - only for the period
    let avgConditions = [
      sql`${restaurantBills.createdAt} >= ${startDate.toISOString()}`,
      eq(restaurantBills.paymentStatus, 'paid')
    ];
    if (branchId) {
      avgConditions.push(eq(restaurantBills.branchId, branchId));
    }

    const [{ avg: averageOrderValue }] = await db
      .select({ avg: sql<number>`COALESCE(AVG(CAST(${restaurantBills.totalAmount} AS DECIMAL)), 0)` })
      .from(restaurantBills)
      .where(and(...avgConditions));

    return {
      totalOrders: Number(totalOrders),
      ordersToday: Number(ordersToday),
      averageOrderValue: Number(averageOrderValue) || 0,
      dailyOrders,
      ordersByStatus
    };
  }

  async getDishAnalytics(branchId?: number): Promise<{
    topDishes: Array<{ id: string; name: string; totalOrders: number; totalRevenue: number }>;
    categoryPerformance: Array<{ categoryName: string; totalRevenue: number; totalOrders: number }>;
  }> {
    // Top dishes - get data from actual order items with paid bills
    let dishConditions = [eq(restaurantBills.paymentStatus, 'paid')];
    if (branchId) {
      dishConditions.push(eq(menuDishes.branchId, branchId));
    }

    const topDishes = await db
      .select({
        id: sql<string>`CAST(${menuDishes.id} AS TEXT)`,
        name: menuDishes.name,
        totalOrders: sql<number>`COUNT(${restaurantOrderItems.id})`,
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${restaurantOrderItems.totalPrice} AS DECIMAL)), 0)`
      })
      .from(menuDishes)
      .innerJoin(restaurantOrderItems, eq(menuDishes.id, restaurantOrderItems.dishId))
      .innerJoin(restaurantOrders, eq(restaurantOrderItems.orderId, restaurantOrders.id))
      .innerJoin(restaurantBills, eq(restaurantOrders.id, restaurantBills.orderId))
      .where(and(...dishConditions))
      .groupBy(menuDishes.id, menuDishes.name)
      .orderBy(sql`COUNT(${restaurantOrderItems.id}) DESC`)
      .limit(10);

    // Category performance - get data from actual order items with paid bills
    let categoryConditions = [eq(restaurantBills.paymentStatus, 'paid')];
    if (branchId) {
      categoryConditions.push(eq(menuCategories.branchId, branchId));
    }

    const categoryPerformance = await db
      .select({
        categoryName: menuCategories.name,
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${restaurantOrderItems.totalPrice} AS DECIMAL)), 0)`,
        totalOrders: sql<number>`COUNT(${restaurantOrderItems.id})`
      })
      .from(menuCategories)
      .innerJoin(menuDishes, eq(menuCategories.id, menuDishes.categoryId))
      .innerJoin(restaurantOrderItems, eq(menuDishes.id, restaurantOrderItems.dishId))
      .innerJoin(restaurantOrders, eq(restaurantOrderItems.orderId, restaurantOrders.id))
      .innerJoin(restaurantBills, eq(restaurantOrders.id, restaurantBills.orderId))
      .where(and(...categoryConditions))
      .groupBy(menuCategories.id, menuCategories.name)
      .orderBy(sql`SUM(CAST(${restaurantOrderItems.totalPrice} AS DECIMAL)) DESC`);

    return {
      topDishes: topDishes.map(dish => ({
        ...dish,
        totalRevenue: Number(dish.totalRevenue) || 0
      })),
      categoryPerformance: categoryPerformance.map(cat => ({
        ...cat,
        totalRevenue: Number(cat.totalRevenue) || 0
      }))
    };
  }

  async getTableAnalytics(branchId?: number): Promise<{
    tablePerformance: Array<{ tableName: string; totalRevenue: number; totalOrders: number }>;
    tableUtilization: Array<{ id: string; tableName: string; capacity: number; utilizationRate: number }>;
    averageTurnover: number;
  }> {
    // Table performance based on actual paid bills
    let performanceConditions = [eq(restaurantBills.paymentStatus, 'paid')];
    if (branchId) {
      performanceConditions.push(eq(restaurantTables.branchId, branchId));
    }

    const tablePerformance = await db
      .select({
        tableName: restaurantTables.name,
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${restaurantBills.totalAmount} AS DECIMAL)), 0)`,
        totalOrders: sql<number>`COUNT(${restaurantBills.id})`
      })
      .from(restaurantTables)
      .innerJoin(restaurantBills, eq(restaurantTables.id, restaurantBills.tableId))
      .where(and(...performanceConditions))
      .groupBy(restaurantTables.id, restaurantTables.name)
      .orderBy(sql`SUM(CAST(${restaurantBills.totalAmount} AS DECIMAL)) DESC`);

    // Table utilization based on actual orders
    let utilizationConditions = [];
    if (branchId) {
      utilizationConditions.push(eq(restaurantTables.branchId, branchId));
    }

    const utilizationData = await db
      .select({
        id: sql<string>`CAST(${restaurantTables.id} AS TEXT)`,
        tableName: restaurantTables.name,
        capacity: restaurantTables.capacity,
        orderCount: sql<number>`COUNT(${restaurantOrders.id})`
      })
      .from(restaurantTables)
      .leftJoin(restaurantOrders, eq(restaurantTables.id, restaurantOrders.tableId))
      .where(utilizationConditions.length > 0 ? and(...utilizationConditions) : undefined)
      .groupBy(restaurantTables.id, restaurantTables.name, restaurantTables.capacity);

    const tableUtilization = utilizationData.map(table => ({
      ...table,
      utilizationRate: Math.min(Math.round((Number(table.orderCount) / 30) * 100), 100)
    }));

    // Average turnover calculation
    const totalOrders = tablePerformance.reduce((sum, table) => sum + Number(table.totalOrders), 0);
    const totalTables = tablePerformance.length || 1;
    const averageTurnover = totalOrders / totalTables / 30;

    return {
      tablePerformance: tablePerformance.map(table => ({
        ...table,
        totalRevenue: Number(table.totalRevenue) || 0
      })),
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
    // Peak hours based on actual orders
    let peakHoursConditions = [];
    if (branchId) {
      peakHoursConditions.push(eq(restaurantOrders.branchId, branchId));
    }

    const peakHours = await db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM ${restaurantOrders.createdAt})::INTEGER`,
        orderCount: sql<number>`COUNT(*)`
      })
      .from(restaurantOrders)
      .where(peakHoursConditions.length > 0 ? and(...peakHoursConditions) : undefined)
      .groupBy(sql`EXTRACT(HOUR FROM ${restaurantOrders.createdAt})`)
      .orderBy(sql`EXTRACT(HOUR FROM ${restaurantOrders.createdAt})`);

    // Cancellation rate
    let totalOrdersConditions = [];
    let cancelledOrdersConditions = [eq(restaurantOrders.status, 'cancelled')];

    if (branchId) {
      totalOrdersConditions.push(eq(restaurantOrders.branchId, branchId));
      cancelledOrdersConditions.push(eq(restaurantOrders.branchId, branchId));
    }

    const [{ count: totalOrders }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(restaurantOrders)
      .where(totalOrdersConditions.length > 0 ? and(...totalOrdersConditions) : undefined);

    const [{ count: cancelledOrders }] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(restaurantOrders)
      .where(and(...cancelledOrdersConditions));

    const cancellationRate = Number(totalOrders) > 0 ? (Number(cancelledOrders) / Number(totalOrders)) * 100 : 0;

    // Calculate preparation time from orders that have completion data
    let prepTimeConditions = [
      sql`${restaurantOrders.completedAt} IS NOT NULL`,
      sql`${restaurantOrders.createdAt} IS NOT NULL`
    ];
    if (branchId) {
      prepTimeConditions.push(eq(restaurantOrders.branchId, branchId));
    }

    const [{ avgPrep }] = await db
      .select({
        avgPrep: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${restaurantOrders.completedAt} - ${restaurantOrders.createdAt})) / 60), 15)`
      })
      .from(restaurantOrders)
      .where(and(...prepTimeConditions));

    // Calculate service time from orders that have served data
    let serviceTimeConditions = [
      sql`${restaurantOrders.servedAt} IS NOT NULL`,
      sql`${restaurantOrders.completedAt} IS NOT NULL`
    ];
    if (branchId) {
      serviceTimeConditions.push(eq(restaurantOrders.branchId, branchId));
    }

    const [{ avgService }] = await db
      .select({
        avgService: sql<number>`COALESCE(AVG(EXTRACT(EPOCH FROM (${restaurantOrders.servedAt} - ${restaurantOrders.completedAt})) / 60), 10)`
      })
      .from(restaurantOrders)
      .where(and(...serviceTimeConditions));

    return {
      peakHours,
      avgPreparationTime: Math.round(Number(avgPrep) || 15),
      avgServiceTime: Math.round(Number(avgService) || 10),
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      customerSatisfaction: 4.2 // Keep as mock for now since we don't have ratings
    };
  }
}

export const restaurantStorage = new RestaurantStorage();