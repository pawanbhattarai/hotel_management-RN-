
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Eye, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { toast } = useToast();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['/api/restaurant/orders'],
  });

  const { data: tables } = useQuery({
    queryKey: ['/api/restaurant/tables'],
  });

  const { data: dishes } = useQuery({
    queryKey: ['/api/restaurant/dishes'],
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
      toast({ title: "Order created successfully" });
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
      toast({ title: "Order status updated" });
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
      items: [],
      notes: "",
    },
  });

  const resetForm = () => {
    form.reset({
      items: [],
      notes: "",
    });
    setSelectedItems([]);
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
        notes: item.notes,
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-blue-500';
      case 'preparing': return 'bg-orange-500';
      case 'ready': return 'bg-green-500';
      case 'served': return 'bg-gray-500';
      case 'completed': return 'bg-green-700';
      case 'cancelled': return 'bg-red-500';
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
          title="Restaurant Orders"
          subtitle="Manage and track restaurant orders"
          onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
        <main className="p-6">
          {/* Add Button Section */}
          <div className="mb-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Order</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tableId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Table</FormLabel>
                            <FormControl>
                              <Select 
                                value={field.value?.toString()} 
                                onValueChange={(value) => field.onChange(parseInt(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select table" />
                                </SelectTrigger>
                                <SelectContent>
                                  {tables?.filter((table: any) => table.status === 'open').map((table: any) => (
                                    <SelectItem key={table.id} value={table.id.toString()}>
                                      {table.name} (Capacity: {table.capacity})
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
                        control={form.control}
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
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Available Dishes</h3>
                        <div className="max-h-80 overflow-y-auto space-y-2">
                          {dishes?.map((dish: any) => (
                            <div key={dish.id} className="flex justify-between items-center p-3 border rounded-lg">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{dish.name}</div>
                                <div className="text-sm text-muted-foreground">Rs. {dish.price}</div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => addItem(dish)}
                                className="ml-2 flex-shrink-0"
                              >
                                Add
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-semibold mb-2">Order Items</h3>
                        <div className="max-h-80 overflow-y-auto space-y-2">
                          {selectedItems.map((item) => (
                            <div key={item.dishId} className="flex justify-between items-center p-3 border rounded-lg">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{item.dishName}</div>
                                <div className="text-sm text-muted-foreground">
                                  Rs. {item.unitPrice} × {item.quantity} = Rs. {(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 flex-shrink-0">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateItemQuantity(item.dishId, item.quantity - 1)}
                                >
                                  -
                                </Button>
                                <span className="w-8 text-center">{item.quantity}</span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateItemQuantity(item.dishId, item.quantity + 1)}
                                >
                                  +
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeItem(item.dishId)}
                                >
                                  ×
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {selectedItems.length > 0 && (
                          <div className="mt-4 p-4 bg-muted rounded-lg">
                            <div className="flex justify-between text-sm">
                              <span>Subtotal:</span>
                              <span>Rs. {calculateSubtotal().toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Tax (10%):</span>
                              <span>Rs. {(calculateSubtotal() * 0.1).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold border-t pt-2 mt-2">
                              <span>Total:</span>
                              <span>Rs. {calculateTotal().toFixed(2)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createOrderMutation.isPending || selectedItems.length === 0}
                      >
                        Create Order
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders?.length ? (
                      orders.map((order: any) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                          <TableCell>{order.table?.name}</TableCell>
                          <TableCell>
                            <Badge className={`${getStatusColor(order.status)} text-white`}>
                              {order.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{order.items?.length || 0}</TableCell>
                          <TableCell>Rs. {order.totalAmount}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingOrder(order)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Select
                                value={order.status}
                                onValueChange={(status) => updateStatusMutation.mutate({ id: order.id, status })}
                              >
                                <SelectTrigger className="w-32">
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
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateBOTMutation.mutate(order.id)}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          No orders found. Create your first order to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* View Order Modal */}
          {viewingOrder && (
            <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Order Details - #{viewingOrder.orderNumber}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Table:</span>
                      <p className="font-medium">{viewingOrder.table?.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge className={`${getStatusColor(viewingOrder.status)} text-white ml-2`}>
                        {viewingOrder.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Created:</span>
                      <p className="font-medium text-sm">{new Date(viewingOrder.createdAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Total:</span>
                      <p className="font-medium">Rs. {viewingOrder.totalAmount}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Order Items</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Dish</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewingOrder.items?.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.dish?.name}</TableCell>
                              <TableCell>Rs. {item.unitPrice}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>Rs. {(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {viewingOrder.notes && (
                    <div>
                      <span className="text-sm text-muted-foreground">Notes:</span>
                      <p className="font-medium">{viewingOrder.notes}</p>
                    </div>
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
