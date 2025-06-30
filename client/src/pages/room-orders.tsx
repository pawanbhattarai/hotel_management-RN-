import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Utensils, Plus, Clock, User } from "lucide-react";

export default function RoomOrders() {
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/restaurant/orders/room"],
    refetchInterval: 3000,
  });

  const { data: reservations = [] } = useQuery({
    queryKey: ["/api/reservations"],
  });

  const updateOrderMutation = useMutation({
    mutationFn: (data: { orderId: string; status: string }) =>
      apiRequest(`/api/restaurant/orders/${data.orderId}`, {
        method: "PATCH",
        body: { status: data.status },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders/room"] });
      toast({ title: "Order status updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update order status", variant: "destructive" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "confirmed": return "bg-blue-100 text-blue-800";
      case "preparing": return "bg-orange-100 text-orange-800";
      case "ready": return "bg-green-100 text-green-800";
      case "served": return "bg-gray-100 text-gray-800";
      case "completed": return "bg-green-200 text-green-900";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getCheckedInReservations = () => {
    return reservations.filter((res: any) => res.status === "checked-in");
  };

  if (ordersLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Utensils className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Room Orders</h1>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Room Order
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Active Orders ({orders.length})</h2>
          
          {orders.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                <Utensils className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No room orders found</p>
                <p className="text-sm">Orders will appear here when guests place them</p>
              </CardContent>
            </Card>
          ) : (
            orders.map((order: any) => (
              <Card 
                key={order.id} 
                className={`cursor-pointer transition-colors ${
                  selectedOrder?.id === order.id ? "border-primary" : ""
                }`}
                onClick={() => setSelectedOrder(order)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                        <User className="h-4 w-4" />
                        {order.customerName || "Guest"}
                        {order.roomId && <span>• Room {order.roomId}</span>}
                      </div>
                    </div>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Clock className="h-4 w-4" />
                      {new Date(order.createdAt).toLocaleTimeString()}
                    </div>
                    <div className="font-semibold">
                      ${order.totalAmount}
                    </div>
                  </div>
                  {order.items && (
                    <div className="mt-2 text-sm text-gray-600">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Order Details */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Order Details</h2>
          
          {selectedOrder ? (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{selectedOrder.orderNumber}</CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedOrder.customerName || "Guest"} • {new Date(selectedOrder.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Badge className={getStatusColor(selectedOrder.status)}>
                    {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Order Items */}
                <div>
                  <h3 className="font-medium mb-2">Items</h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{item.dish?.name || `Item ${item.dishId}`}</div>
                          <div className="text-sm text-gray-600">Qty: {item.quantity}</div>
                          {item.specialInstructions && (
                            <div className="text-sm text-gray-600 italic">{item.specialInstructions}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${item.totalPrice}</div>
                          <div className="text-sm text-gray-600">${item.unitPrice} each</div>
                        </div>
                      </div>
                    )) || <p className="text-gray-500">No items found</p>}
                  </div>
                </div>

                {/* Order Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total</span>
                    <span>${selectedOrder.totalAmount}</span>
                  </div>
                </div>

                {/* Status Actions */}
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Update Status</h3>
                  <div className="flex flex-wrap gap-2">
                    {["pending", "confirmed", "preparing", "ready", "served", "completed"].map((status) => (
                      <Button
                        key={status}
                        variant={selectedOrder.status === status ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateOrderMutation.mutate({ 
                          orderId: selectedOrder.id, 
                          status 
                        })}
                        disabled={updateOrderMutation.isPending}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                <p>Select an order to view details</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Available Reservations Info */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Available Reservations for Room Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {getCheckedInReservations().length === 0 ? (
              <p className="text-gray-500">No checked-in guests available for room orders</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getCheckedInReservations().map((reservation: any) => (
                  <div key={reservation.id} className="p-3 border rounded-lg">
                    <div className="font-medium">
                      {reservation.guest?.firstName} {reservation.guest?.lastName}
                    </div>
                    <div className="text-sm text-gray-600">
                      Room: {reservation.reservationRooms?.[0]?.room?.number}
                    </div>
                    <div className="text-sm text-gray-600">
                      {reservation.confirmationNumber}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}