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
  BedDouble,
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

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      reservationId: "",
      branchId: user?.branchId || 1,
      items: [],
      notes: "",
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const { order, items } = data;
      const response = await fetch("/api/restaurant/orders/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order, items }),
      });
      if (!response.ok) throw new Error("Failed to create order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders/room"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders"] });
      setSelectedReservation(null);
      setSelectedItems([]);
      setOriginalItems([]);
      toast({
        title: "Success",
        description: "Room order created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
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
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders/room"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders"] });
      toast({
        title: "Success",
        description: "Order status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
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
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders/room"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders"] });
      toast({
        title: "Success",
        description: "KOT generated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate KOT",
        variant: "destructive",
      });
    },
  });

  const handleSubmitOrder = async (data: OrderFormData) => {
    console.log("handleSubmitOrder called with data:", data);
    console.log("selectedItems:", selectedItems);
    console.log("selectedReservation:", selectedReservation);

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

    const orderData = {
      reservationId: selectedReservation.id,
      roomId: selectedReservation.reservationRooms?.[0]?.roomId || null, // Use first room as primary
      branchId: selectedReservation.branchId || user?.branchId || 1,
      orderType: "room",
      customerName: `${selectedReservation.guest.firstName} ${selectedReservation.guest.lastName}`,
      customerPhone: selectedReservation.guest.phone,
      notes: data.notes,
      subtotal: getSubtotal().toString(),
      totalAmount: getTotal().toString(),
      status: "pending",
    };

    const itemsData = selectedItems.map((item) => ({
      dishId: item.dishId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: (parseFloat(item.unitPrice) * item.quantity).toString(),
      specialInstructions: item.notes || null,
    }));

    console.log("Creating order with:", { order: orderData, items: itemsData });
    createOrderMutation.mutate({ order: orderData, items: itemsData });
  };

  const onSubmit = handleSubmitOrder;

  const addItem = (dish: any) => {
    const existingItem = selectedItems.find((item) => item.dishId === dish.id);
    if (existingItem) {
      setSelectedItems(
        selectedItems.map((item) =>
          item.dishId === dish.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          dishId: dish.id,
          dishName: dish.name,
          quantity: 1,
          unitPrice: dish.price,
          notes: "",
        },
      ]);
    }
  };

  const removeItem = (dishId: number) => {
    const existingItem = selectedItems.find((item) => item.dishId === dishId);
    if (existingItem && existingItem.quantity > 1) {
      setSelectedItems(
        selectedItems.map((item) =>
          item.dishId === dishId
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        ),
      );
    } else {
      setSelectedItems(selectedItems.filter((item) => item.dishId !== dishId));
    }
  };

  const getSubtotal = () => {
    return selectedItems.reduce(
      (total, item) => total + parseFloat(item.unitPrice) * item.quantity,
      0,
    );
  };

  const getTotal = () => {
    const subtotal = getSubtotal();
    let totalTaxAmount = 0;
    if (orderTaxes) {
      for (const tax of orderTaxes) {
        totalTaxAmount += (subtotal * parseFloat(tax.rate)) / 100;
      }
    }
    return subtotal + totalTaxAmount;
  };

  const getFilteredDishes = () => {
    const menuDishes = dishes || [];

    // Filter by category if selected
    if (!selectedCategory || selectedCategory === "all") {
      return menuDishes;
    }

    return menuDishes.filter((item: any) => {
      return item.categoryId === parseInt(selectedCategory);
    });
  };

  const getReservationOrder = (reservationId: string) => {
    return orders?.find(
      (order: any) =>
        order.reservation_id === reservationId &&
        order.status !== "completed" &&
        order.status !== "cancelled",
    );
  };

  const handleReservationClick = (reservation: any) => {
    setSelectedReservation(reservation);
    setSelectedItems([]);
    setOriginalItems([]);
    setSelectedCategory("all");

    // If reservation has an existing order, load its items
    const existingOrder = getReservationOrder(reservation.id);
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
            subtitle="Manage reservation orders"
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
            title={`${selectedReservation.guest.firstName} ${selectedReservation.guest.lastName} - Reservation Order`}
            subtitle={
              existingOrder
                ? `Managing order for ${selectedReservation.reservationRooms?.length || 0} room(s) - Add more items`
                : `Create order for ${selectedReservation.reservationRooms?.length || 0} room(s) in this reservation`
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
                onClick={() => setSelectedReservation(null)}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Reservations
              </Button>

              {/* Reservation Details */}
              <Card className="mb-6 border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">
                        Reservation Details
                      </h3>
                      <p className="text-sm text-gray-600">
                        ID: {selectedReservation.id.split('-')[0]}... | Status: {selectedReservation.status}
                      </p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">
                      {selectedReservation.reservationRooms?.length || 0} Room(s)
                    </Badge>
                  </div>
                  
                  {/* Room Details */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Rooms in this reservation:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {selectedReservation.reservationRooms?.map((roomRes: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 p-2 rounded text-sm">
                          <span className="font-medium">Room {roomRes.room?.number}</span>
                          <span className="text-gray-600 ml-1">({roomRes.room?.roomType?.name})</span>
                          <div className="text-xs text-gray-500">
                            {roomRes.adults || 0} adults, {roomRes.children || 0} children
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {existingOrder && (
                <Card className="mb-6 border-l-4 border-l-orange-500">
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
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setViewingOrder(existingOrder)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => generateKOTMutation.mutate(existingOrder.id)}
                          disabled={generateKOTMutation.isPending}
                          className="bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          {generateKOTMutation.isPending ? "Generating..." : "Generate KOT"}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Menu Items */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Utensils className="h-5 w-5 mr-2" />
                      Menu Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {/* Category Filter */}
                    <div className="mb-4">
                      <Select
                        value={selectedCategory}
                        onValueChange={setSelectedCategory}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Category" />
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

                    {/* Menu Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                      {getFilteredDishes()?.map((dish: any) => (
                        <Card
                          key={dish.id}
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => addItem(dish)}
                        >
                          <CardContent className="p-4">
                            <h4 className="font-medium text-sm mb-1">
                              {dish.name}
                            </h4>
                            <p className="text-xs text-gray-500 mb-2">
                              {dish.description}
                            </p>
                            <p className="font-bold text-green-600">
                              Rs. {parseFloat(dish.price).toFixed(2)}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Summary */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedItems.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        No items selected
                      </p>
                    ) : (
                      <>
                        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                          {selectedItems.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex-1">
                                <h4 className="font-medium text-sm">
                                  {item.dishName}
                                </h4>
                                <p className="text-xs text-gray-500">
                                  Rs. {parseFloat(item.unitPrice).toFixed(2)} each
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removeItem(item.dishId)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Minus className="h-4 w-4" />
                                </Button>
                                <span className="font-medium min-w-[2rem] text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addItem({ id: item.dishId, name: item.dishName, price: item.unitPrice })}
                                  className="h-8 w-8 p-0"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="text-right ml-4">
                                <p className="font-bold">
                                  Rs.{" "}
                                  {(
                                    parseFloat(item.unitPrice) * item.quantity
                                  ).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Order Total */}
                        <div className="border-t pt-4 space-y-2">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>Rs. {getSubtotal().toFixed(2)}</span>
                          </div>
                          {orderTaxes?.map((tax: any) => (
                            <div key={tax.id} className="flex justify-between text-sm">
                              <span>{tax.name} ({tax.rate}%):</span>
                              <span>
                                Rs.{" "}
                                {((getSubtotal() * parseFloat(tax.rate)) / 100).toFixed(2)}
                              </span>
                            </div>
                          ))}
                          <div className="flex justify-between font-bold text-lg border-t pt-2">
                            <span>Total:</span>
                            <span>Rs. {getTotal().toFixed(2)}</span>
                          </div>
                        </div>

                        <Form {...form}>
                          <form
                            onSubmit={form.handleSubmit(handleSubmitOrder)}
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
                                (getReservationOrder(selectedReservation?.id) &&
                                  !hasOrderChanged())
                              }
                            >
                              {createOrderMutation.isPending ? (
                                <div className="flex items-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                  {getReservationOrder(selectedReservation?.id)
                                    ? "Updating..."
                                    : "Creating..."}
                                </div>
                              ) : getReservationOrder(selectedReservation?.id) ? (
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

  // Show reservations grid (like tables grid but for reservations)
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isMobileMenuOpen={isMobileSidebarOpen}
        setIsMobileMenuOpen={setIsMobileSidebarOpen}
      />
      <div className="main-content">
        <Header
          title="Reservation Orders"
          subtitle="Click on a reservation to manage food orders for all rooms"
          onMobileMenuToggle={() =>
            setIsMobileSidebarOpen(!isMobileSidebarOpen)
          }
        />
        <main className="p-6">
          {/* Reservations Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {reservations?.filter((reservation: any) => 
              reservation.status === 'checked-in' || reservation.status === 'confirmed'
            )?.map((reservation: any) => {
              const reservationOrder = getReservationOrder(reservation.id);
              const hasOrder = !!reservationOrder;

              return (
                <Card
                  key={reservation.id}
                  className={`cursor-pointer transition-all hover:shadow-lg ${
                    hasOrder
                      ? "border-l-4 border-l-orange-500 bg-orange-50"
                      : "border-l-4 border-l-green-500 bg-green-50"
                  }`}
                  onClick={() => handleReservationClick(reservation)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <BedDouble
                          className={`h-5 w-5 ${hasOrder ? "text-orange-600" : "text-green-600"}`}
                        />
                        <span className="font-semibold">
                          {reservation.guest.firstName} {reservation.guest.lastName}
                        </span>
                      </div>
                      <Badge
                        className={hasOrder ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800"}
                      >
                        {hasOrder ? "Has Order" : "Available"}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Reservation ID:</span>
                        <span className="font-medium text-xs">
                          {reservation.id.split('-')[0]}...
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Rooms:</span>
                        <div className="text-right">
                          <span className="font-medium">
                            {reservation.reservationRooms?.length || 0} room(s)
                          </span>
                          <div className="text-xs text-gray-500">
                            {reservation.reservationRooms?.map((rr: any, idx: number) => (
                              <span key={idx}>
                                {rr.room?.number}
                                {idx < (reservation.reservationRooms?.length - 1) ? ', ' : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-medium capitalize">
                          {reservation.status}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="font-medium">
                          {reservation.guest.phone}
                        </span>
                      </div>
                      {hasOrder && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Order #:</span>
                            <span className="font-medium">
                              {reservationOrder.orderNumber}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Order Status:</span>
                            <Badge className={getStatusColor(reservationOrder.status)}>
                              {reservationOrder.status}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Total:</span>
                            <span className="font-bold text-green-600">
                              Rs. {reservationOrder.totalAmount}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        Click to {hasOrder ? "manage order" : "create order"}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {reservation.reservationRooms?.reduce((total: number, room: any) => 
                            total + (room.adults || 0) + (room.children || 0), 0) || 0} guests
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {(!reservations || reservations.filter((r: any) => 
            r.status === 'checked-in' || r.status === 'confirmed'
          ).length === 0) && (
            <div className="text-center py-12">
              <BedDouble className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Active Reservations
              </h3>
              <p className="text-gray-500">
                No confirmed or checked-in reservations available for room orders.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Order View Dialog */}
      {viewingOrder && (
        <Dialog open={!!viewingOrder} onOpenChange={() => setViewingOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order #{viewingOrder.orderNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Customer</label>
                  <p>{viewingOrder.customerName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p>{viewingOrder.customerPhone}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <Badge className={getStatusColor(viewingOrder.status)}>
                    {viewingOrder.status}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total</label>
                  <p className="font-bold">Rs. {viewingOrder.totalAmount}</p>
                </div>
              </div>

              {viewingOrder.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                  <p>{viewingOrder.notes}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">Items</label>
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
                    {viewingOrder.items?.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{item.dish?.name || 'Unknown Item'}</TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>Rs. {parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                        <TableCell>Rs. {parseFloat(item.totalPrice).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}