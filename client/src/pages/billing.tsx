import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { HotelSettings } from "@/../../shared/schema";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Printer,
  CreditCard,
  Receipt,
  Eye,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Billing() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [viewingBill, setViewingBill] = useState<any>(null);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [billData, setBillData] = useState({
    paymentMethod: "cash",
    notes: "",
    discount: 0,
    discountPercentage: 0,
    roomDates: [] as Array<{
      roomId: number;
      checkInDate: string;
      checkOutDate: string;
    }>,
  });
  const [showDateChanges, setShowDateChanges] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [reservationToDelete, setReservationToDelete] = useState<any>(null);

  const { data: reservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ["/api/reservations"],
    enabled: isAuthenticated,
  });

  const { data: hotelSettings } = useQuery<HotelSettings>({
    queryKey: ["/api/hotel-settings"],
    enabled: isAuthenticated,
  });

  const { data: activeTaxes } = useQuery({
    queryKey: ["/api/taxes/reservation"],
    enabled: isAuthenticated,
  });

  const { data: roomOrders } = useQuery({
    queryKey: ["/api/restaurant/orders/room"],
    enabled: isAuthenticated,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data: any) => {
      // Update reservation status to checked-out
      await apiRequest("PATCH", `/api/reservations/${data.reservationId}`, {
        status: "checked-out",
        paidAmount: data.totalAmount,
      });

      // Mark associated room orders as completed and paid
      if (data.roomOrderIds && data.roomOrderIds.length > 0) {
        for (const orderId of data.roomOrderIds) {
          await apiRequest("PATCH", `/api/restaurant/orders/${orderId}/status`, {
            status: "completed"
          });
        }
      }

      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Guest checked out successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setIsBillModalOpen(false);
      setSelectedReservation(null);
      setBillData({
        paymentMethod: "cash",
        notes: "",
        roomDates: [],
      });
      setShowDateChanges(false);
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
        description: "Failed to process checkout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteReservationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/reservations/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Reservation cancelled successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setIsDeleteDialogOpen(false);
      setReservationToDelete(null);
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
        description: "Failed to cancel reservation. Please try again.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { label: "Confirmed", className: "reservation-confirmed" },
      pending: { label: "Pending", className: "reservation-pending" },
      "checked-in": {
        label: "Checked In",
        className: "reservation-checked-in",
      },
      "checked-out": {
        label: "Checked Out",
        className: "reservation-checked-out",
      },
      cancelled: { label: "Cancelled", className: "reservation-cancelled" },
      "no-show": { label: "No Show", className: "reservation-no-show" },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case "cash":
        return "bg-green-500";
      case "esewa":
        return "bg-blue-500";
      case "khalti":
        return "bg-purple-500";
      case "bank-transfer":
        return "bg-orange-500";
      default:
        return "bg-gray-500";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (date: Date, timeZone?: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timeZone || "Asia/Kathmandu",
    };
    return date.toLocaleDateString("en-US", options);
  };

  const calculateNights = (checkIn: string, checkOut: string) => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleCreateBill = (reservation: any) => {
    setSelectedReservation(reservation);
    setIsBillModalOpen(true);
  };

  const getReservationRoomOrders = (reservationId: string) => {
    if (!roomOrders) return [];
    return roomOrders.filter((order: any) => 
      order.reservationId === reservationId && 
      order.status !== 'cancelled'
    );
  };

  const handleViewBill = (reservation: any) => {
    setViewingBill(reservation);
  };

  const resetForm = () => {
    setBillData({
      paymentMethod: "cash",
      notes: "",
      discount: 0,
      discountPercentage: 0,
      roomDates: [],
    });
    setShowDateChanges(false);
  };

  const handleCheckout = () => {
    if (!selectedReservation) return;

    const billPreview = calculateBillPreview();
    if (!billPreview) return;

    checkoutMutation.mutate({
      reservationId: selectedReservation.id,
      totalAmount: billPreview.totalAmount,
      roomOrderIds: billPreview.roomOrders.map((order: any) => order.id),
      ...billData,
    });
  };

  const handlePrintBill = (reservation: any) => {
    if (!reservation) return;

    const billWindow = window.open("", "_blank");
    const billContent = generateBillHTML(reservation);
    billWindow?.document.write(billContent);
    billWindow?.document.close();
    billWindow?.print();
  };

  const handleDeleteReservation = (reservation: any) => {
    setReservationToDelete(reservation);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteReservation = () => {
    if (reservationToDelete) {
      deleteReservationMutation.mutate(reservationToDelete.id);
    }
  };

  const generateBillHTML = (reservation: any) => {
    if (!reservation || !hotelSettings) return "";

    // Room charges
    const roomSubtotal = reservation.reservationRooms.reduce(
      (sum: number, room: any) => sum + parseFloat(room.totalAmount),
      0,
    );

    // Room service charges
    const reservationRoomOrders = getReservationRoomOrders(reservation.id);
    const roomServiceSubtotal = reservationRoomOrders.reduce(
      (sum: number, order: any) => sum + parseFloat(order.totalAmount || 0),
      0,
    );

    const subtotal = roomSubtotal + roomServiceSubtotal;

    const finalDiscountAmount =
      billData.discountPercentage > 0
        ? (subtotal * billData.discountPercentage) / 100
        : billData.discount;
    const afterDiscount = subtotal - finalDiscountAmount;

    // Calculate taxes dynamically
    let totalTaxAmount = 0;
    let appliedTaxes: any[] = [];
    if (activeTaxes && Array.isArray(activeTaxes) && activeTaxes.length > 0) {
      appliedTaxes = activeTaxes.map((tax: any) => {
        const taxAmount = afterDiscount * (parseFloat(tax.rate) / 100);
        totalTaxAmount += taxAmount;
        return {
          name: tax.taxName,
          rate: tax.rate,
          amount: taxAmount,
        };
      });
    }

    const finalTotal = afterDiscount + totalTaxAmount;
    const isPaid = reservation.status === "checked-out";

    // Get currency symbol
    const getCurrencySymbol = (currency: string) => {
      const symbols: { [key: string]: string } = {
        NPR: "Rs.",
        USD: "$",
        EUR: "€",
        GBP: "£",
        JPY: "¥",
        CAD: "C$",
        AUD: "A$",
        CHF: "CHF",
        CNY: "¥",
        INR: "₹",
      };
      return symbols[currency] || currency;
    };

    const currencySymbol = getCurrencySymbol(
      (hotelSettings as any)?.currency || "NPR",
    );
    const currentDateTime = formatDateTime(
      new Date(),
      (hotelSettings as any)?.timeZone,
    );

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hotel Bill - ${reservation.confirmationNumber}</title>
        <style>
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            line-height: 1.2;
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
            background: white;
          }
          .receipt-header { 
            text-align: center; 
            border-bottom: 1px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .hotel-name { 
            font-size: 16px; 
            font-weight: bold; 
            margin-bottom: 2px;
          }
          .bill-number { 
            font-size: 14px; 
            font-weight: bold; 
            margin-top: 5px;
          }
          .info-section { 
            margin-bottom: 10px;
            font-size: 11px;
          }
          .info-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 2px;
          }
          .items-section { 
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            padding: 8px 0;
            margin: 10px 0;
          }
          .items-header { 
            font-weight: bold; 
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
            margin-bottom: 5px;
          }
          .item-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 3px;
            font-size: 11px;
          }
          .item-name { flex: 1; }
          .item-nights { width: 25px; text-align: center; }
          .item-rate { width: 50px; text-align: right; }
          .item-total { width: 60px; text-align: right; }
          .totals-section { 
            margin-top: 8px;
            border-top: 1px dashed #000;
            padding-top: 5px;
          }
          .total-row { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 2px;
            font-size: 11px;
          }
          .final-total { 
            font-weight: bold; 
            font-size: 13px;
            border-top: 1px solid #000;
            padding-top: 3px;
            margin-top: 5px;
          }
          .payment-info { 
            margin-top: 10px;
            text-align: center;
            font-weight: bold;
            font-size: 12px;
          }
          .footer { 
            margin-top: 15px; 
            text-align: center; 
            font-size: 10px;
            border-top: 1px dashed #000;
            padding-top: 8px;
          }
          .divider { 
            text-align: center; 
            margin: 5px 0;
            font-size: 10px;
          }
          @media print { 
            body { margin: 0; padding: 2mm; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-header">
          <div class="hotel-name">${hotelSettings?.hotelName || "HOTEL"}</div>
          <div style="font-size: 10px;">${hotelSettings?.address || ""}</div>
          <div style="font-size: 10px;">Phone: ${hotelSettings?.phone || ""}</div>
          <div class="bill-number">Bill #${reservation.confirmationNumber}</div>
        </div>

        <div class="info-section">
          <div class="info-row">
            <span>Date:</span>
            <span>${currentDateTime}</span>
          </div>
          <div class="info-row">
            <span>Guest:</span>
            <span>${reservation.guest.firstName} ${reservation.guest.lastName}</span>
          </div>
          <div class="info-row">
            <span>Email:</span>
            <span>${reservation.guest.email || "N/A"}</span>
          </div>
          <div class="info-row">
            <span>Phone:</span>
            <span>${reservation.guest.phone || "N/A"}</span>
          </div>
          <div class="info-row">
            <span>Payment:</span>
            <span>${billData.paymentMethod.toUpperCase()}</span>
          </div>
        </div>

        <div class="items-section">
          <div class="items-header">
            <div class="item-row">
              <div class="item-name">ROOM</div>
              <div class="item-nights">NIGHTS</div>
              <div class="item-rate">RATE</div>
              <div class="item-total">AMOUNT</div>
            </div>
          </div>
          ${reservation.reservationRooms
            .map(
              (room: any) => `
            <div class="item-row">
              <div class="item-name">${room.room.number} (${room.room.roomType.name.substring(0, 8)})</div>
              <div class="item-nights">${calculateNights(room.checkInDate, room.checkOutDate)}</div>
              <div class="item-rate">${parseFloat(room.ratePerNight).toFixed(0)}</div>
              <div class="item-total">${parseFloat(room.totalAmount).toFixed(2)}</div>
            </div>
          `,
            )
            .join("")}
          ${reservationRoomOrders.length > 0 ? `
            <div class="item-row" style="border-top: 1px solid #ccc; margin-top: 5px; padding-top: 5px;">
              <div class="item-name" colspan="4" style="font-weight: bold; text-align: center;">ROOM SERVICE</div>
            </div>
            ${reservationRoomOrders
              .map(
                (order: any) => `
              <div class="item-row">
                <div class="item-name">${order.orderNumber}</div>
                <div class="item-nights">${order.items?.length || 0}</div>
                <div class="item-rate">Items</div>
                <div class="item-total">${parseFloat(order.totalAmount || 0).toFixed(2)}</div>
              </div>
            `,
              )
              .join("")}
          ` : ""}
        </div>

        <div class="totals-section">
          <div class="total-row">
            <span>Room Charges:</span>
            <span>${currencySymbol}${roomSubtotal.toFixed(2)}</span>
          </div>
          ${roomServiceSubtotal > 0 ? `
            <div class="total-row">
              <span>Room Service:</span>
              <span>${currencySymbol}${roomServiceSubtotal.toFixed(2)}</span>
            </div>
          ` : ""}
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${currencySymbol}${subtotal.toFixed(2)}</span>
          </div>
          ${
            finalDiscountAmount > 0
              ? `
            <div class="total-row">
              <span>Discount (${billData.discountPercentage || 0}%):</span>
              <span>-${currencySymbol}${finalDiscountAmount.toFixed(2)}</span>
            </div>
          `
              : ""
          }
          ${
            appliedTaxes.length > 0
              ? appliedTaxes
                  .map(
                    (tax) => `
              <div class="total-row">
                <span>${tax.name} (${tax.rate}%):</span>
                <span>${currencySymbol}${tax.amount.toFixed(2)}</span>
              </div>
            `,
                  )
                  .join("")
              : `
              <div class="total-row">
                <span>Tax:</span>
                <span>${currencySymbol}${totalTaxAmount.toFixed(2)}</span>
              </div>
            `
          }
          <div class="total-row final-total">
            <span>TOTAL AMOUNT:</span>
            <span>${currencySymbol}${finalTotal.toFixed(2)}</span>
          </div>
        </div>

        <div class="payment-info">
          PAYMENT: ${billData.paymentMethod.toUpperCase()} - ${isPaid ? "PAID" : "PENDING"}
        </div>

        ${
          billData.notes
            ? `
          <div style="margin-top: 10px; font-size: 10px; text-align: center;">
            <strong>Notes:</strong> ${billData.notes}
          </div>
        `
            : ""
        }

        <div class="divider">================================</div>
        <div class="footer">
          <div>THANK YOU FOR STAYING WITH US!</div>
          <div style="margin-top: 3px;">Visit Again Soon</div>
          <div style="margin-top: 5px; font-size: 9px;">
            Powered by HotelPro PMS
          </div>
        </div>
        <div class="divider">================================</div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              setTimeout(function() {
                window.close();
              }, 500);
            }, 100);
          }
        </script>
      </body>
      </html>
    `;
  };

  const filteredReservations =
    reservations && Array.isArray(reservations)
      ? reservations.filter((reservation: any) => {
          const searchLower = searchTerm.toLowerCase();
          return (
            reservation.guest.firstName.toLowerCase().includes(searchLower) ||
            reservation.guest.lastName.toLowerCase().includes(searchLower) ||
            reservation.guest.email?.toLowerCase().includes(searchLower) ||
            reservation.confirmationNumber.toLowerCase().includes(searchLower)
          );
        })
      : [];

  // Get ready for checkout reservations (checked-in status)
  const getReadyForCheckoutReservations = () => {
    return filteredReservations.filter(
      (reservation: any) => reservation.status === "checked-in",
    );
  };

  // Get all checked-out reservations (for viewing bills)
  const getAllReservations = () => {
    return filteredReservations.filter(
      (reservation: any) => reservation.status === "checked-out",
    );
  };

  // Get currency symbol for display
  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      NPR: "Rs.",
      USD: "$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
      CAD: "C$",
      AUD: "A$",
      CHF: "CHF",
      CNY: "¥",
      INR: "₹",
    };
    return symbols[currency] || currency;
  };

  const currencySymbol = hotelSettings?.currency
    ? getCurrencySymbol(hotelSettings.currency)
    : "Rs.";

  const calculateBillPreview = () => {
    if (!selectedReservation) return null;

    // Room charges - ensure we have valid numbers
    const roomSubtotal = selectedReservation.reservationRooms.reduce(
      (sum: number, room: any) => {
        const amount = parseFloat(room.totalAmount) || 0;
        return sum + amount;
      },
      0,
    );

    // Room service charges
    const reservationRoomOrders = getReservationRoomOrders(selectedReservation.id);
    const roomServiceSubtotal = reservationRoomOrders.reduce(
      (sum: number, order: any) => {
        const amount = parseFloat(order.totalAmount) || 0;
        return sum + amount;
      },
      0,
    );

    const subtotal = roomSubtotal + roomServiceSubtotal;

    // Discount calculation - ensure we don't have undefined values
    const discountPercentage = parseFloat(billData.discountPercentage || "0");
    const discountAmount = parseFloat(billData.discount || "0");

    const finalDiscountAmount = discountPercentage > 0
      ? (subtotal * discountPercentage) / 100
      : discountAmount;

    const afterDiscount = subtotal - (finalDiscountAmount || 0);

    // Calculate taxes dynamically - ensure valid numbers
    let totalTaxAmount = 0;
    let appliedTaxes: any[] = [];

    if (activeTaxes && Array.isArray(activeTaxes) && activeTaxes.length > 0) {
      appliedTaxes = activeTaxes.map((tax: any) => {
        const taxRate = parseFloat(tax.rate) || 0;
        const taxAmount = (afterDiscount * taxRate) / 100;
        totalTaxAmount += taxAmount;
        return {
          name: tax.taxName,
          rate: taxRate,
          amount: taxAmount,
        };
      });
    }

    const finalTotal = afterDiscount + totalTaxAmount;

    // Ensure all returned values are valid numbers
    return {
      roomSubtotal: isNaN(roomSubtotal) ? 0 : roomSubtotal,
      roomServiceSubtotal: isNaN(roomServiceSubtotal) ? 0 : roomServiceSubtotal,
      subtotal: isNaN(subtotal) ? 0 : subtotal,
      discountAmount: isNaN(finalDiscountAmount) ? 0 : finalDiscountAmount,
      taxAmount: isNaN(totalTaxAmount) ? 0 : totalTaxAmount,
      appliedTaxes,
      totalAmount: isNaN(finalTotal) ? 0 : finalTotal,
      roomOrders: reservationRoomOrders,
    };
  };

  const billPreview = calculateBillPreview();

  const handleSubmit = (e: any) => {
    e.preventDefault();
    handleCheckout();
  };

  const onClose = () => {
    setIsBillModalOpen(false);
    resetForm();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isMobileMenuOpen={isMobileSidebarOpen}
        setIsMobileMenuOpen={setIsMobileSidebarOpen}
      />
      <div className="main-content">
        <Header
          title="Hotel Billing"
          subtitle="Manage guest checkout and billing"
          onMobileMenuToggle={() =>
            setIsMobileSidebarOpen(!isMobileSidebarOpen)
          }
        />
        <main className="p-6">
          {/* Search Section */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search reservations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Reservations Ready for Checkout */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Reservations Ready for Checkout</CardTitle>
            </CardHeader>
            <CardContent>
              {getReadyForCheckoutReservations().length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest</TableHead>
                      <TableHead>Confirmation</TableHead>
                      <TableHead>Rooms</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getReadyForCheckoutReservations().map(
                      (reservation: any) => (
                        <TableRow key={reservation.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {reservation.guest.firstName}{" "}
                                {reservation.guest.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {reservation.guest.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {reservation.confirmationNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {reservation.reservationRooms.length} Room
                                {reservation.reservationRooms.length > 1
                                  ? "s"
                                  : ""}
                              </div>
                              <div className="text-sm text-gray-500">
                                {reservation.reservationRooms
                                  .map((rr: any) => rr.room.roomType.name)
                                  .join(", ")}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {reservation.reservationRooms.length > 0 && (
                              <div>
                                <div>
                                  {formatDate(
                                    reservation.reservationRooms[0]
                                      .checkOutDate,
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {calculateNights(
                                    reservation.reservationRooms[0].checkInDate,
                                    reservation.reservationRooms[0]
                                      .checkOutDate,
                                  )}{" "}
                                  nights
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {(() => {
                              const reservationAmount = parseFloat(reservation.totalAmount);
                              const roomServiceAmount = getReservationRoomOrders(reservation.id).reduce(
                                (sum: number, order: any) => sum + parseFloat(order.totalAmount || 0),
                                0
                              );
                              return `${currencySymbol}${(reservationAmount + roomServiceAmount).toFixed(2)}`;
                            })()}
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => handleCreateBill(reservation)}
                              disabled={checkoutMutation.isPending}
                              className="bg-green-600 hover:bg-green-700"
                              size="sm"
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              Checkout
                            </Button>
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No reservations ready for checkout. Check-in guests to see
                  them here.
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Reservations */}
          <Card>
            <CardHeader>
              <CardTitle>All Guest Reservations</CardTitle>
            </CardHeader>
            <CardContent>
              {reservationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Guest</TableHead>
                      <TableHead>Confirmation</TableHead>
                      <TableHead>Rooms</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getAllReservations()?.length ? (
                      getAllReservations().map((reservation: any) => (
                        <TableRow key={reservation.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {reservation.guest.firstName}{" "}
                                {reservation.guest.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {reservation.guest.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {reservation.confirmationNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {reservation.reservationRooms.length} Room
                                {reservation.reservationRooms.length > 1
                                  ? "s"
                                  : ""}
                              </div>
                              <div className="text-sm text-gray-500">
                                {reservation.reservationRooms
                                  .map((rr: any) => rr.room.roomType.name)
                                  .join(", ")}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {reservation.reservationRooms.length > 0 && (
                              <div>
                                <div>
                                  {formatDate(
                                    reservation.reservationRooms[0]
                                      .checkOutDate,
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {calculateNights(
                                    reservation.reservationRooms[0].checkInDate,
                                    reservation.reservationRooms[0]
                                      .checkOutDate,
                                  )}{" "}
                                  nights
                                </div>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(reservation.status)}
                          </TableCell>
                          <TableCell className="font-medium">
                            {(() => {
                              const reservationAmount = parseFloat(reservation.totalAmount);
                              const roomServiceAmount = getReservationRoomOrders(reservation.id).reduce(
                                (sum: number, order: any) => sum + parseFloat(order.totalAmount || 0),
                                0
                              );
                              return `${currencySymbol}${(reservationAmount + roomServiceAmount).toFixed(2)}`;
                            })()}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewBill(reservation)}
                                title="View Bill"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePrintBill(reservation)}
                                title="Print Bill"
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleDeleteReservation(reservation)
                                }
                                className="text-red-600 hover:text-red-800 border-red-200 hover:border-red-300"
                                title="Delete Reservation"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-gray-500"
                        >
                          No checked-out reservations found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Checkout Modal */}
      <Dialog open={isBillModalOpen} onOpenChange={setIsBillModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center">
              <CreditCard className="mr-2 h-5 w-5" />
              Checkout - {selectedReservation?.confirmationNumber}
            </DialogTitle>
          </DialogHeader>

          {selectedReservation && (
            <div className="space-y-6">
              {/* Guest Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Guest:</span> {selectedReservation.guest.firstName} {selectedReservation.guest.lastName}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {selectedReservation.guest.email || "N/A"}
                  </div>
                </div>
              </div>

              {/* Bill Preview */}
              {billPreview && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Bill Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Room Charges:</span>
                        <span className="font-medium">{currencySymbol}{billPreview.roomSubtotal.toFixed(2)}</span>
                      </div>
                      {billPreview.roomServiceSubtotal > 0 && (
                        <div className="flex justify-between">
                          <span>Room Service:</span>
                          <span className="font-medium">{currencySymbol}{billPreview.roomServiceSubtotal.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t pt-2">
                        <span>Subtotal:</span>
                        <span className="font-medium">{currencySymbol}{billPreview.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span className="font-medium">{currencySymbol}{billPreview.taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t-2 pt-3">
                        <span>Total Amount:</span>
                        <span className="text-green-600">{currencySymbol}{billPreview.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Payment Method */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="paymentMethod">Payment Method</Label>
                        <Select
                          value={billData.paymentMethod}
                          onValueChange={(value) =>
                            setBillData({ ...billData, paymentMethod: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">💵 Cash</SelectItem>
                            <SelectItem value="credit-card">💳 Credit Card</SelectItem>
                            <SelectItem value="debit-card">💳 Debit Card</SelectItem>
                            <SelectItem value="mobile-payment">📱 Mobile Payment</SelectItem>
                            <SelectItem value="bank-transfer">🏦 Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Input
                          id="notes"
                          value={billData.notes}
                          onChange={(e) =>
                            setBillData({ ...billData, notes: e.target.value })
                          }
                          placeholder="Additional notes..."
                        />
                      </div>
                    </div>

                    {/* Date Changes Toggle */}
                    <div className="flex items-center space-x-3 pt-4 border-t">
                      <Label htmlFor="dateToggle">Need to adjust dates?</Label>
                      <div 
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                          showDateChanges ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                        onClick={() => setShowDateChanges(!showDateChanges)}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            showDateChanges ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Date Changes Section */}
                    {showDateChanges && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <p className="text-sm text-blue-800">
                            ℹ️ Adjust check-in and check-out dates if needed. Changes will affect the final amount.
                          </p>
                        </div>

                        <div className="grid gap-4">
                          {selectedReservation.reservationRooms.map((roomReservation: any, index: number) => (
                            <div key={index} className="border rounded p-4 bg-gray-50">
                              <div className="flex justify-between items-center mb-3">
                                <div>
                                  <h4 className="font-medium">Room {roomReservation.room.number}</h4>
                                  <p className="text-sm text-gray-600">{roomReservation.room.roomType.name}</p>
                                </div>
                                <div className="text-right text-sm">
                                  <p className="text-gray-600">Rate</p>
                                  <p className="font-semibold">{currencySymbol}{parseFloat(roomReservation.ratePerNight).toFixed(2)}/night</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <Label htmlFor={`checkIn-${index}`} className="text-sm">Check-in Date</Label>
                                  <Input
                                    id={`checkIn-${index}`}
                                    type="date"
                                    value={billData.roomDates?.[index]?.checkInDate || roomReservation.checkInDate?.split('T')[0]}
                                    onChange={(e) => {
                                      const newRoomDates = [...(billData.roomDates || [])];
                                      newRoomDates[index] = {
                                        ...newRoomDates[index],
                                        roomId: roomReservation.id,
                                        checkInDate: e.target.value
                                      };
                                      setBillData({ ...billData, roomDates: newRoomDates });
                                    }}
                                  />
                                </div>

                                <div>
                                  <Label htmlFor={`checkOut-${index}`} className="text-sm">Check-out Date</Label>
                                  <Input
                                    id={`checkOut-${index}`}
                                    type="date"
                                    value={billData.roomDates?.[index]?.checkOutDate || roomReservation.checkOutDate?.split('T')[0]}
                                    min={billData.roomDates?.[index]?.checkInDate || roomReservation.checkInDate?.split('T')[0]}
                                    onChange={(e) => {
                                      const newRoomDates = [...(billData.roomDates || [])];
                                      newRoomDates[index] = {
                                        ...newRoomDates[index],
                                        roomId: roomReservation.id,
                                        checkOutDate: e.target.value
                                      };
                                      setBillData({ ...billData, roomDates: newRoomDates });
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                                Original: {new Date(roomReservation.checkInDate).toLocaleDateString()} - {new Date(roomReservation.checkOutDate).toLocaleDateString()}
                                ({Math.ceil((new Date(roomReservation.checkOutDate).getTime() - new Date(roomReservation.checkInDate).getTime()) / (1000 * 60 * 60 * 24))} nights)
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-6 border-t">
                      <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={checkoutMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {checkoutMutation.isPending ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Processing...</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <CreditCard className="h-4 w-4" />
                            <span>Complete Checkout</span>
                          </div>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Bill Modal */}
      {viewingBill && (
        <Dialog open={!!viewingBill} onOpenChange={() => setViewingBill(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Receipt className="mr-2 h-5 w-5" />
                Bill Details - {viewingBill.confirmationNumber}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Guest:</span>
                  <p className="font-medium">
                    {viewingBill.guest.firstName} {viewingBill.guest.lastName}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <p className="font-medium">
                    {viewingBill.guest.email || "N/A"}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status:</span>
                  {getStatusBadge(viewingBill.status)}
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <p className="font-medium">
                    {currencySymbol}
                    {parseFloat(viewingBill.totalAmount).toFixed(2)}
                  </p>
                </div>
              </div>

              {viewingBill.reservationRooms && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Room Details</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Room</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Nights</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewingBill.reservationRooms.map((room: any) => (
                        <TableRow key={room.id}>
                          <TableCell className="font-medium">
                            {room.room.number} ({room.room.roomType.name})
                          </TableCell>
                          <TableCell>
                            {formatDate(room.checkInDate)} -{" "}
                            {formatDate(room.checkOutDate)}
                          </TableCell>
                          <TableCell>
                            {calculateNights(
                              room.checkInDate,
                              room.checkOutDate,
                            )}
                          </TableCell>
                          <TableCell>
                            {currencySymbol}
                            {parseFloat(room.ratePerNight).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {currencySymbol}
                            {parseFloat(room.totalAmount).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Bill Summary */}
                <div>
                  <h3 className="font-semibold mb-2">Bill Summary</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Room Charges:</span>
                      <span>{currencySymbol}{(parseFloat(viewingBill.totalAmount) - parseFloat(viewingBill.taxAmount || "0")).toFixed(2)}</span>
                    </div>
                    {viewingBill.appliedTaxes ? (
                      JSON.parse(viewingBill.appliedTaxes).map((tax: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span>{tax.taxName} ({tax.rate}%):</span>
                          <span>{currencySymbol}{tax.amount}</span>
                        </div>
                      ))
                    ) : parseFloat(viewingBill.taxAmount || "0") > 0 ? (
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>{currencySymbol}{parseFloat(viewingBill.taxAmount || "0").toFixed(2)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total Amount:</span>
                      <span>{currencySymbol}{parseFloat(viewingBill.totalAmount).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

              <div className="flex justify-end space-x-2">
                <Button onClick={() => handlePrintBill(viewingBill)}>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Bill
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel reservation "
              {reservationToDelete?.confirmationNumber}"? This will mark the
              reservation as cancelled and free up the associated rooms.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteReservation}
              disabled={deleteReservationMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteReservationMutation.isPending
                ? "Cancelling..."
                : "Cancel Reservation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}