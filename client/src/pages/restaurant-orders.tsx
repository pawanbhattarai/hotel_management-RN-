
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Eye, FileText, Printer, Minus, Trash2, ShoppingCart, Clock, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useAuth } from "@/hooks/useAuth";

const orderSchema = z.object({
  tableId: z.number(),
  branchId: z.number(),
  items: z.array(z.object({
    dishId: z.number(),
    quantity: z.number(),
    unitPrice: z.string(),
    notes: z.string().optional(),
  })),
  notes: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

export default function RestaurantOrders() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['/api/restaurant/orders'],
  });

  const { data: tables } = useQuery({
    queryKey: ['/api/restaurant/tables'],
  });

  const { data: dishes } = useQuery({
    queryKey: ['/api/restaurant/dishes'],
  });

  const { data: categories } = useQuery({
    queryKey: ['/api/restaurant/categories'],
  });

  const { data: branches } = useQuery({
    queryKey: ['/api/branches'],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: { order: any; items: any[] }) => {
      const response = await fetch('/api/restaurant/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create order');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/orders'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Order created successfully", description: "Your order has been placed!" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/restaurant/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update order status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/orders'] });
      toast({ title: "Order status updated", description: "Status has been successfully updated!" });
    },
  });

  const generateKOTMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/restaurant/orders/${orderId}/kot`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to generate KOT');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "KOT generated successfully" });
    },
  });

  const generateBOTMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/restaurant/orders/${orderId}/bot`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to generate BOT');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "BOT generated successfully" });
    },
  });

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      tableId: 0,
      branchId: user?.role !== "superadmin" ? user?.branchId : undefined,
      items: [],
      notes: "",
    },
  });

  const resetForm = () => {
    form.reset({
      tableId: 0,
      branchId: user?.role !== "superadmin" ? user?.branchId : undefined,
      items: [],
      notes: "",
    });
    setSelectedItems([]);
    setSelectedCategory("all");
  };

  const onSubmit = (data: OrderFormData) => {
    const orderData = {
      tableId: data.tableId,
      branchId: data.branchId,
      subtotal: calculateSubtotal().toString(),
      totalAmount: calculateTotal().toString(),
      notes: data.notes,
      status: "pending",
    };

    createOrderMutation.mutate({
      order: orderData,
      items: selectedItems.map(item => ({
        dishId: item.dishId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: (parseFloat(item.unitPrice) * item.quantity).toString(),
        specialInstructions: item.notes,
      })),
    });
  };

  const addItem = (dish: any) => {
    const existingItem = selectedItems.find(item => item.dishId === dish.id);
    if (existingItem) {
      setSelectedItems(items =>
        items.map(item =>
          item.dishId === dish.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setSelectedItems(items => [...items, {
        dishId: dish.id,
        dishName: dish.name,
        quantity: 1,
        unitPrice: dish.price,
        notes: "",
      }]);
    }
  };

  const removeItem = (dishId: number) => {
    setSelectedItems(items => items.filter(item => item.dishId !== dishId));
  };

  const updateItemQuantity = (dishId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(dishId);
    } else {
      setSelectedItems(items =>
        items.map(item =>
          item.dishId === dishId ? { ...item, quantity } : item
        )
      );
    }
  };

  const calculateSubtotal = () => {
    return selectedItems.reduce((total, item) => 
      total + (parseFloat(item.unitPrice) * item.quantity), 0
    );
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = subtotal * 0.1; // 10% tax
    return subtotal + tax;
  };

  const getFilteredDishes = () => {
    if (!selectedCategory || selectedCategory === "all") {
      return dishes || [];
    }
    return dishes?.filter((dish: any) => dish.categoryId === parseInt(selectedCategory)) || [];
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'preparing': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'ready': return 'bg-green-100 text-green-800 border-green-200';
      case 'served': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'completed': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'confirmed': return <CheckCircle className="h-3 w-3" />;
      case 'preparing': return <Clock className="h-3 w-3" />;
      case 'ready': return <CheckCircle className="h-3 w-3" />;
      case 'served': return <CheckCircle className="h-3 w-3" />;
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      case 'cancelled': return <Trash2 className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Sidebar
        isMobileMenuOpen={isMobileSidebarOpen}
        setIsMobileMenuOpen={setIsMobileSidebarOpen}
      />
      <div className="main-content">
        <Header
          title="Restaurant Orders"
          subtitle="Manage and track restaurant orders"
          onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
        <main className="p-4 lg:p-6">
          {/* Add Button Section */}
          <div className="mb-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
                <DialogHeader className="pb-4 border-b">
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    Create New Order
                  </DialogTitle>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
                      {/* Order Information Section */}
                      <Card className="border-2 border-orange-100 shadow-sm">
                        <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 rounded-t-lg">
                          <CardTitle className="flex items-center text-orange-800">
                            <ShoppingCart className="h-5 w-5 mr-2" />
                            Order Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="tableId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-gray-700 font-medium">Table *</FormLabel>
                                  <FormControl>
                                    <Select 
                                      value={field.value?.toString()} 
                                      onValueChange={(value) => field.onChange(parseInt(value))}
                                    >
                                      <SelectTrigger className="border-2 border-gray-200 focus:border-orange-300">
                                        <SelectValue placeholder="Select table" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {tables?.filter((table: any) => table.status === 'open').map((table: any) => (
                                          <SelectItem key={table.id} value={table.id.toString()}>
                                            <div className="flex items-center">
                                              <div className="w-3 h-3 bg-green-400 rounded-full mr-2"></div>
                                              Table {table.name} (Capacity: {table.capacity})
                                            </div>
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
                                control={form.control}
                                name="branchId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-gray-700 font-medium">Branch *</FormLabel>
                                    <FormControl>
                                      <Select
                                        value={field.value?.toString()}
                                        onValueChange={(value) => field.onChange(parseInt(value))}
                                      >
                                        <SelectTrigger className="border-2 border-gray-200 focus:border-orange-300">
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
                        </CardContent>
                      </Card>

                      {/* Menu Selection and Order Summary */}
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Menu Selection */}
                        <div className="xl:col-span-2">
                          <Card className="border-2 border-blue-100 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <CardTitle className="text-blue-800 flex items-center">
                                  <FileText className="h-5 w-5 mr-2" />
                                  Menu Items
                                </CardTitle>
                                <div className="w-full sm:w-64">
                                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                    <SelectTrigger className="border-2 border-blue-200 focus:border-blue-400">
                                      <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">🍽️ All Categories</SelectItem>
                                      {categories?.map((category: any) => (
                                        <SelectItem key={category.id} value={category.id.toString()}>
                                          📋 {category.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4">
                              <div className="max-h-96 overflow-y-auto">
                                {getFilteredDishes().length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {getFilteredDishes().map((dish: any) => (
                                      <Card key={dish.id} className="group hover:shadow-md transition-all duration-300 border hover:border-orange-300 cursor-pointer">
                                        <CardContent className="p-4">
                                          <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1 min-w-0">
                                              <h4 className="font-semibold text-gray-800 truncate group-hover:text-orange-600 transition-colors">
                                                {dish.name}
                                              </h4>
                                              <div className="flex items-center gap-2 mt-1">
                                                <span className="text-lg font-bold text-green-600">Rs. {dish.price}</span>
                                                {dish.category && (
                                                  <Badge variant="outline" className="text-xs bg-gray-50">
                                                    {dish.category.name}
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                            <Button
                                              type="button"
                                              size="sm"
                                              onClick={() => addItem(dish)}
                                              className="ml-2 flex-shrink-0 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-sm"
                                            >
                                              <Plus className="h-4 w-4" />
                                            </Button>
                                          </div>
                                          {dish.description && (
                                            <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                                              {dish.description}
                                            </p>
                                          )}
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-center py-12">
                                    <div className="text-gray-400 mb-2">
                                      <FileText className="h-12 w-12 mx-auto" />
                                    </div>
                                    <p className="text-gray-500 font-medium">
                                      {selectedCategory && selectedCategory !== "all" 
                                        ? "No dishes found in this category"
                                        : "No dishes available"
                                      }
                                    </p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Order Summary */}
                        <div className="xl:col-span-1">
                          <Card className="border-2 border-green-100 shadow-lg sticky top-4">
                            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
                              <CardTitle className="text-green-800 flex items-center">
                                <ShoppingCart className="h-5 w-5 mr-2" />
                                Order Summary
                                {selectedItems.length > 0 && (
                                  <Badge className="ml-2 bg-green-500">{selectedItems.length}</Badge>
                                )}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                              {selectedItems.length === 0 ? (
                                <div className="text-center py-8">
                                  <div className="text-gray-400 mb-3">
                                    <ShoppingCart className="h-12 w-12 mx-auto" />
                                  </div>
                                  <p className="text-gray-500 font-medium">No items selected</p>
                                  <p className="text-sm text-gray-400 mt-1">Add items from the menu to start</p>
                                </div>
                              ) : (
                                <>
                                  <div className="max-h-64 overflow-y-auto mb-4 space-y-3">
                                    {selectedItems.map((item) => (
                                      <Card key={item.dishId} className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200">
                                        <CardContent className="p-3">
                                          <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1 min-w-0">
                                              <h4 className="font-medium text-sm text-gray-800 truncate">
                                                {item.dishName}
                                              </h4>
                                              <p className="text-xs text-gray-600">Rs. {item.unitPrice} each</p>
                                            </div>
                                            <Button
                                              type="button"
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => removeItem(item.dishId)}
                                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => updateItemQuantity(item.dishId, item.quantity - 1)}
                                                className="h-7 w-7 p-0 border-gray-300 hover:bg-gray-100"
                                              >
                                                <Minus className="h-3 w-3" />
                                              </Button>
                                              <span className="w-8 text-center text-sm font-bold text-gray-800">
                                                {item.quantity}
                                              </span>
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="outline"
                                                onClick={() => updateItemQuantity(item.dishId, item.quantity + 1)}
                                                className="h-7 w-7 p-0 border-gray-300 hover:bg-gray-100"
                                              >
                                                <Plus className="h-3 w-3" />
                                              </Button>
                                            </div>
                                            <span className="text-sm font-bold text-green-600">
                                              Rs. {(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}
                                            </span>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    ))}
                                  </div>

                                  <div className="border-t-2 border-gray-200 pt-4 space-y-2">
                                    <div className="flex justify-between text-sm text-gray-600">
                                      <span>Subtotal:</span>
                                      <span>Rs. {calculateSubtotal().toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-gray-600">
                                      <span>Tax (10%):</span>
                                      <span>Rs. {(calculateSubtotal() * 0.1).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg text-gray-800 border-t pt-2">
                                      <span>Total:</span>
                                      <span className="text-green-600">Rs. {calculateTotal().toFixed(2)}</span>
                                    </div>
                                  </div>
                                </>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </div>

                      {/* Order Notes */}
                      <Card className="border-2 border-purple-100">
                        <CardContent className="p-4">
                          <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-gray-700 font-medium">Order Notes (Optional)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    {...field} 
                                    placeholder="Any special instructions or notes for this order..."
                                    className="border-2 border-gray-200 focus:border-purple-300 min-h-[80px]"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      {/* Action Buttons */}
                      <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-200">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsDialogOpen(false)}
                          className="px-6"
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={createOrderMutation.isPending || selectedItems.length === 0}
                          className="px-8 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg"
                        >
                          {createOrderMutation.isPending ? "Creating..." : "Create Order"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Orders List */}
          <Card className="shadow-xl border-0 bg-white/50 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-t-lg">
              <CardTitle className="text-xl flex items-center">
                <FileText className="h-6 w-6 mr-2" />
                All Orders
                {orders?.length > 0 && (
                  <Badge className="ml-3 bg-white/20 text-white border-white/30">
                    {orders.length} orders
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-500 border-t-transparent"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-700">Order #</TableHead>
                        <TableHead className="font-semibold text-gray-700">Table</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700">Items</TableHead>
                        <TableHead className="font-semibold text-gray-700">Total</TableHead>
                        <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders?.length ? (
                        orders.map((order: any) => (
                          <TableRow key={order.id} className="hover:bg-gray-50 transition-colors">
                            <TableCell className="font-mono font-medium text-blue-600">
                              #{order.orderNumber}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                                <span className="font-medium">{order.table?.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(order.status)} border flex items-center gap-1 w-fit`}>
                                {getStatusIcon(order.status)}
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-blue-50 border-blue-200 text-blue-700">
                                {order.items?.length || 0} items
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold text-green-600">
                              Rs. {order.totalAmount}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setViewingOrder(order)}
                                  className="hover:bg-blue-50 hover:border-blue-300"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Select
                                  value={order.status}
                                  onValueChange={(status) => updateStatusMutation.mutate({ id: order.id, status })}
                                >
                                  <SelectTrigger className="w-32 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="confirmed">Confirmed</SelectItem>
                                    <SelectItem value="preparing">Preparing</SelectItem>
                                    <SelectItem value="ready">Ready</SelectItem>
                                    <SelectItem value="served">Served</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => generateKOTMutation.mutate(order.id)}
                                  className="hover:bg-green-50 hover:border-green-300"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => generateBOTMutation.mutate(order.id)}
                                  className="hover:bg-purple-50 hover:border-purple-300"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="text-gray-400 mb-3">
                              <ShoppingCart className="h-12 w-12 mx-auto" />
                            </div>
                            <p className="text-gray-500 font-medium">No orders found</p>
                            <p className="text-sm text-gray-400 mt-1">Create your first order to get started.</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* View Order Modal */}
          {viewingOrder && (
            <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b pb-4">
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Order Details - #{viewingOrder.orderNumber}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Card className="border-blue-200">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm text-gray-500 font-medium">Table:</span>
                            <p className="font-semibold text-gray-800">{viewingOrder.table?.name}</p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500 font-medium">Status:</span>
                            <div className="mt-1">
                              <Badge className={`${getStatusColor(viewingOrder.status)} border flex items-center gap-1 w-fit`}>
                                {getStatusIcon(viewingOrder.status)}
                                {viewingOrder.status}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-green-200">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div>
                            <span className="text-sm text-gray-500 font-medium">Created:</span>
                            <p className="font-semibold text-gray-800 text-sm">
                              {new Date(viewingOrder.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-500 font-medium">Total:</span>
                            <p className="font-bold text-xl text-green-600">Rs. {viewingOrder.totalAmount}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-purple-200">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50">
                      <CardTitle className="text-purple-800">Order Items</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold">Dish</TableHead>
                            <TableHead className="font-semibold">Price</TableHead>
                            <TableHead className="font-semibold">Qty</TableHead>
                            <TableHead className="font-semibold">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewingOrder.items?.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.dish?.name}</TableCell>
                              <TableCell className="text-green-600 font-medium">Rs. {item.unitPrice}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="bg-blue-50">
                                  {item.quantity}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-bold text-green-600">
                                Rs. {(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {viewingOrder.notes && (
                    <Card className="border-amber-200">
                      <CardHeader className="bg-amber-50">
                        <CardTitle className="text-amber-800 text-sm">Order Notes</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <p className="text-gray-700">{viewingOrder.notes}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </main>
      </div>
    </div>
  );
}
