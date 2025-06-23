import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  dishIngredients,
  stockItems,
  measuringUnits,
  menuDishes,
  stockConsumption,
  type DishIngredient,
  type InsertDishIngredient,
  type InsertStockConsumption,
} from "@shared/schema";

export class DishIngredientsStorage {
  // Get dish ingredients with stock item details
  async getDishIngredients(dishId: number): Promise<any[]> {
    return await db
      .select({
        id: dishIngredients.id,
        dishId: dishIngredients.dishId,
        stockItemId: dishIngredients.stockItemId,
        quantity: dishIngredients.quantity,
        unit: dishIngredients.unit,
        cost: dishIngredients.cost,
        notes: dishIngredients.notes,
        isActive: dishIngredients.isActive,
        stockItem: {
          id: stockItems.id,
          name: stockItems.name,
          sku: stockItems.sku,
          currentStock: stockItems.currentStock,
          defaultPrice: stockItems.defaultPrice,
        },
        measuringUnit: {
          id: measuringUnits.id,
          name: measuringUnits.name,
          symbol: measuringUnits.symbol,
        },
      })
      .from(dishIngredients)
      .leftJoin(stockItems, eq(dishIngredients.stockItemId, stockItems.id))
      .leftJoin(measuringUnits, eq(stockItems.measuringUnitId, measuringUnits.id))
      .where(and(eq(dishIngredients.dishId, dishId), eq(dishIngredients.isActive, true)))
      .orderBy(dishIngredients.id);
  }

  // Get single dish ingredient
  async getDishIngredient(id: number): Promise<DishIngredient | undefined> {
    const [ingredient] = await db
      .select()
      .from(dishIngredients)
      .where(eq(dishIngredients.id, id));
    return ingredient;
  }

  // Create dish ingredient
  async createDishIngredient(ingredient: InsertDishIngredient): Promise<DishIngredient> {
    const [newIngredient] = await db
      .insert(dishIngredients)
      .values(ingredient)
      .returning();
    return newIngredient;
  }

  // Update dish ingredient
  async updateDishIngredient(id: number, ingredient: Partial<InsertDishIngredient>): Promise<DishIngredient> {
    const [updatedIngredient] = await db
      .update(dishIngredients)
      .set({ ...ingredient, updatedAt: new Date() })
      .where(eq(dishIngredients.id, id))
      .returning();
    return updatedIngredient;
  }

  // Delete dish ingredient (soft delete)
  async deleteDishIngredient(id: number): Promise<void> {
    await db
      .update(dishIngredients)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(dishIngredients.id, id));
  }

  // Bulk create dish ingredients
  async createDishIngredientsBulk(ingredients: InsertDishIngredient[]): Promise<DishIngredient[]> {
    return await db.insert(dishIngredients).values(ingredients).returning();
  }

  // Bulk update dish ingredients (replace all for a dish)
  async updateDishIngredientsBulk(dishId: number, ingredients: InsertDishIngredient[]): Promise<DishIngredient[]> {
    // First, soft delete existing ingredients
    await db
      .update(dishIngredients)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(dishIngredients.dishId, dishId));

    // Then create new ones
    if (ingredients.length > 0) {
      return await this.createDishIngredientsBulk(ingredients);
    }
    return [];
  }

  // Process stock consumption when a dish is ordered
  async processDishConsumption(
    dishId: number,
    quantity: number,
    orderId: string,
    orderItemId: number,
    branchId: number,
    consumedById: string
  ): Promise<void> {
    // Get all ingredients for this dish
    const ingredients = await this.getDishIngredients(dishId);

    const consumptions: InsertStockConsumption[] = [];

    for (const ingredient of ingredients) {
      if (ingredient.stockItem && ingredient.isActive) {
        const totalQuantityNeeded = parseFloat(ingredient.quantity) * quantity;

        // Check if we have enough stock
        const currentStock = parseFloat(ingredient.stockItem.currentStock || '0');
        if (currentStock < totalQuantityNeeded) {
          throw new Error(
            `Insufficient stock for ${ingredient.stockItem.name}. Required: ${totalQuantityNeeded}, Available: ${currentStock}`
          );
        }

        // Create consumption record
        const consumption: InsertStockConsumption = {
          stockItemId: ingredient.stockItemId,
          orderId: orderId,
          orderItemId: orderItemId,
          dishId: dishId,
          quantity: totalQuantityNeeded.toString(),
          unitPrice: ingredient.stockItem.defaultPrice,
          totalCost: (totalQuantityNeeded * parseFloat(ingredient.stockItem.defaultPrice || '0')).toString(),
          consumedBy: consumedById,
          branchId: branchId,
          orderType: 'restaurant',
          notes: `Auto consumption for dish: ${ingredient.stockItem.name} (${quantity}x)`,
        };

        consumptions.push(consumption);
      }
    }

    // Process all consumptions
    if (consumptions.length > 0) {
      // Import inventoryStorage to handle stock deduction and consumption recording
      const { inventoryStorage } = await import('./inventory-storage');
      await inventoryStorage.createStockConsumptionBulk(consumptions);
    }
  }

  // Get dish cost calculation
  async getDishCostCalculation(dishId: number): Promise<{
    totalCost: number;
    ingredients: Array<{
      name: string;
      quantity: number;
      unit: string;
      cost: number;
      totalCost: number;
    }>;
  }> {
    const ingredients = await this.getDishIngredients(dishId);
    
    let totalCost = 0;
    const ingredientCosts = ingredients.map(ingredient => {
      const quantity = parseFloat(ingredient.quantity || '0');
      const unitCost = parseFloat(ingredient.cost || ingredient.stockItem?.defaultPrice || '0');
      const itemTotalCost = quantity * unitCost;
      totalCost += itemTotalCost;

      return {
        name: ingredient.stockItem?.name || 'Unknown',
        quantity: quantity,
        unit: ingredient.unit,
        cost: unitCost,
        totalCost: itemTotalCost,
      };
    });

    return {
      totalCost,
      ingredients: ingredientCosts,
    };
  }
}

export const dishIngredientsStorage = new DishIngredientsStorage();