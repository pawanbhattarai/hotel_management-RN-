
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { menuCategories, menuDishes } from './shared/schema.ts';

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/hotel_management';
const sql = postgres(connectionString);
const db = drizzle(sql);

// Sample categories data
const categoriesData = [
  { name: 'Appetizers', branchId: 1, sortOrder: 1 },
  { name: 'Soups', branchId: 1, sortOrder: 2 },
  { name: 'Main Courses', branchId: 1, sortOrder: 3 },
  { name: 'Pasta & Rice', branchId: 1, sortOrder: 4 },
  { name: 'Grilled Items', branchId: 1, sortOrder: 5 },
  { name: 'Vegetarian Specials', branchId: 1, sortOrder: 6 },
  { name: 'Seafood', branchId: 1, sortOrder: 7 },
  { name: 'Desserts', branchId: 1, sortOrder: 8 },
  { name: 'Beverages', branchId: 1, sortOrder: 9 },
  { name: 'Indian Cuisine', branchId: 1, sortOrder: 10 }
];

// Sample dishes data (will be populated after categories are created)
const dishesTemplateData = [
  // Appetizers
  { name: 'Chicken Wings', price: '450.00', description: 'Crispy buffalo chicken wings with ranch dip', spiceLevel: 'medium', preparationTime: 15, isVegetarian: false },
  { name: 'Mozzarella Sticks', price: '380.00', description: 'Golden fried mozzarella with marinara sauce', preparationTime: 12, isVegetarian: true },
  
  // Soups
  { name: 'Tomato Basil Soup', price: '280.00', description: 'Creamy tomato soup with fresh basil', preparationTime: 10, isVegetarian: true },
  { name: 'Chicken Corn Soup', price: '320.00', description: 'Rich chicken broth with sweet corn', preparationTime: 15, isVegetarian: false },
  
  // Main Courses
  { name: 'Grilled Chicken Breast', price: '680.00', description: 'Herb-marinated grilled chicken with vegetables', preparationTime: 25, isVegetarian: false },
  { name: 'Beef Steak', price: '950.00', description: 'Tender beef steak with garlic butter', preparationTime: 30, isVegetarian: false },
  
  // Pasta & Rice
  { name: 'Chicken Alfredo Pasta', price: '520.00', description: 'Creamy alfredo pasta with grilled chicken', preparationTime: 20, isVegetarian: false },
  { name: 'Vegetable Fried Rice', price: '380.00', description: 'Wok-fried rice with mixed vegetables', preparationTime: 15, isVegetarian: true },
  
  // Grilled Items
  { name: 'BBQ Ribs', price: '780.00', description: 'Smoky BBQ ribs with coleslaw', spiceLevel: 'medium', preparationTime: 35, isVegetarian: false },
  { name: 'Grilled Fish', price: '650.00', description: 'Fresh fish grilled with lemon herbs', preparationTime: 20, isVegetarian: false },
  
  // Vegetarian Specials
  { name: 'Paneer Tikka', price: '480.00', description: 'Marinated cottage cheese grilled to perfection', spiceLevel: 'medium', preparationTime: 18, isVegetarian: true },
  { name: 'Vegetable Lasagna', price: '520.00', description: 'Layered pasta with vegetables and cheese', preparationTime: 25, isVegetarian: true },
  
  // Seafood
  { name: 'Grilled Salmon', price: '850.00', description: 'Fresh salmon with teriyaki glaze', preparationTime: 22, isVegetarian: false },
  { name: 'Shrimp Scampi', price: '720.00', description: 'Garlic butter shrimp with pasta', preparationTime: 18, isVegetarian: false },
  
  // Desserts
  { name: 'Chocolate Lava Cake', price: '320.00', description: 'Warm chocolate cake with molten center', preparationTime: 12, isVegetarian: true },
  { name: 'Tiramisu', price: '380.00', description: 'Classic Italian coffee-flavored dessert', preparationTime: 5, isVegetarian: true },
  
  // Beverages
  { name: 'Fresh Orange Juice', price: '180.00', description: 'Freshly squeezed orange juice', preparationTime: 3, isVegetarian: true },
  { name: 'Iced Coffee', price: '220.00', description: 'Cold brew coffee with ice and cream', preparationTime: 5, isVegetarian: true },
  
  // Indian Cuisine
  { name: 'Butter Chicken', price: '580.00', description: 'Creamy tomato-based chicken curry', spiceLevel: 'mild', preparationTime: 25, isVegetarian: false },
  { name: 'Dal Makhani', price: '420.00', description: 'Rich black lentil curry with butter', spiceLevel: 'mild', preparationTime: 30, isVegetarian: true }
];

async function addSampleMenuData() {
  try {
    console.log('🍽️ Adding sample menu categories and dishes...');

    // Insert categories
    console.log('📋 Creating menu categories...');
    const insertedCategories = await db.insert(menuCategories).values(categoriesData).returning();
    console.log(`✅ Created ${insertedCategories.length} categories`);

    // Map category names to IDs for dish insertion
    const categoryMap: Record<string, number> = {};
    insertedCategories.forEach(cat => {
      categoryMap[cat.name] = cat.id;
    });

    // Prepare dishes data with proper category IDs
    const dishesData: any[] = [];
    const categoryDishMapping = {
      'Appetizers': dishesTemplateData.slice(0, 2),
      'Soups': dishesTemplateData.slice(2, 4),
      'Main Courses': dishesTemplateData.slice(4, 6),
      'Pasta & Rice': dishesTemplateData.slice(6, 8),
      'Grilled Items': dishesTemplateData.slice(8, 10),
      'Vegetarian Specials': dishesTemplateData.slice(10, 12),
      'Seafood': dishesTemplateData.slice(12, 14),
      'Desserts': dishesTemplateData.slice(14, 16),
      'Beverages': dishesTemplateData.slice(16, 18),
      'Indian Cuisine': dishesTemplateData.slice(18, 20)
    };

    // Build dishes array with proper category assignments
    Object.keys(categoryDishMapping).forEach(categoryName => {
      const categoryId = categoryMap[categoryName];
      categoryDishMapping[categoryName as keyof typeof categoryDishMapping].forEach((dish, index) => {
        dishesData.push({
          ...dish,
          categoryId: categoryId,
          branchId: 1,
          sortOrder: index + 1,
          isActive: true
        });
      });
    });

    // Insert dishes
    console.log('🍜 Creating menu dishes...');
    const insertedDishes = await db.insert(menuDishes).values(dishesData).returning();
    console.log(`✅ Created ${insertedDishes.length} dishes`);

    console.log('\n📊 Summary:');
    console.log(`Categories created: ${insertedCategories.length}`);
    console.log(`Dishes created: ${insertedDishes.length}`);
    
    console.log('\n🎉 Sample menu data added successfully!');
    
    // Display summary by category
    console.log('\n📋 Menu Structure:');
    insertedCategories.forEach(category => {
      const categoryDishes = insertedDishes.filter(dish => dish.categoryId === category.id);
      console.log(`${category.name}: ${categoryDishes.length} dishes`);
    });

  } catch (error) {
    console.error('❌ Error adding sample menu data:', error);
  } finally {
    await sql.end();
  }
}

// Run the script
addSampleMenuData();
