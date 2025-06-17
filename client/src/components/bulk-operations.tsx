import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Bulk Tables Schema
const bulkTablesSchema = z.object({
  tables: z.array(z.object({
    name: z.string().min(1, "Table name is required"),
    capacity: z.number().min(1, "Capacity must be at least 1"),
    branchId: z.number(),
  })).min(1, "At least one table is required"),
});

// Bulk Categories Schema
const bulkCategoriesSchema = z.object({
  categories: z.array(z.object({
    name: z.string().min(1, "Category name is required"),
    branchId: z.number(),
    sortOrder: z.number().optional(),
  })).min(1, "At least one category is required"),
});

// Bulk Dishes Schema
const bulkDishesSchema = z.object({
  dishes: z.array(z.object({
    name: z.string().min(1, "Dish name is required"),
    price: z.string().min(1, "Price is required"),
    categoryId: z.number().min(1, "Category is required"),
    branchId: z.number(),
    description: z.string().optional(),
    spiceLevel: z.enum(["mild", "medium", "hot", "extra-hot"]).optional(),
    preparationTime: z.number().optional(),
    isVegetarian: z.boolean().optional(),
    isVegan: z.boolean().optional(),
  })).min(1, "At least one dish is required"),
});

type BulkTablesData = z.infer<typeof bulkTablesSchema>;
type BulkCategoriesData = z.infer<typeof bulkCategoriesSchema>;
type BulkDishesData = z.infer<typeof bulkDishesSchema>;

interface BulkOperationsProps {
  type: 'tables' | 'categories' | 'dishes';
  branches: any[];
  categories?: any[];
  onSuccess: () => void;
  isDirectForm?: boolean;
}

