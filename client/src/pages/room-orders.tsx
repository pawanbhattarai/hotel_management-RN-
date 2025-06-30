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
  reservationId: z.string().min(1, "Reservation is required"),
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

export default function RoomOrders() {
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [originalItems, setOriginalItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewingOrder, setViewingOrder] = useState<any>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/restaurant/orders/room"],
    refetchInterval: 2000, // Real-time polling every 2 seconds for immediate updates
  });

  const { data: reservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ["/api/reservations"],
  });

  const { data: dishes } = useQuery({
    queryKey: ["/api/restaurant/dishes"],
  });

  const { data: categories } = useQuery({
    queryKey: ["/api/restaurant/categories"],
  });

  const { data: orderTaxes } = useQuery({
    queryKey: ["/api/taxes/order"],
  });

  const { data: branches } = useQuery({
    queryKey: ["/api/branches"],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: { order: any; items: any[] }) => {
      console.log("Sending room order creation request:", data);
      const response = await fetch("/api/restaurant/orders/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      console.log("Room order creation response:", responseData);

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to create room order");
      }
      return responseData;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders/room"] });
      const existingOrder = selectedReservation
        ? getReservationOrder(selectedReservation.id)
        : null;
      
      // Automatically generate KOT for new orders
      if (!existingOrder && data?.id) {
        try {
          await generateKOTMutation.mutateAsync(data.id);
          toast({
            title: "Room order created successfully",
            description: "Your order has been placed and KOT generated!",
          });
        } catch (error) {
          toast({
            title: "Order created but KOT generation failed",
            description: "Please generate KOT manually from the order view",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: existingOrder
            ? "Order updated successfully"
            : "Room order created successfully",
          description: existingOrder
            ? "Items have been added to the order!"
            : "Your order has been placed!",
        });
      }
      
      setSelectedReservation(null);
      setSelectedItems([]);
      setOriginalItems([]);
    },
    onError: (error: any) => {
      console.error("Room order creation failed:", error);
      toast({
        title: "Failed to create room order",
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
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders/room"] });
      toast({ title: "Order status updated" });
    },
  });

  const generateKOTMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await fetch(`/api/restaurant/orders/${orderId}/kot`, {
        method: "POST",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate KOT");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders/room"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/kot"] });
      toast({ 
        title: "KOT generated successfully",
        description: `KOT ${data.kotNumber} has been created and sent to kitchen`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to generate KOT",
        description: error.message || "An error occurred while generating KOT",
        variant: "destructive",
      });
    },
  });

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      reservationId: selectedReservation?.id || "",
      branchId: user?.role === "superadmin" ? 1 : user?.branchId || 1,
      items: [],
      notes: "",
    },
  });

  // Update form values when reservation changes
  React.useEffect(() => {
    if (selectedReservation) {
      form.setValue("reservationId", selectedReservation.id);
    }
  }, [selectedReservation, form]);

  const onSubmit = (data: OrderFormData) => {
    console.log("Form submitted with data:", data);
    console.log("Selected items:", selectedItems);
    console.log("Selected reservation:", selectedReservation);

    const existingOrder = getReservationOrder(selectedReservation.id);

    if (selectedItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the order",
        variant: "destructive",
      });
      return;
    }

    if (!selectedReservation) {
      toast({
        title: "Error",
        description: "No reservation selected",
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

    // Calculate taxes dynamically
    let totalTaxAmount = 0;
    const appliedTaxes = [];

    if (orderTaxes) {
      for (const tax of orderTaxes) {
        const taxAmount = (subtotal * parseFloat(tax.rate)) / 100;
        totalTaxAmount += taxAmount;
        appliedTaxes.push({
          taxId: tax.id,
          taxName: tax.taxName,
          rate: tax.rate,
          amount: taxAmount.toFixed(2)
        });
      }
    }

    const total = subtotal + totalTaxAmount;

    const orderData = {
      reservationId: selectedReservation.id,
      roomId: selectedReservation.reservationRooms?.[0]?.roomId || null,
      branchId,
      orderType: "room",
      customerName: `${selectedReservation.guest?.firstName || ""} ${selectedReservation.guest?.lastName || ""}`.trim(),
      customerPhone: selectedReservation.guest?.phone || "",
      subtotal: subtotal.toFixed(2),
      taxAmount: totalTaxAmount.toFixed(2),
      appliedTaxes: appliedTaxes.length > 0 ? appliedTaxes : null,
      totalAmount: total.toFixed(2),
      notes: data.notes || "",
      status: "pending",
    };

    const itemsData = selectedItems.map((item) => ({
      dishId: item.dishId,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice).toFixed(2),
      totalPrice: (parseFloat(item.unitPrice) * item.quantity).toFixed(2),
      specialInstructions: item.notes || null,
    }));

    console.log("Submitting room order:", { order: orderData, items: itemsData });

    createOrderMutation.mutate({ order: orderData, items: itemsData });
  };

  const calculateSubtotal = () => {
    return selectedItems.reduce(
      (sum, item) => sum + parseFloat(item.unitPrice) * item.quantity,
      0,
    );
  };

  const hasOrderChanged = () => {
    if (originalItems.length !== selectedItems.length) return true;
    return selectedItems.some((item, index) => {
      const originalItem = originalItems[index];
      return (
        !originalItem ||
        item.dishId !== originalItem.dishId ||
        item.quantity !== originalItem.quantity ||
        item.notes !== originalItem.notes
      );
    });
  };

  const addItemToOrder = (dish: any) => {
    const existingItemIndex = selectedItems.findIndex(
      (item) => item.dishId === dish.id,
    );

    if (existingItemIndex >= 0) {
      const updatedItems = [...selectedItems];
      updatedItems[existingItemIndex].quantity += 1;
      setSelectedItems(updatedItems);
    } else {
      const newItem = {
        dishId: dish.id,
        dishName: dish.name,
        unitPrice: dish.price,
        quantity: 1,
        notes: "",
      };
      setSelectedItems([...selectedItems, newItem]);
    }
  };

  const updateItemQuantity = (dishId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItemFromOrder(dishId);
      return;
    }

    const updatedItems = selectedItems.map((item) =>
      item.dishId === dishId ? { ...item, quantity } : item,
    );
    setSelectedItems(updatedItems);
  };

  const removeItemFromOrder = (dishId: number) => {
    setSelectedItems(selectedItems.filter((item) => item.dishId !== dishId));
  };

  const updateItemNotes = (dishId: number, notes: string) => {
    const updatedItems = selectedItems.map((item) =>
      item.dishId === dishId ? { ...item, notes } : item,
    );
    setSelectedItems(updatedItems);
  };

  const getReservationOrder = (reservationId: string) => {
    return orders?.find((order: any) => order.reservationId === reservationId);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      preparing: "bg-orange-100 text-orange-800",
      ready: "bg-green-100 text-green-800",
      served: "bg-purple-100 text-purple-800",
      completed: "bg-gray-100 text-gray-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const filteredDishes = dishes?.filter((dish: any) => {
    if (selectedCategory === "all") return true;
    return dish.categoryId === parseInt(selectedCategory);
  });

  const checkedInReservations = reservations?.filter(
    (reservation: any) => reservation.status === "checked-in"
  ) || [];

  if (reservationsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar
          isMobileMenuOpen={isMobileSidebarOpen}
          setIsMobileMenuOpen={setIsMobileSidebarOpen}
        />
        <div className="main-content">
          <Header
            title="Room Orders"
            subtitle="Manage room service orders"
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

  // Show order interface for selected reservation
  if (selectedReservation) {
    const existingOrder = getReservationOrder(selectedReservation.id);

    return (
      <div className="min-h-screen bg-gray-50">
        <Sidebar
          isMobileMenuOpen={isMobileSidebarOpen}
          setIsMobileMenuOpen={setIsMobileSidebarOpen}
        />
        <div className="main-content">
          <Header
            title={`Room Order - ${selectedReservation.guest?.firstName} ${selectedReservation.guest?.lastName}`}
            subtitle={`Room ${selectedReservation.reservationRooms?.[0]?.room?.number} • ${selectedReservation.confirmationNumber}`}
            onMobileMenuToggle={() =>
              setIsMobileSidebarOpen(!isMobileSidebarOpen)
            }
          />
          <main className="p-6">
            <div className="mb-6">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedReservation(null);
                  setSelectedItems([]);
                  setOriginalItems([]);
                }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Reservations
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Menu Categories & Dishes */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Utensils className="h-5 w-5" />
                      Menu
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Category Filter */}
                    <div className="mb-4">
                      <Select
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select category" />
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

                    {/* Dishes Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredDishes?.map((dish: any) => (
                        <Card
                          key={dish.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => addItemToOrder(dish)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h3 className="font-medium">{dish.name}</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                  {dish.description || "No description"}
                                </p>
                                <div className="mt-2">
                                  <span className="font-semibold text-green-600">
                                    ${dish.price}
                                  </span>
                                </div>
                              </div>
                              <Button size="sm" className="ml-2">
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {filteredDishes?.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No dishes available in this category
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Order Summary */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {existingOrder && (
                          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                              Existing order found: {existingOrder.orderNumber}
                            </p>
                            <p className="text-xs text-blue-600">
                              Adding items will update the existing order
                            </p>
                          </div>
                        )}

                        {/* Selected Items */}
                        <div className="space-y-3">
                          {selectedItems.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">
                              No items selected
                            </p>
                          ) : (
                            selectedItems.map((item) => (
                              <div
                                key={item.dishId}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex-1">
                                  <p className="font-medium">{item.dishName}</p>
                                  <p className="text-sm text-gray-600">
                                    ${item.unitPrice} each
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateItemQuantity(
                                        item.dishId,
                                        item.quantity - 1,
                                      )
                                    }
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="w-8 text-center">
                                    {item.quantity}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateItemQuantity(
                                        item.dishId,
                                        item.quantity + 1,
                                      )
                                    }
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => removeItemFromOrder(item.dishId)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Special Notes */}
                        <FormField
                          control={form.control}
                          name="notes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Special Instructions</FormLabel>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Any special requests or notes..."
                                  rows={3}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Order Total */}
                        {selectedItems.length > 0 && (
                          <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>${calculateSubtotal().toFixed(2)}</span>
                            </div>
                            {orderTaxes?.map((tax: any) => {
                              const taxAmount = (calculateSubtotal() * parseFloat(tax.rate)) / 100;
                              return (
                                <div key={tax.id} className="flex justify-between text-sm text-gray-600">
                                  <span>{tax.taxName} ({tax.rate}%):</span>
                                  <span>${taxAmount.toFixed(2)}</span>
                                </div>
                              );
                            })}
                            <div className="flex justify-between font-semibold text-lg border-t pt-2">
                              <span>Total:</span>
                              <span>
                                ${(
                                  calculateSubtotal() +
                                  (orderTaxes?.reduce((total: number, tax: any) => {
                                    return total + (calculateSubtotal() * parseFloat(tax.rate)) / 100;
                                  }, 0) || 0)
                                ).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Submit Button */}
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={selectedItems.length === 0 || createOrderMutation.isPending}
                        >
                          {createOrderMutation.isPending
                            ? "Creating Order..."
                            : existingOrder
                            ? "Update Order"
                            : "Create Room Order"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Main reservations view
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isMobileMenuOpen={isMobileSidebarOpen}
        setIsMobileMenuOpen={setIsMobileSidebarOpen}
      />
      <div className="main-content">
        <Header
          title="Room Orders"
          subtitle="Manage room service orders for hotel guests"
          onMobileMenuToggle={() =>
            setIsMobileSidebarOpen(!isMobileSidebarOpen)
          }
        />
        <main className="p-6">
          {/* Current Orders */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Active Room Orders ({orders?.length || 0})
            </h2>
            
            {ordersLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-8 bg-gray-200 rounded w-full"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : orders?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map((order: any) => (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold">{order.orderNumber}</h3>
                          <p className="text-sm text-gray-600">
                            {order.customerName || "Guest"}
                          </p>
                          <p className="text-sm text-gray-600">
                            Room {order.roomId || "N/A"}
                          </p>
                        </div>
                        <Badge className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Items:</span>
                          <span>{order.items?.length || 0}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total:</span>
                          <span className="font-semibold">${order.totalAmount}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Time:</span>
                          <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingOrder(order)}
                          className="flex-1"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        
                        {order.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => generateKOTMutation.mutate(order.id)}
                            disabled={generateKOTMutation.isPending}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            KOT
                          </Button>
                        )}
                      </div>

                      {/* Status Update Buttons */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {["confirmed", "preparing", "ready", "served", "completed"].map((status) => (
                          <Button
                            key={status}
                            variant={order.status === status ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: order.id, status })}
                            disabled={updateStatusMutation.isPending}
                            className="text-xs px-2 py-1 h-auto"
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Utensils className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No Active Room Orders</h3>
                  <p className="text-gray-600">Room service orders will appear here when guests place them.</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Available Reservations */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Checked-in Guests ({checkedInReservations.length})
            </h2>
            
            {checkedInReservations.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">No Checked-in Guests</h3>
                  <p className="text-gray-600">Guests need to be checked in before placing room service orders.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {checkedInReservations.map((reservation: any) => {
                  const existingOrder = getReservationOrder(reservation.id);
                  return (
                    <Card
                      key={reservation.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        setSelectedReservation(reservation);
                        if (existingOrder) {
                          // Load existing order items for editing
                          const orderItems = existingOrder.items?.map((item: any) => ({
                            dishId: item.dishId,
                            dishName: item.dish?.name || `Item ${item.dishId}`,
                            unitPrice: item.unitPrice,
                            quantity: item.quantity,
                            notes: item.specialInstructions || "",
                          })) || [];
                          setSelectedItems(orderItems);
                          setOriginalItems([...orderItems]);
                        }
                      }}
                    >
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold">
                              {reservation.guest?.firstName} {reservation.guest?.lastName}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {reservation.confirmationNumber}
                            </p>
                          </div>
                          {existingOrder && (
                            <Badge variant="secondary">
                              Has Order
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Room:</span>
                            <span className="font-medium">
                              {reservation.reservationRooms?.[0]?.room?.number || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Phone:</span>
                            <span>{reservation.guest?.phone || "N/A"}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Check-in:</span>
                            <span>
                              {new Date(reservation.reservationRooms?.[0]?.checkInDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <Button className="w-full mt-4" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          {existingOrder ? "Update Order" : "Create Room Order"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Order Details Dialog */}
      <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details - {viewingOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Customer</h4>
                  <p className="text-sm text-gray-600">{viewingOrder.customerName}</p>
                </div>
                <div>
                  <h4 className="font-medium">Room</h4>
                  <p className="text-sm text-gray-600">Room {viewingOrder.roomId}</p>
                </div>
                <div>
                  <h4 className="font-medium">Status</h4>
                  <Badge className={getStatusColor(viewingOrder.status)}>
                    {viewingOrder.status}
                  </Badge>
                </div>
                <div>
                  <h4 className="font-medium">Total</h4>
                  <p className="text-sm font-semibold">${viewingOrder.totalAmount}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Order Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingOrder.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.dish?.name || `Item ${item.dishId}`}</p>
                            {item.specialInstructions && (
                              <p className="text-xs text-gray-600 italic">{item.specialInstructions}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>${item.unitPrice}</TableCell>
                        <TableCell>${item.totalPrice}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {viewingOrder.notes && (
                <div>
                  <h4 className="font-medium">Notes</h4>
                  <p className="text-sm text-gray-600">{viewingOrder.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}