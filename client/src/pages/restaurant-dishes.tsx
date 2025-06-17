import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useAuth } from "@/hooks/useAuth";
import BulkOperations from "@/components/bulk-operations";

const dishSchema = z.object({
  name: z.string().min(1, "Dish name is required"),
  price: z.string().min(1, "Price is required"),
  categoryId: z.number(),
  branchId: z.number(),
  description: z.string().optional(),
  ingredients: z.string().optional(),
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  spiceLevel: z.enum(["mild", "medium", "hot", "extra-hot"]).optional(),
  preparationTime: z.number().optional(),
  image: z.string().optional(),
});

type DishFormData = z.infer<typeof dishSchema>;

export default function RestaurantDishes() {
  const [isDishDialogOpen, setIsDishDialogOpen] = useState(false);
  const [isBulkDishDialogOpen, setIsBulkDishDialogOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<any>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: categories } = useQuery({
    queryKey: ['/api/restaurant/categories'],
  });

  const { data: dishes, isLoading: dishesLoading } = useQuery({
    queryKey: ['/api/restaurant/dishes'],
  });

  const { data: branches } = useQuery({
    queryKey: ['/api/branches'],
  });

  // Dish mutations
  const createDishMutation = useMutation({
    mutationFn: async (data: DishFormData) => {
      const response = await fetch('/api/restaurant/dishes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create dish');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/dishes'] });
      setIsDishDialogOpen(false);
      resetDishForm();
      toast({ title: "Dish created successfully" });
    },
  });

  const updateDishMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DishFormData> }) => {
      const response = await fetch(`/api/restaurant/dishes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update dish');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/dishes'] });
      setIsDishDialogOpen(false);
      resetDishForm();
      toast({ title: "Dish updated successfully" });
    },
  });

  const deleteDishMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/restaurant/dishes/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete dish');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/dishes'] });
      toast({ title: "Dish deleted successfully" });
    },
  });

  const dishForm = useForm<DishFormData>({
    resolver: zodResolver(dishSchema),
    defaultValues: {
      name: "",
      price: "",
      branchId: user?.role !== "superadmin" ? user?.branchId : undefined,
      description: "",
      ingredients: "",
      isVegetarian: false,
      isVegan: false,
      preparationTime: 0,
    },
  });

  const resetDishForm = () => {
    dishForm.reset({
      name: "",
      price: "",
      branchId: user?.role !== "superadmin" ? user?.branchId : undefined,
      description: "",
      ingredients: "",
      isVegetarian: false,
      isVegan: false,
      preparationTime: 0,
    });
    setEditingDish(null);
  };

  const onDishSubmit = (data: DishFormData) => {
    if (editingDish) {
      updateDishMutation.mutate({ id: editingDish.id, data });
    } else {
      createDishMutation.mutate(data);
    }
  };

  const handleEditDish = (dish: any) => {
    setEditingDish(dish);
    dishForm.reset({
      name: dish.name,
      price: dish.price,
      categoryId: dish.categoryId,
      branchId: dish.branchId,
      description: dish.description,
      ingredients: dish.ingredients,
      isVegetarian: dish.isVegetarian,
      isVegan: dish.isVegan,
      spiceLevel: dish.spiceLevel,
      preparationTime: dish.preparationTime,
      image: dish.image,
    });
    setIsDishDialogOpen(true);
  };

  const getSpiceLevelColor = (level: string) => {
    switch (level) {
      case 'mild': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'hot': return 'bg-orange-500';
      case 'extra-hot': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isMobileMenuOpen={isMobileSidebarOpen}
        setIsMobileMenuOpen={setIsMobileSidebarOpen}
      />
      <div className="main-content">
        <Header
          title="Menu Dishes"
          subtitle="Manage your restaurant menu dishes"
          onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
        <main className="p-6">
          {/* Add Button Section for Dishes */}
          <div className="mb-6">
            <Dialog open={isDishDialogOpen} onOpenChange={setIsDishDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetDishForm}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Dish
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingDish ? 'Edit Dish' : 'Add New Dish'}</DialogTitle>
                </DialogHeader>
                <Form {...dishForm}>
                  <form onSubmit={dishForm.handleSubmit(onDishSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={dishForm.control}
                        name="name"
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
                        control={dishForm.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., 350.00" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={dishForm.control}
                        name="categoryId"
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
                                  {categories?.map((category: any) => (
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
                      {user?.role === "superadmin" && (
                        <FormField
                          control={dishForm.control}
                          name="branchId"
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
                                    {branches?.map((branch: any) => (
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

                    <FormField
                      control={dishForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Describe the dish..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={dishForm.control}
                        name="spiceLevel"
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
                        control={dishForm.control}
                        name="preparationTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Preparation Time (minutes)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDishDialogOpen(false)}>
                        Cancel
                      </Button>
                      {!editingDish && (
                        <Button 
                          type="button" 
                          variant="secondary" 
                          onClick={() => {
                            setIsDishDialogOpen(false);
                            setIsBulkDishDialogOpen(true);
                          }}
                        >
                          Add Bulk
                        </Button>
                      )}
                      <Button type="submit" disabled={createDishMutation.isPending || updateDishMutation.isPending}>
                        {editingDish ? 'Update' : 'Create'} Dish
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Menu Dishes</CardTitle>
            </CardHeader>
            <CardContent>
              {dishesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dish Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Spice Level</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dishes?.length ? (
                      dishes.map((dish: any) => (
                        <TableRow key={dish.id}>
                          <TableCell className="font-medium">{dish.name}</TableCell>
                          <TableCell>Rs. {dish.price}</TableCell>
                          <TableCell>{dish.category?.name || 'N/A'}</TableCell>
                          <TableCell>
                            {dish.spiceLevel && (
                              <Badge className={`${getSpiceLevelColor(dish.spiceLevel)} text-white`}>
                                {dish.spiceLevel}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditDish(dish)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this dish?')) {
                                    deleteDishMutation.mutate(dish.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No dishes found. Create your first dish to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Bulk Dish Dialog */}
          <Dialog open={isBulkDishDialogOpen} onOpenChange={setIsBulkDishDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Dishes in Bulk</DialogTitle>
              </DialogHeader>
              <BulkOperations 
                type="dishes" 
                branches={Array.isArray(branches) ? branches : []} 
                categories={Array.isArray(categories) ? categories : []}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['/api/restaurant/dishes'] });
                  setIsBulkDishDialogOpen(false);
                  toast({ title: "Dishes created successfully" });
                }} 
                isDirectForm={true}
              />
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}