export default function BulkOperations({ type, branches, categories, onSuccess, isDirectForm = false }: BulkOperationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Tables Form
  const tablesForm = useForm<BulkTablesData>({
    resolver: zodResolver(bulkTablesSchema),
    defaultValues: {
      tables: [{ 
        name: "", 
        capacity: 4, 
        branchId: user?.role === "superadmin" ? branches?.[0]?.id || 1 : (user?.branchId || 1) 
      }],
    },
  });

  const { fields: tableFields, append: appendTable, remove: removeTable } = useFieldArray({
    control: tablesForm.control,
    name: "tables",
  });

  // Categories Form
  const categoriesForm = useForm<BulkCategoriesData>({
    resolver: zodResolver(bulkCategoriesSchema),
    defaultValues: {
      categories: [{ 
        name: "", 
        branchId: user?.role === "superadmin" ? branches?.[0]?.id || 1 : (user?.branchId || 1),
        sortOrder: 0 
      }],
    },
  });

  const { fields: categoryFields, append: appendCategory, remove: removeCategory } = useFieldArray({
    control: categoriesForm.control,
    name: "categories",
  });

  // Dishes Form
  const dishesForm = useForm<BulkDishesData>({
    resolver: zodResolver(bulkDishesSchema),
    defaultValues: {
      dishes: [{ 
        name: "", 
        price: "", 
        categoryId: categories?.[0]?.id || 1,
        branchId: user?.role === "superadmin" ? branches?.[0]?.id || 1 : (user?.branchId || 1),
        description: "",
        isVegetarian: false,
        isVegan: false,
      }],
    },
  });

  const { fields: dishFields, append: appendDish, remove: removeDish } = useFieldArray({
    control: dishesForm.control,
    name: "dishes",
  });

  // Mutations
  const createTablesMutation = useMutation({
    mutationFn: async (data: BulkTablesData) => {
      const response = await fetch('/api/restaurant/tables/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create tables');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/tables'] });
      setIsOpen(false);
      tablesForm.reset();
      onSuccess();
      toast({ title: "Tables created successfully" });
    },
  });

  const createCategoriesMutation = useMutation({
    mutationFn: async (data: BulkCategoriesData) => {
      const response = await fetch('/api/restaurant/categories/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create categories');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/categories'] });
      setIsOpen(false);
      categoriesForm.reset();
      onSuccess();
      toast({ title: "Categories created successfully" });
    },
  });

  const createDishesMutation = useMutation({
    mutationFn: async (data: BulkDishesData) => {
      const response = await fetch('/api/restaurant/dishes/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create dishes');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/dishes'] });
      setIsOpen(false);
      dishesForm.reset();
      onSuccess();
      toast({ title: "Dishes created successfully" });
    },
  });

  const getTitle = () => {
    switch (type) {
      case 'tables': return 'Add Multiple Tables';
      case 'categories': return 'Add Multiple Categories';
      case 'dishes': return 'Add Multiple Dishes';
    }
  };

  const renderTablesForm = () => (
    <Form {...tablesForm}>
      <form onSubmit={tablesForm.handleSubmit((data) => {
        // Filter out empty rows (rows without name)
        const validTables = data.tables.filter(table => table.name.trim() !== '');
        if (validTables.length === 0) {
          toast({ title: "Please fill at least one table", variant: "destructive" });
          return;
        }
        createTablesMutation.mutate({ tables: validTables });
      })} className="space-y-4">
        {tableFields.map((field, index) => (
          <Card key={field.id} className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium">Table {index + 1}</h4>
              {tableFields.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeTable(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={tablesForm.control}
                name={`tables.${index}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Table Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Table 1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={tablesForm.control}
                name={`tables.${index}.capacity`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        placeholder="4" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {user?.role === "superadmin" && (
                <FormField
                  control={tablesForm.control}
                  name={`tables.${index}.branchId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value?.toString()} 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches?.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id.toString()}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </Card>
        ))}
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => appendTable({ 
              name: "", 
              capacity: 4, 
              branchId: user?.role === "superadmin" ? branches?.[0]?.id || 1 : (user?.branchId || 1) 
            })}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add 1 Row
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              for (let i = 0; i < 2; i++) {
                appendTable({ 
                  name: "", 
                  capacity: 4, 
                  branchId: user?.role === "superadmin" ? branches?.[0]?.id || 1 : (user?.branchId || 1) 
                });
              }
            }}
            size="sm"
          >
            Add 2 Rows
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              for (let i = 0; i < 5; i++) {
                appendTable({ 
                  name: "", 
                  capacity: 4, 
                  branchId: user?.role === "superadmin" ? branches?.[0]?.id || 1 : (user?.branchId || 1) 
                });
              }
            }}
            size="sm"
          >
            Add 5 Rows
          </Button>
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={createTablesMutation.isPending}
        >
          {createTablesMutation.isPending ? "Creating..." : "Create Tables"}
        </Button>
      </form>
    </Form>
  );

  const renderCategoriesForm = () => (
    <Form {...categoriesForm}>
      <form onSubmit={categoriesForm.handleSubmit((data) => {
        // Filter out empty rows (rows without name)
        const validCategories = data.categories.filter(category => category.name.trim() !== '');
        if (validCategories.length === 0) {
          toast({ title: "Please fill at least one category", variant: "destructive" });
          return;
        }
        createCategoriesMutation.mutate({ categories: validCategories });
      })} className="space-y-4">
        {categoryFields.map((field, index) => (
          <Card key={field.id} className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium">Category {index + 1}</h4>
              {categoryFields.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeCategory(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                control={categoriesForm.control}
                name={`categories.${index}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Appetizers" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={categoriesForm.control}
                name={`categories.${index}.sortOrder`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        placeholder="0" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {user?.role === "superadmin" && (
                <FormField
                  control={categoriesForm.control}
                  name={`categories.${index}.branchId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value?.toString()} 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches?.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id.toString()}>
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          </Card>
        ))}
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => appendCategory({ 
              name: "", 
              branchId: user?.role === "superadmin" ? branches?.[0]?.id || 1 : (user?.branchId || 1),
              sortOrder: 0 
            })}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add 1 Row
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              for (let i = 0; i < 2; i++) {
                appendCategory({ 
                  name: "", 
                  branchId: user?.role === "superadmin" ? branches?.[0]?.id || 1 : (user?.branchId || 1),
                  sortOrder: 0 
                });
              }
            }}
            size="sm"
          >
            Add 2 Rows
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              for (let i = 0; i < 5; i++) {
                appendCategory({ 
                  name: "", 
                  branchId: user?.role === "superadmin" ? branches?.[0]?.id || 1 : (user?.branchId || 1),
                  sortOrder: 0 
                });
              }
            }}
            size="sm"
          >
            Add 5 Rows
          </Button>
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={createCategoriesMutation.isPending}
        >
          {createCategoriesMutation.isPending ? "Creating..." : "Create Categories"}
        </Button>
      </form>
    </Form>
  );

  const renderDishesForm = () => (
    <Form {...dishesForm}>
      <form onSubmit={dishesForm.handleSubmit((data) => {
        // Filter out empty rows (rows without name and price)
        const validDishes = data.dishes.filter(dish => dish.name.trim() !== '' && dish.price.trim() !== '');
        if (validDishes.length === 0) {
          toast({ title: "Please fill at least one dish with name and price", variant: "destructive" });
          return;
        }
        createDishesMutation.mutate({ dishes: validDishes });
      })} className="space-y-4">
        {dishFields.map((field, index) => (
          <Card key={field.id} className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium">Dish {index + 1}</h4>
              {dishFields.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeDish(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={dishesForm.control}
                name={`dishes.${index}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dish Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., Chicken Curry" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={dishesForm.control}
                name={`dishes.${index}.price`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (Rs.)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="350" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={dishesForm.control}
                name={`dishes.${index}.categoryId`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Select 
                        value={field.value?.toString()} 
                        onValueChange={(value) => field.onChange(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={dishesForm.control}
                name={`dishes.${index}.spiceLevel`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spice Level</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select spice level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mild">Mild</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hot">Hot</SelectItem>
                          <SelectItem value="extra-hot">Extra Hot</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={dishesForm.control}
                name={`dishes.${index}.description`}
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Dish description..." />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>
        ))}
        
        <div className="flex flex-wrap gap-2 mb-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => appendDish({ 
              name: "", 
              price: "", 
              categoryId: categories?.[0]?.id || 1,
              branchId: user?.role === "superadmin" ? branches?.[0]?.id || 1 : (user?.branchId || 1),
              description: "",
              isVegetarian: false,
              isVegan: false,
            })}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add 1 Row
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              for (let i = 0; i < 2; i++) {
                appendDish({ 
                  name: "", 
                  price: "", 
                  categoryId: categories?.[0]?.id || 1,
                  branchId: user?.role === "superadmin" ? branches?.[0]?.id || 1 : (user?.branchId || 1),
                  description: "",
                  isVegetarian: false,
                  isVegan: false,
                });
              }
            }}
            size="sm"
          >
            Add 2 Rows
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              for (let i = 0; i < 5; i++) {
                appendDish({ 
                  name: "", 
                  price: "", 
                  categoryId: categories?.[0]?.id || 1,
                  branchId: user?.role === "superadmin" ? branches?.[0]?.id || 1 : (user?.branchId || 1),
                  description: "",
                  isVegetarian: false,
                  isVegan: false,
                });
              }
            }}
            size="sm"
          >
            Add 5 Rows
          </Button>
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={createDishesMutation.isPending}
        >
          {createDishesMutation.isPending ? "Creating..." : "Create Dishes"}
        </Button>
      </form>
    </Form>
  );

  // If it's a direct form (used inside a dialog), just return the form
  if (isDirectForm) {
    return (
      <div className="mt-4">
        {type === 'tables' && renderTablesForm()}
        {type === 'categories' && renderCategoriesForm()}
        {type === 'dishes' && renderDishesForm()}
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <Upload className="h-4 w-4 mr-2" />
          {getTitle()}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {type === 'tables' && renderTablesForm()}
          {type === 'categories' && renderCategoriesForm()}
          {type === 'dishes' && renderDishesForm()}
        </div>
      </DialogContent>
    </Dialog>
  );
}