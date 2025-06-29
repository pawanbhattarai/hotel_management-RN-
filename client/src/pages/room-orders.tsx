import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  QrCode, 
  UtensilsCrossed,
  Clock,
  DollarSign,
  Users,
  Search,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

interface RoomOrder {
  id: string;
  orderNumber: string;
  roomId: number;
  reservationId?: string;
  branchId: number;
  status: string;
  orderType: string;
  customerName: string;
  customerPhone?: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  paidAmount: string;
  paymentStatus: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  room: {
    number: string;
    floor?: number;
    roomType: {
      name: string;
    };
  };
  reservation?: {
    id: string;
    guest: {
      firstName: string;
      lastName: string;
      phone?: string;
      email?: string;
    };
    checkInDate: string;
    checkOutDate: string;
    status: string;
  };
  items: Array<{
    id: number;
    dishId: number;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    specialInstructions?: string;
    dish: {
      name: string;
      description?: string;
    };
  }>;
}

interface Room {
  id: number;
  number: string;
  floor?: number;
  status: string;
  roomType: {
    id: number;
    name: string;
  };
  qrToken: string;
}

interface Reservation {
  id: string;
  guestId: number;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  guest: {
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
  rooms: Array<{
    roomId: number;
    room: {
      number: string;
      roomType: {
        name: string;
      };
    };
  }>;
}

export default function RoomOrders() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCreateOrderModalOpen, setIsCreateOrderModalOpen] = useState(false);
  const [isViewOrderModalOpen, setIsViewOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<RoomOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [roomFilter, setRoomFilter] = useState("");

  // Form states for creating new room orders
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedReservationId, setSelectedReservationId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  // Fetch room orders
  const { data: roomOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/restaurant/orders/room"],
    enabled: isAuthenticated,
  });

  // Fetch rooms for order creation
  const { data: rooms } = useQuery({
    queryKey: ["/api/rooms"],
    enabled: isAuthenticated,
  });

  // Fetch active reservations
  const { data: reservations } = useQuery({
    queryKey: ["/api/reservations"],
    enabled: isAuthenticated,
  });

  // Create room order mutation
  const createRoomOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest("POST", "/api/restaurant/orders/room", orderData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Room order created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders/room"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/dashboard/metrics"] });
      setIsCreateOrderModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create room order. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      return await apiRequest("PATCH", `/api/restaurant/orders/${orderId}/status`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Order status updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders/room"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update order status.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedRoomId("");
    setSelectedReservationId("");
    setCustomerName("");
    setCustomerPhone("");
    setOrderNotes("");
  };

  const handleReservationChange = (reservationId: string) => {
    setSelectedReservationId(reservationId);
    const reservation = reservations?.find((r: Reservation) => r.id === reservationId);
    if (reservation) {
      setCustomerName(`${reservation.guest.firstName} ${reservation.guest.lastName}`);
      setCustomerPhone(reservation.guest.phone || "");
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "confirmed":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "preparing":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "ready":
        return "bg-green-100 text-green-800 border-green-200";
      case "served":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "completed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "cancelled":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPaymentStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 border-green-200";
      case "partial":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "pending":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const filteredOrders = roomOrders?.filter((order: RoomOrder) => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.room.number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || statusFilter === "all" || order.status === statusFilter;
    const matchesRoom = !roomFilter || roomFilter === "all" || order.roomId.toString() === roomFilter;
    
    return matchesSearch && matchesStatus && matchesRoom;
  });

  const generateRoomQR = async (roomId: number) => {
    try {
      const response = await apiRequest("POST", `/api/qr/room/${roomId}/regenerate`);
      const qrUrl = `${window.location.origin}/order/${response.qrToken}`;
      
      // Open QR code in new window for display/download
      const qrWindow = window.open("", "_blank");
      if (qrWindow) {
        qrWindow.document.write(`
          <html>
            <head><title>Room ${roomId} QR Code</title></head>
            <body style="text-align: center; padding: 20px;">
              <h2>Room ${roomId} Order QR Code</h2>
              <img src="${response.qrCode}" alt="QR Code" style="max-width: 300px;">
              <p>URL: <a href="${qrUrl}" target="_blank">${qrUrl}</a></p>
              <button onclick="window.print()">Print</button>
            </body>
          </html>
        `);
      }
      
      toast({
        title: "QR Code Generated",
        description: `QR code for room ${roomId} has been generated and opened in a new window.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate QR code.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please log in to access this page.</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)} 
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onMenuClick={() => setIsMobileSidebarOpen(true)} />
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Room Orders</h1>
                <p className="text-gray-600">Manage in-room dining and service orders</p>
              </div>
              <Button
                onClick={() => setIsCreateOrderModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Room Order
              </Button>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="search">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="search"
                        placeholder="Search by order number, customer, or room..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <div className="min-w-[150px]">
                    <Label htmlFor="status-filter">Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
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

                  <div className="min-w-[150px]">
                    <Label htmlFor="room-filter">Room</Label>
                    <Select value={roomFilter} onValueChange={setRoomFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All rooms" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All rooms</SelectItem>
                        {rooms?.map((room: Room) => (
                          <SelectItem key={room.id} value={room.id.toString()}>
                            Room {room.number} ({room.roomType.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Orders Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5" />
                  Room Service Orders ({filteredOrders?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ordersLoading ? (
                  <div className="text-center py-8">Loading orders...</div>
                ) : !filteredOrders?.length ? (
                  <div className="text-center py-8 text-gray-500">
                    No room orders found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Room</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Reservation</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.map((order: RoomOrder) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">
                              {order.orderNumber}
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">Room {order.room.number}</div>
                                <div className="text-sm text-gray-500">
                                  {order.room.roomType.name}
                                  {order.room.floor && ` - Floor ${order.room.floor}`}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{order.customerName}</div>
                                {order.customerPhone && (
                                  <div className="text-sm text-gray-500">{order.customerPhone}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {order.reservation ? (
                                <div>
                                  <div className="font-medium">
                                    {order.reservation.guest.firstName} {order.reservation.guest.lastName}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {new Date(order.reservation.checkInDate).toLocaleDateString()} - {new Date(order.reservation.checkOutDate).toLocaleDateString()}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-400">Walk-in</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {order.items?.length || 0} items
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">Rs. {parseFloat(order.totalAmount).toFixed(2)}</div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusBadgeVariant(order.status)}>
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getPaymentStatusBadgeVariant(order.paymentStatus)}>
                                {order.paymentStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(order.createdAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(order.createdAt).toLocaleTimeString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setIsViewOrderModalOpen(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => generateRoomQR(order.roomId)}
                                >
                                  <QrCode className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Create Room Order Modal */}
      <Dialog open={isCreateOrderModalOpen} onOpenChange={setIsCreateOrderModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Room Order</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="room-select">Room *</Label>
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms?.filter((room: Room) => room.status === "occupied").map((room: Room) => (
                      <SelectItem key={room.id} value={room.id.toString()}>
                        Room {room.number} - {room.roomType.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reservation-select">Link to Reservation (Optional)</Label>
                <Select value={selectedReservationId} onValueChange={handleReservationChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reservation" />
                  </SelectTrigger>
                  <SelectContent>
                    {reservations?.filter((res: Reservation) => 
                      res.status === "checked-in" && 
                      res.rooms.some(r => r.roomId.toString() === selectedRoomId)
                    ).map((reservation: Reservation) => (
                      <SelectItem key={reservation.id} value={reservation.id}>
                        {reservation.guest.firstName} {reservation.guest.lastName} - {reservation.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer-name">Customer Name *</Label>
                <Input
                  id="customer-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <Label htmlFor="customer-phone">Customer Phone</Label>
                <Input
                  id="customer-phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="order-notes">Order Notes</Label>
              <Input
                id="order-notes"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Special instructions or notes"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateOrderModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!selectedRoomId || !customerName) {
                    toast({
                      title: "Error",
                      description: "Please fill in all required fields",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  const orderData = {
                    roomId: parseInt(selectedRoomId),
                    reservationId: selectedReservationId || null,
                    customerName,
                    customerPhone: customerPhone || null,
                    notes: orderNotes || null,
                    orderType: "room",
                  };
                  
                  createRoomOrderMutation.mutate(orderData);
                }}
                disabled={createRoomOrderMutation.isPending}
              >
                {createRoomOrderMutation.isPending ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Order Modal */}
      <Dialog open={isViewOrderModalOpen} onOpenChange={setIsViewOrderModalOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Order Details - {selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Information */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Order Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Order Number:</span>
                      <span>{selectedOrder.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Status:</span>
                      <Badge className={getStatusBadgeVariant(selectedOrder.status)}>
                        {selectedOrder.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Payment Status:</span>
                      <Badge className={getPaymentStatusBadgeVariant(selectedOrder.paymentStatus)}>
                        {selectedOrder.paymentStatus}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Created:</span>
                      <span>{new Date(selectedOrder.createdAt).toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Customer & Room</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Customer:</span>
                      <span>{selectedOrder.customerName}</span>
                    </div>
                    {selectedOrder.customerPhone && (
                      <div className="flex justify-between">
                        <span className="font-medium">Phone:</span>
                        <span>{selectedOrder.customerPhone}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="font-medium">Room:</span>
                      <span>Room {selectedOrder.room.number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Room Type:</span>
                      <span>{selectedOrder.room.roomType.name}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Order Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedOrder.items?.length ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Total Price</TableHead>
                          <TableHead>Special Instructions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrder.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.dish.name}</div>
                                {item.dish.description && (
                                  <div className="text-sm text-gray-500">{item.dish.description}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>Rs. {parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                            <TableCell>Rs. {parseFloat(item.totalPrice).toFixed(2)}</TableCell>
                            <TableCell>{item.specialInstructions || "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-gray-500">No items in this order</p>
                  )}
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>Rs. {parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>Rs. {parseFloat(selectedOrder.taxAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>Rs. {parseFloat(selectedOrder.totalAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paid:</span>
                      <span>Rs. {parseFloat(selectedOrder.paidAmount).toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                {selectedOrder.status !== "completed" && selectedOrder.status !== "cancelled" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        updateOrderStatusMutation.mutate({
                          orderId: selectedOrder.id,
                          status: "confirmed"
                        });
                      }}
                      disabled={selectedOrder.status === "confirmed" || updateOrderStatusMutation.isPending}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Confirm Order
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        updateOrderStatusMutation.mutate({
                          orderId: selectedOrder.id,
                          status: "cancelled"
                        });
                      }}
                      disabled={updateOrderStatusMutation.isPending}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Cancel Order
                    </Button>
                  </>
                )}
                <Button
                  onClick={() => generateRoomQR(selectedOrder.roomId)}
                >
                  <QrCode className="w-4 h-4 mr-1" />
                  Generate QR Code
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}