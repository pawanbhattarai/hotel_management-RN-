import { useState } from "react";
import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { ArrowLeft, Plus, Trash2, Calculator, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ingredientSchema = z.object({
  stockItemId: z.number().min(1, "Please select a stock item"),
  quantity: z.union([z.string(), z.number()]).transform((val) => 
    typeof val === 'number' ? val.toString() : val
  ),
  unit: z.string().min(1, "Unit is required"),
  cost: z.union([z.string(), z.number()]).transform((val) => 
    typeof val === 'number' ? val.toString() : val
  ),
  notes: z.string().optional(),
});

const formSchema = z.object({
  ingredients: z.array(ingredientSchema),
});

type FormData = z.infer<typeof formSchema>;

export default function DishIngredients() {
  const { dishId } = useParams();
  const [, navigate] = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dish, isLoading: dishLoading } = useQuery({
    queryKey: [`/api/restaurant/dishes/${dishId}`],
    enabled: !!dishId,
  });

  const { data: ingredients = [], isLoading: ingredientsLoading } = useQuery({
    queryKey: [`/api/restaurant/dishes/${dishId}/ingredients`],
    enabled: !!dishId,
  });

  const { data: stockItems = [] } = useQuery({
    queryKey: ['/api/inventory/stock-items'],
  });

  const { data: costCalculation } = useQuery({
    queryKey: [`/api/restaurant/dishes/${dishId}/cost-calculation`],
    enabled: !!dishId,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ingredients: [],
    },
  });

  // Initialize form with existing ingredients
  React.useEffect(() => {
    if (ingredients.length > 0) {
      const formattedIngredients = ingredients.map((ingredient: any) => ({
        stockItemId: ingredient.stockItemId,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        cost: ingredient.cost || ingredient.stockItem?.defaultPrice || "0",
        notes: ingredient.notes || "",
      }));
      form.reset({ ingredients: formattedIngredients });
    }
  }, [ingredients, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "ingredients",
  });

  const saveIngredientsMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return apiRequest(`/api/restaurant/dishes/${dishId}/ingredients`, {
        method: "PUT",
        body: { ingredients: data.ingredients },
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Dish ingredients updated successfully",
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/restaurant/dishes/${dishId}/ingredients`],
      });
      queryClient.invalidateQueries({
        queryKey: [`/api/restaurant/dishes/${dishId}/cost-calculation`],
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update ingredients",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    saveIngredientsMutation.mutate(data);
  };

  const addIngredient = () => {
    append({
      stockItemId: 0,
      quantity: "1",
      unit: "",
      cost: "0",
      notes: "",
    });
  };

  if (dishLoading || ingredientsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar
          isMobileMenuOpen={isMobileSidebarOpen}
          setIsMobileMenuOpen={setIsMobileSidebarOpen}
        />
        <div className="main-content">
          <Header
            title="Dish Ingredients"
            subtitle="Setup stock consumption for dishes"
            onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          />
          <main className="p-6">
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isMobileMenuOpen={isMobileSidebarOpen}
        setIsMobileMenuOpen={setIsMobileSidebarOpen}
      />
      <div className="main-content">
        <Header
          title="Dish Ingredients"
          subtitle="Setup stock consumption for dishes"
          onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
        <main className="p-6">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              onClick={() => navigate("/restaurant/dishes")}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dishes
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{dish?.name || 'Dish'} - Stock Consumption</h1>
              <p className="text-muted-foreground">
                Setup which stock items are consumed when this dish is ordered
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ingredients Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Stock Used or Reduced after Sales
                    <Button type="button" onClick={addIngredient} size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add More
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      {fields.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No ingredients added yet.</p>
                          <Button type="button" onClick={addIngredient} className="mt-4">
                            <Plus className="h-4 w-4 mr-2" />
                            Add First Ingredient
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {fields.map((field, index) => (
                            <div key={field.id} className="grid grid-cols-12 gap-4 items-end p-4 border rounded-lg">
                              <div className="col-span-3">
                                <FormField
                                  control={form.control}
                                  name={`ingredients.${index}.stockItemId`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Stock Item *</FormLabel>
                                      <Select
                                        onValueChange={(value) => {
                                          const stockItem = stockItems.find((item: any) => item.id === parseInt(value));
                                          field.onChange(parseInt(value));
                                          if (stockItem) {
                                            const unit = stockItem.measuringUnitSymbol || stockItem.measuringUnitName || '';
                                            const cost = stockItem.defaultPrice || "0";
                                            form.setValue(`ingredients.${index}.unit`, unit);
                                            form.setValue(`ingredients.${index}.cost`, cost);
                                          }
                                        }}
                                        value={field.value?.toString()}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select Stock Item" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {stockItems.map((item: any) => (
                                            <SelectItem key={item.id} value={item.id.toString()}>
                                              {item.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="col-span-2">
                                <FormField
                                  control={form.control}
                                  name={`ingredients.${index}.unit`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Unit *</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="kg, pcs, etc." readOnly className="bg-gray-100" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="col-span-2">
                                <FormField
                                  control={form.control}
                                  name={`ingredients.${index}.quantity`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>QTY *</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          type="number"
                                          step="0.001"
                                          min="0"
                                          placeholder="0"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="col-span-2">
                                <FormField
                                  control={form.control}
                                  name={`ingredients.${index}.cost`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Amount</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          type="number"
                                          step="0.01"
                                          min="0"
                                          placeholder="0"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="col-span-2">
                                <FormField
                                  control={form.control}
                                  name={`ingredients.${index}.notes`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Notes</FormLabel>
                                      <FormControl>
                                        <Input {...field} placeholder="Optional notes" />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="col-span-1">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => remove(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          <div className="flex justify-between">
                            <Button type="button" variant="outline" onClick={() => navigate("/restaurant/dishes")}>
                              Reset
                            </Button>
                            <Button
                              type="submit"
                              disabled={saveIngredientsMutation.isPending}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              {saveIngredientsMutation.isPending ? "Saving..." : "Save Consumption"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Cost Calculation Sidebar */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="h-4 w-4 mr-2" />
                    Cost Calculation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Ingredient Costs:</h4>
                      <div className="space-y-2 text-sm">
                        {form.watch("ingredients")?.filter((ing: any) => ing.stockItemId && ing.quantity && ing.cost).map((ingredient: any, index: number) => {
                          const stockItem = stockItems.find((item: any) => item.id === ingredient.stockItemId);
                          const quantity = parseFloat(ingredient.quantity || "0");
                          const cost = parseFloat(ingredient.cost || "0");
                          const total = quantity * cost;
                          
                          return (
                            <div key={index} className="flex justify-between">
                              <span className="text-muted-foreground">
                                {stockItem?.name || "Unknown"} ({quantity} {ingredient.unit || ""})
                              </span>
                              <span>Rs. {total.toFixed(2)}</span>
                            </div>
                          );
                        })}
                        {(!form.watch("ingredients") || form.watch("ingredients").length === 0) && (
                          <p className="text-muted-foreground text-sm">No ingredients added yet</p>
                        )}
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <div className="flex justify-between font-medium">
                        <span>Total Cost:</span>
                        <span>Rs. {(form.watch("ingredients")?.reduce((sum: number, ing: any) => {
                          const quantity = parseFloat(ing.quantity || "0");
                          const cost = parseFloat(ing.cost || "0");
                          return sum + (quantity * cost);
                        }, 0) || 0).toFixed(2)}</span>
                      </div>
                    </div>
                    {dish && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="flex justify-between text-sm">
                          <span>Dish Price:</span>
                          <span>Rs. {dish.price || '0'}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Gross Profit:</span>
                          <span className={parseFloat(dish.price || '0') - (form.watch("ingredients")?.reduce((sum: number, ing: any) => {
                            const quantity = parseFloat(ing.quantity || "0");
                            const cost = parseFloat(ing.cost || "0");
                            return sum + (quantity * cost);
                          }, 0) || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                            Rs. {(parseFloat(dish.price || '0') - (form.watch("ingredients")?.reduce((sum: number, ing: any) => {
                              const quantity = parseFloat(ing.quantity || "0");
                              const cost = parseFloat(ing.cost || "0");
                              return sum + (quantity * cost);
                            }, 0) || 0)).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Profit Margin:</span>
                          <span className={parseFloat(dish.price || '0') - (form.watch("ingredients")?.reduce((sum: number, ing: any) => {
                            const quantity = parseFloat(ing.quantity || "0");
                            const cost = parseFloat(ing.cost || "0");
                            return sum + (quantity * cost);
                          }, 0) || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {dish.price && parseFloat(dish.price) > 0 ? (((parseFloat(dish.price) - (form.watch("ingredients")?.reduce((sum: number, ing: any) => {
                              const quantity = parseFloat(ing.quantity || "0");
                              const cost = parseFloat(ing.cost || "0");
                              return sum + (quantity * cost);
                            }, 0) || 0)) / parseFloat(dish.price)) * 100).toFixed(1) : '0'}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Current Stock Status */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Stock Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {ingredients.map((ingredient: any) => (
                      <div key={ingredient.id} className="flex justify-between">
                        <span className="text-muted-foreground">{ingredient.stockItem?.name}</span>
                        <Badge variant={
                          parseFloat(ingredient.stockItem?.currentStock || '0') <= parseFloat(ingredient.stockItem?.reorderLevel || '0')
                            ? 'destructive'
                            : 'default'
                        }>
                          {ingredient.stockItem?.currentStock || '0'} {ingredient.stockItem?.measuringUnit?.symbol}
                        </Badge>
                      </div>
                    ))}
                    {ingredients.length === 0 && (
                      <p className="text-muted-foreground">No ingredients to show stock for</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}