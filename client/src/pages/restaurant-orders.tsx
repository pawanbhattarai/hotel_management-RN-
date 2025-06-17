import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  Eye,
  FileText,
  Printer,
  Minus,
  Trash2,
  ShoppingCart,
  Clock,
  CheckCircle,
  Users,
  Utensils,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  tableId: z.number().min(1, "Table is required"),
  branchId: z.number().min(1, "Branch is required"),
  items: z
    .array(
      z.object({
        dishId: z.number().min(1, "Dish is required"),
        quantity: z.number().min(1, "Quantity must be at least 1"),
        unitPrice: z.string().min(1, "Price is required"),
        notes: z.string().optional(),
      }),
    )
    .optional(),
  notes: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

export default function RestaurantOrders() {
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [originalItems, setOriginalItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/restaurant/orders"],
  });

  const { data: tables, isLoading: tablesLoading } = useQuery({
    queryKey: ["/api/restaurant/tables"],
  });

  const { data: dishes } = useQuery({
    queryKey: ["/api/restaurant/dishes"],
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/restaurant/categories"],
  });

  const { data: branches } = useQuery({
    queryKey: ["/api/branches"],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: { order: any; items: any[] }) => {
      console.log("Sending order creation request:", data);
      const response = await fetch("/api/restaurant/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      console.log("Order creation response:", responseData);

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to create order");
      }
      return responseData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders"] });
      const existingOrder = selectedTable
        ? getTableOrder(selectedTable.id)
        : null;
      setSelectedTable(null);
      setSelectedItems([]);
      setOriginalItems([]);
      toast({
        title: existingOrder
          ? "Order updated successfully"
          : "Order created successfully",
        description: existingOrder
          ? "Items have been added to the order!"
          : "Your order has been placed!",
      });
    },
    onError: (error: any) => {
      console.error("Order creation failed:", error);
      toast({
        title: "Failed to create order",
        description:
          error.message || "An error occurred while creating the order",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/restaurant/orders/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update order status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders"] });
      toast({ title: "Order status updated" });
    },
  });

  const generateKOTMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/restaurant/orders/${orderId}/kot`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to generate KOT");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "KOT generated successfully" });
    },
  });

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      tableId: selectedTable?.id || 0,
      branchId: user?.role === "superadmin" ? 1 : user?.branchId || 1,
      items: [],
      notes: "",
    },
  });

  // Update form values when table changes
  React.useEffect(() => {
    if (selectedTable) {
      form.setValue("tableId", selectedTable.id);
    }
  }, [selectedTable, form]);

  const onSubmit = (data: OrderFormData) => {
    console.log("Form submitted with data:", data);
    console.log("Selected items:", selectedItems);
    console.log("Selected table:", selectedTable);

    const existingOrder = getTableOrder(selectedTable.id);

    if (selectedItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the order",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTable) {
      toast({
        title: "Error",
        description: "No table selected",
        variant: "destructive",
      });
      return;
    }

    // For existing orders, only submit new/changed items
    if (existingOrder && !hasOrderChanged()) {
      toast({
        title: "No changes",
        description: "No changes detected in the order",
        variant: "default",
      });
      return;
    }

    // Determine branch ID based on user role
    let branchId: number;
    if (user?.role === "superadmin") {
      branchId = branches?.[0]?.id || 1;
    } else {
      branchId = user?.branchId || 1;
    }

    const subtotal = calculateSubtotal();
    const taxAmount = subtotal * 0.1; // 10% tax
    const total = subtotal + taxAmount;

    const orderData = {
      tableId: selectedTable.id,
      branchId: branchId,
      subtotal: subtotal.toString(),
      taxAmount: taxAmount.toString(),
      totalAmount: total.toString(),
      notes: data.notes || "",
      status: "pending" as const,
      orderType: "dine-in" as const,
      paymentStatus: "pending" as const,
    };

    const itemsData = selectedItems.map((item) => ({
      dishId: item.dishId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: (parseFloat(item.unitPrice) * item.quantity).toString(),
      specialInstructions: item.notes || "",
      status: "pending" as const,
    }));

    console.log("Creating order with data:", {
      order: orderData,
      items: itemsData,
    });

    createOrderMutation.mutate({
      order: orderData,
      items: itemsData,
    });
  };

  const addItem = (dish: any) => {
    if (!dish || !dish.id || !dish.price) {
      toast({
        title: "Error",
        description: "Invalid dish data",
        variant: "destructive",
      });
      return;
    }

    const existingItem = selectedItems.find((item) => item.dishId === dish.id);
    if (existingItem) {
      setSelectedItems((items) =>
        items.map((item) =>
          item.dishId === dish.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setSelectedItems((items) => [
        ...items,
        {
          dishId: dish.id,
          dishName: dish.name,
          quantity: 1,
          unitPrice: dish.price.toString(),
          notes: "",
        },
      ]);
    }
  };

  const removeItem = (dishId: number) => {
    setSelectedItems((items) => items.filter((item) => item.dishId !== dishId));
  };

  const updateItemQuantity = (dishId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(dishId);
    } else {
      setSelectedItems((items) =>
        items.map((item) =>
          item.dishId === dishId ? { ...item, quantity } : item,
        ),
      );
    }
  };

  const calculateSubtotal = () => {
    return selectedItems.reduce(
      (total, item) => total + parseFloat(item.unitPrice) * item.quantity,
      0,
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
    return (
      dishes?.filter(
        (dish: any) => dish.categoryId === parseInt(selectedCategory),
      ) || []
    );
  };

  const getTableOrder = (tableId: number) => {
    return orders?.find(
      (order: any) =>
        order.tableId === tableId &&
        order.status !== "completed" &&
        order.status !== "cancelled",
    );
  };

  const handleTableClick = (table: any) => {
    setSelectedTable(table);
    setSelectedItems([]);
    setOriginalItems([]);
    setSelectedCategory("all");

    // If table has an existing order, load its items
    const existingOrder = getTableOrder(table.id);
    if (existingOrder && existingOrder.items) {
      const orderItems = existingOrder.items.map((item: any) => ({
        dishId: item.dishId,
        dishName: item.dish?.name || "Unknown Dish",
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        notes: item.specialInstructions || "",
      }));
      setSelectedItems(orderItems);
      setOriginalItems(JSON.parse(JSON.stringify(orderItems))); // Deep copy for comparison
    }
  };

  // Check if order has been modified
  const hasOrderChanged = () => {
    if (originalItems.length === 0 && selectedItems.length === 0) return false;
    if (originalItems.length !== selectedItems.length) return true;

    return JSON.stringify(originalItems) !== JSON.stringify(selectedItems);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "confirmed":
        return "bg-blue-100 text-blue-800";
      case "preparing":
        return "bg-orange-100 text-orange-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "served":
        return "bg-gray-100 text-gray-800";
      case "completed":
        return "bg-emerald-100 text-emerald-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (tablesLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar
          isMobileMenuOpen={isMobileSidebarOpen}
          setIsMobileMenuOpen={setIsMobileSidebarOpen}
        />
        <div className="main-content">
          <Header
            title="Restaurant Orders"
            subtitle="Manage table orders"
            onMobileMenuToggle={() =>
              setIsMobileSidebarOpen(!isMobileSidebarOpen)
            }
          />
          <main className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Show order interface for selected table
  if (selectedTable) {
    const existingOrder = getTableOrder(selectedTable.id);

    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar
          isMobileMenuOpen={isMobileSidebarOpen}
          setIsMobileMenuOpen={setIsMobileSidebarOpen}
        />
        <div className="main-content">
          <Header
            title={`Table ${selectedTable.name} - Order`}
            subtitle={
              existingOrder
                ? "Add more items to existing order"
                : "Create new order"
            }
            onMobileMenuToggle={() =>
              setIsMobileSidebarOpen(!isMobileSidebarOpen)
            }
          />
          <main className="p-6">
            {/* Back Button */}
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={() => setSelectedTable(null)}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tables
              </Button>

              {existingOrder && (
                <Card className="mb-6 border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">
                          Existing Order #{existingOrder.orderNumber}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Status:{" "}
                          <Badge
                            className={getStatusColor(existingOrder.status)}
                          >
                            {existingOrder.status}
                          </Badge>
                        </p>
                        <p className="text-sm text-gray-600">
                          Total: Rs. {existingOrder.totalAmount}
                        </p>
                      </div>
                      <div className="space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingOrder(existingOrder)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Select
                          value={existingOrder.status}
                          onValueChange={(status) =>
                            updateStatusMutation.mutate({
                              id: existingOrder.id,
                              status,
                            })
                          }
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
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Menu Selection */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Menu Items</CardTitle>
                      <Select
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {categories?.map((category: any) => (
                            <SelectItem
                              key={category.id}
                              value={category.id.toString()}
                            >
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                      {getFilteredDishes().map((dish: any) => (
                        <Card
                          key={dish.id}
                          className="hover:shadow-md transition-shadow cursor-pointer"
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className="font-medium">{dish.name}</h4>
                                <p className="text-green-600 font-semibold">
                                  Rs. {dish.price}
                                </p>
                                {dish.description && (
                                  <p className="text-sm text-gray-500 mt-1">
                                    {dish.description}
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => addItem(dish)}
                                className="ml-2"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Summary */}
              <div>
                <Card className="sticky top-4">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Order Summary
                      {selectedItems.length > 0 && (
                        <Badge className="ml-2">{selectedItems.length}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedItems.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingCart className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500">No items selected</p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                          {selectedItems.map((item) => (
                            <div
                              key={item.dishId}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded"
                            >
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">
                                  {item.dishName}
                                </h4>
                                <p className="text-xs text-gray-600">
                                  Rs. {item.unitPrice} each
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    updateItemQuantity(
                                      item.dishId,
                                      item.quantity - 1,
                                    )
                                  }
                                  className="h-6 w-6 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-6 text-center text-sm">
                                  {item.quantity}
                                </span>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    updateItemQuantity(
                                      item.dishId,
                                      item.quantity + 1,
                                    )
                                  }
                                  className="h-6 w-6 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeItem(item.dishId)}
                                  className="h-6 w-6 p-0 text-red-500"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="border-t pt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>Rs. {calculateSubtotal().toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Tax (10%):</span>
                            <span>
                              Rs. {(calculateSubtotal() * 0.1).toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between font-semibold text-lg border-t pt-2">
                            <span>Total:</span>
                            <span>Rs. {calculateTotal().toFixed(2)}</span>
                          </div>
                        </div>

                        <Form {...form}>
                          <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="mt-4 space-y-4"
                          >
                            <FormField
                              control={form.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Order Notes</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      {...field}
                                      placeholder="Special instructions..."
                                      className="h-20"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button
                              type="submit"
                              className="w-full"
                              disabled={
                                createOrderMutation.isPending ||
                                selectedItems.length === 0 ||
                                (getTableOrder(selectedTable?.id) &&
                                  !hasOrderChanged())
                              }
                              onClick={(e) => {
                                e.preventDefault();
                                console.log(
                                  "Button clicked, submitting form...",
                                );
                                form.handleSubmit(onSubmit)(e);
                              }}
                            >
                              {createOrderMutation.isPending ? (
                                <div className="flex items-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                  {getTableOrder(selectedTable?.id)
                                    ? "Updating..."
                                    : "Creating..."}
                                </div>
                              ) : getTableOrder(selectedTable?.id) ? (
                                "Add Items to Order"
                              ) : (
                                "Create Order"
                              )}
                            </Button>
                          </form>
                        </Form>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Show tables grid
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isMobileMenuOpen={isMobileSidebarOpen}
        setIsMobileMenuOpen={setIsMobileSidebarOpen}
      />
      <div className="main-content">
        <Header
          title="Restaurant Tables"
          subtitle="Click on a table to manage orders"
          onMobileMenuToggle={() =>
            setIsMobileSidebarOpen(!isMobileSidebarOpen)
          }
        />
        <main className="p-6">
          {/* Tables Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {tables?.map((table: any) => {
              const tableOrder = getTableOrder(table.id);
              const isOccupied = !!tableOrder;

              return (
                <Card
                  key={table.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    isOccupied
                      ? "border-l-4 border-l-orange-500 bg-orange-50"
                      : "border-l-4 border-l-green-500 bg-green-50"
                  }`}
                  onClick={() => handleTableClick(table)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <Utensils
                          className={`h-5 w-5 ${isOccupied ? "text-orange-600" : "text-green-600"}`}
                        />
                        <h3 className="font-semibold text-lg">
                          Table {table.name}
                        </h3>
                      </div>
                      <div
                        className={`w-3 h-3 rounded-full ${isOccupied ? "bg-orange-500" : "bg-green-500"}`}
                      ></div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2" />
                        <span>Capacity: {table.capacity}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        {isOccupied && tableOrder && (
                          <Badge className={getStatusColor(tableOrder.status)}>
                            {tableOrder.status}
                          </Badge>
                        )}
                      </div>

                      {isOccupied && tableOrder && (
                        <div className="mt-3 pt-3 border-t">
                          <p className="text-sm text-gray-600">
                            Order #{tableOrder.orderNumber}
                          </p>
                          <p className="text-sm font-semibold text-green-600">
                            Rs. {tableOrder.totalAmount}
                          </p>
                          <p className="text-xs text-gray-500">
                            {tableOrder.items?.length || 0} items
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {!tables?.length && (
            <div className="text-center py-12">
              <Utensils className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 font-medium">No tables found</p>
              <p className="text-sm text-gray-400">
                Add tables to start taking orders.
              </p>
            </div>
          )}

          {/* View Order Modal */}
          {viewingOrder && (
            <Dialog
              open={!!viewingOrder}
              onOpenChange={() => setViewingOrder(null)}
            >
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Order Details - #{viewingOrder.orderNumber}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Table:
                      </p>
                      <p className="font-semibold">
                        {viewingOrder.table?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Status:
                      </p>
                      <Badge className={getStatusColor(viewingOrder.status)}>
                        {viewingOrder.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Total:
                      </p>
                      <p className="font-bold text-green-600">
                        Rs. {viewingOrder.totalAmount}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">
                        Created:
                      </p>
                      <p className="text-sm">
                        {new Date(viewingOrder.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Order Items</h4>
                    <div className="space-y-2">
                      {viewingOrder.items?.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded"
                        >
                          <div>
                            <p className="font-medium">{item.dish?.name}</p>
                            <p className="text-sm text-gray-600">
                              Qty: {item.quantity} × Rs. {item.unitPrice}
                            </p>
                          </div>
                          <p className="font-semibold text-green-600">
                            Rs.{" "}
                            {(
                              parseFloat(item.unitPrice) * item.quantity
                            ).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {viewingOrder.notes && (
                    <div>
                      <h4 className="font-semibold mb-2">Notes</h4>
                      <p className="text-gray-700 bg-gray-50 p-2 rounded">
                        {viewingOrder.notes}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() =>
                        generateKOTMutation.mutate(viewingOrder.id)
                      }
                      variant="outline"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Generate KOT
                    </Button>
                    <Button
                      onClick={() => setViewingOrder(null)}
                      variant="outline"
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </main>
      </div>
    </div>
  );
}
