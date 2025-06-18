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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Search, Printer, CreditCard, Receipt } from "lucide-react";

export default function Billing() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<any>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [billData, setBillData] = useState({
    additionalCharges: 0,
    discount: 0,
    discountPercentage: 0,
    paymentMethod: "cash",
    notes: "",
  });

  const { data: reservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ["/api/reservations"],
    enabled: isAuthenticated,
  });

    const { data: hotelSettings } = useQuery({
    queryKey: ["/api/hotel-settings"],
    enabled: isAuthenticated,
  });

  const { data: activeTaxes } = useQuery({
    queryKey: ["/api/taxes/reservation"],
    enabled: isAuthenticated,
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data: any) => {
      // Update reservation status to checked-out
      await apiRequest("PATCH", `/api/reservations/${data.reservationId}`, {
        status: "checked-out",
        paidAmount: data.totalAmount,
      });
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Guest checked out successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      setIsBillModalOpen(false);
      setSelectedReservation(null);
      setBillData({
        additionalCharges: 0,
        discount: 0,
        discountPercentage: 0,
        paymentMethod: "cash",
        notes: "",
      });
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateTime = (date: Date, timeZone?: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timeZone || 'Asia/Kathmandu',
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

  const handlePrintBill = () => {
    if (!selectedReservation) return;

    const billWindow = window.open('', '_blank');
    const billContent = generateBillHTML();
    billWindow?.document.write(billContent);
    billWindow?.document.close();
    billWindow?.print();
  };

  const generateBillHTML = () => {
    if (!selectedReservation || !hotelSettings) return "";

    const subtotal = selectedReservation.reservationRooms.reduce((sum: number, room: any) =>
      sum + parseFloat(room.totalAmount), 0
    );
    const additionalCharges = billData.additionalCharges || 0;
    const finalDiscountAmount = billData.discountPercentage > 0 
      ? (subtotal * billData.discountPercentage / 100)
      : billData.discount;
    const afterDiscount = subtotal + additionalCharges - finalDiscountAmount;
    
    // Calculate taxes dynamically
    let totalTaxAmount = 0;
    let appliedTaxesString = "";
    if (activeTaxes && activeTaxes.length > 0) {
      const taxDetails = activeTaxes.map((tax: any) => {
        const taxAmount = afterDiscount * (parseFloat(tax.rate) / 100);
        totalTaxAmount += taxAmount;
        return {
          name: tax.taxName,
          rate: tax.rate,
          amount: taxAmount
        };
      });
      appliedTaxesString = JSON.stringify(taxDetails);
    }
    
    const finalTotal = afterDiscount + totalTaxAmount;
    const isPaid = selectedReservation.status === 'checked-out';

    // Get currency symbol
    const getCurrencySymbol = (currency: string) => {
      const symbols: { [key: string]: string } = {
        'NPR': 'Rs.',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CAD': 'C$',
        'AUD': 'A$',
        'CHF': 'CHF',
        'CNY': '¥',
        'INR': '₹'
      };
      return symbols[currency] || currency;
    };

    const currencySymbol = getCurrencySymbol(hotelSettings.currency || 'NPR');
    const currentDateTime = formatDateTime(new Date(), hotelSettings.timeZone);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hotel Bill - ${selectedReservation.confirmationNumber}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            margin: 0;
            line-height: 1.4;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .hotel-logo {
            max-width: 150px;
            max-height: 80px;
            margin-bottom: 10px;
          }
          .hotel-name {
            font-size: 24px;
            font-weight: bold;
            color: #333;
            margin: 10px 0;
          }
          .hotel-details {
            font-size: 12px;
            color: #666;
            margin: 5px 0;
          }
          .bill-title {
            font-size: 20px;
            font-weight: bold;
            margin: 20px 0 10px 0;
            color: #333;
          }
          .bill-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 5px;
          }
          .guest-details, .bill-details {
            flex: 1;
          }
          .guest-details {
            margin-right: 20px;
          }
          .detail-label {
            font-weight: bold;
            color: #333;
          }
          .table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
          }
          .table th, .table td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left; 
          }
          .table th { 
            background-color: #f2f2f2; 
            font-weight: bold;
          }
          .table td {
            font-size: 14px;
          }
          .amount-cell {
            text-align: right;
            font-family: monospace;
          }
          .total-section { 
            margin-top: 20px; 
            text-align: right;
            border-top: 2px solid #333;
            padding-top: 15px;
          }
          .total-row { 
            font-weight: bold; 
            font-size: 1.2em; 
            margin: 5px 0;
            padding: 5px 0;
          }
          .subtotal-row {
            margin: 3px 0;
            font-size: 14px;
          }
          .payment-status {
            text-align: center;
            margin: 20px 0;
            padding: 15px;
            border-radius: 5px;
            font-weight: bold;
            font-size: 16px;
          }
          .paid {
            background-color: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
          }
          .unpaid {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          .terms-section {
            margin-top: 20px;
            font-size: 11px;
            color: #555;
          }
          .notes-section {
            margin: 20px 0;
            padding: 10px;
            background-color: #f8f9fa;
            border-left: 4px solid #007bff;
          }
          @media print {
            body { padding: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${hotelSettings.logo ? `<img src="${hotelSettings.logo}" alt="Hotel Logo" class="hotel-logo">` : ''}
          <div class="hotel-name">${hotelSettings.hotelName || 'Hotel Name'}</div>
          ${hotelSettings.hotelChain ? `<div class="hotel-details"><strong>${hotelSettings.hotelChain}</strong></div>` : ''}
          <div class="hotel-details">
            ${hotelSettings.address}<br>
            ${hotelSettings.city}, ${hotelSettings.state} ${hotelSettings.postalCode}<br>
            ${hotelSettings.country}
          </div>
          <div class="hotel-details">
            Phone: ${hotelSettings.phone} | Email: ${hotelSettings.email}
            ${hotelSettings.website ? ` | Website: ${hotelSettings.website}` : ''}
          </div>
          ${hotelSettings.taxNumber ? `<div class="hotel-details">Tax Number: ${hotelSettings.taxNumber}</div>` : ''}
          ${hotelSettings.registrationNumber ? `<div class="hotel-details">Registration: ${hotelSettings.registrationNumber}</div>` : ''}

          <div class="bill-title">HOTEL BILL / INVOICE</div>
        </div>

        <div class="bill-info">
          <div class="guest-details">
            <div><span class="detail-label">Guest Name:</span> ${selectedReservation.guest.firstName} ${selectedReservation.guest.lastName}</div>
            <div><span class="detail-label">Email:</span> ${selectedReservation.guest.email || "N/A"}</div>
            <div><span class="detail-label">Phone:</span> ${selectedReservation.guest.phone || "N/A"}</div>
            ${selectedReservation.guest.address ? `<div><span class="detail-label">Address:</span> ${selectedReservation.guest.address}</div>` : ''}
          </div>
          <div class="bill-details">
            <div><span class="detail-label">Confirmation Number:</span> ${selectedReservation.confirmationNumber}</div>
            <div><span class="detail-label">Bill Date:</span> ${currentDateTime}</div>
            <div><span class="detail-label">Payment Method:</span> ${billData.paymentMethod.toUpperCase()}</div>
            <div><span class="detail-label">Currency:</span> ${hotelSettings.currency} (${currencySymbol})</div>
          </div>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Check-in</th>
              <th>Check-out</th>
              <th style="text-align: center;">Nights</th>
              <th style="text-align: right;">Rate/Night</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${selectedReservation.reservationRooms.map((room: any) => `
              <tr>
                <td>
                  <strong>Room ${room.room.number}</strong><br>
                  <small>${room.room.roomType.name}</small>
                </td>
                <td>${formatDate(room.checkInDate)}</td>
                <td>${formatDate(room.checkOutDate)}</td>
                <td style="text-align: center;">${calculateNights(room.checkInDate, room.checkOutDate)}</td>
                <td class="amount-cell">${currencySymbol}${parseFloat(room.ratePerNight).toFixed(2)}</td>
                <td class="amount-cell">${currencySymbol}${parseFloat(room.totalAmount).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <div class="subtotal-row">Room Subtotal: ${currencySymbol}${subtotal.toFixed(2)}</div>
          ${additionalCharges > 0 ? `<div class="subtotal-row">Additional Charges: ${currencySymbol}${additionalCharges.toFixed(2)}</div>` : ''}
          ${discount > 0 ? `<div class="subtotal-row">Discount: -${currencySymbol}${discount.toFixed(2)}</div>` : ''}
          ${tax > 0 ? `<div class="subtotal-row">Tax: ${currencySymbol}${tax.toFixed(2)}</div>` : ''}
          <div class="total-row">
            <strong>TOTAL AMOUNT: ${currencySymbol}${finalTotal.toFixed(2)}</strong>
          </div>
        </div>

        <div class="payment-status ${isPaid ? 'paid' : 'unpaid'}">
          PAYMENT STATUS: ${isPaid ? 'PAID IN FULL' : 'PAYMENT PENDING'}
        </div>

        ${billData.notes ? `
          <div class="notes-section">
            <strong>Notes:</strong><br>
            ${billData.notes}
          </div>
        ` : ''}

        ${hotelSettings.billingFooter ? `
          <div class="footer">
            ${hotelSettings.billingFooter}
          </div>
        ` : ''}

        ${hotelSettings.termsAndConditions ? `
          <div class="terms-section">
            <strong>Terms and Conditions:</strong><br>
            <small>${hotelSettings.termsAndConditions}</small>
          </div>
        ` : ''}

        ${hotelSettings.cancellationPolicy ? `
          <div class="terms-section">
            <strong>Cancellation Policy:</strong><br>
            <small>${hotelSettings.cancellationPolicy}</small>
          </div>
        ` : ''}
      </body>
      </html>
    `;
  };

  const handleCheckout = () => {
    if (!selectedReservation) return;

    const roomSubtotal = selectedReservation.reservationRooms.reduce((sum: number, room: any) =>
      sum + parseFloat(room.totalAmount), 0
    );
    const additionalCharges = billData.additionalCharges || 0;
    const discount = billData.discount || 0;
    const tax = billData.tax || 0;
    const finalTotal = roomSubtotal + additionalCharges - discount + tax;

    checkoutMutation.mutate({
      reservationId: selectedReservation.id,
      totalAmount: finalTotal,
      paymentMethod: billData.paymentMethod,
      notes: billData.notes,
    });
  };

  const filteredReservations = reservations?.filter((reservation: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      reservation.guest.firstName.toLowerCase().includes(searchLower) ||
      reservation.guest.lastName.toLowerCase().includes(searchLower) ||
      reservation.guest.email?.toLowerCase().includes(searchLower) ||
      reservation.confirmationNumber.toLowerCase().includes(searchLower)
    );
  });

  // Get currency symbol for display
  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      'NPR': 'Rs.',
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'C$',
      'AUD': 'A$',
      'CHF': 'CHF',
      'CNY': '¥',
      'INR': '₹'
    };
    return symbols[currency] || currency;
  };

  const currencySymbol = hotelSettings ? getCurrencySymbol(hotelSettings.currency || 'NPR') : 'Rs.';

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
          title="Billing"
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

          <Card>
            <CardHeader>
              <CardTitle>Guest Reservations</CardTitle>
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
                    {filteredReservations?.length ? (
                      filteredReservations.map((reservation: any) => (
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
                            {currencySymbol}{parseFloat(reservation.totalAmount).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCreateBill(reservation)}
                                title={reservation.status === 'checked-out' ? 'View paid bill' : 'Create bill'}
                              >
                                <Receipt className="h-4 w-4" />
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
                          No reservations found.
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

      {/* Billing Modal */}
      <Dialog open={isBillModalOpen} onOpenChange={setIsBillModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedReservation?.status === 'checked-out' ? 'View Bill' : 'Create Bill'} - {selectedReservation?.confirmationNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-6">
              {/* Guest Information */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Guest:</span> {selectedReservation.guest.firstName} {selectedReservation.guest.lastName}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {selectedReservation.guest.email || "N/A"}
                </div>
              </div>

              {/* Room Details */}
              <div>
                <h3 className="font-semibold mb-2">Room Details</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Nights</TableHead>
                      <TableHead>Rate/Night</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedReservation.reservationRooms.map((room: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{room.room.number} ({room.room.roomType.name})</TableCell>
                        <TableCell>{formatDate(room.checkInDate)} - {formatDate(room.checkOutDate)}</TableCell>
                        <TableCell>{calculateNights(room.checkInDate, room.checkOutDate)}</TableCell>
                        <TableCell>{currencySymbol}{parseFloat(room.ratePerNight).toFixed(2)}</TableCell>
                        <TableCell>{currencySymbol}{parseFloat(room.totalAmount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Billing Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="additionalCharges">Additional Charges</Label>
                  <Input
                    id="additionalCharges"
                    type="number"
                    step="0.01"
                    value={billData.additionalCharges}
                    onChange={(e) => setBillData({ ...billData, additionalCharges: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="discount">Discount (Amount)</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    value={billData.discount}
                    onChange={(e) => setBillData({ ...billData, discount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="discountPercentage">Discount (%)</Label>
                  <Input
                    id="discountPercentage"
                    type="number"
                    step="0.01"
                    value={billData.discountPercentage}
                    onChange={(e) => setBillData({ ...billData, discountPercentage: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <select
                    id="paymentMethod"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={billData.paymentMethod}
                    onChange={(e) => setBillData({ ...billData, paymentMethod: e.target.value })}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="digital">Digital</option>
                    <option value="bank-transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={billData.notes}
                  onChange={(e) => setBillData({ ...billData, notes: e.target.value })}
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Total Calculation */}
              <div className="border-t pt-4">
                <div className="text-right space-y-2">
                  {(() => {
                    const roomSubtotal = selectedReservation.reservationRooms.reduce((sum: number, room: any) =>
                      sum + parseFloat(room.totalAmount), 0
                    );
                    const additionalCharges = billData.additionalCharges || 0;
                    const finalDiscountAmount = billData.discountPercentage > 0 
                      ? (roomSubtotal * billData.discountPercentage / 100)
                      : billData.discount;
                    const afterDiscount = roomSubtotal + additionalCharges - finalDiscountAmount;
                    
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
                          amount: taxAmount
                        };
                      });
                    }
                    
                    const finalTotal = afterDiscount + totalTaxAmount;

                    return (
                      <div>
                        <div className="flex justify-between">
                          <span>Room Charges:</span>
                          <span>Rs. {roomSubtotal.toFixed(2)}</span>
                        </div>
                        {additionalCharges > 0 && (
                          <div className="flex justify-between">
                            <span>Additional Charges:</span>
                            <span>Rs. {additionalCharges.toFixed(2)}</span>
                          </div>
                        )}
                        {finalDiscountAmount > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Discount {billData.discountPercentage > 0 ? `(${billData.discountPercentage}%)` : ''}:</span>
                            <span>-Rs. {finalDiscountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium">
                          <span>Subtotal:</span>
                          <span>Rs. {afterDiscount.toFixed(2)}</span>
                        </div>
                        {appliedTaxes.length > 0 && (
                          <>
                            {appliedTaxes.map((tax: any, index: number) => (
                              <div key={index} className="flex justify-between">
                                <span>{tax.name} ({tax.rate}%):</span>
                                <span>Rs. {tax.amount.toFixed(2)}</span>
                              </div>
                            ))}
                            <div className="flex justify-between font-medium">
                              <span>Total Taxes & Fees:</span>
                              <span>Rs. {totalTaxAmount.toFixed(2)}</span>
                            </div>
                          </>
                        )}
                        {billData.additionalCharges > 0 && (
                          <div className="flex justify-between">
                            <span>Additional Charges:</span>
                            <span>{currencySymbol} {billData.additionalCharges.toFixed(2)}</span>
                          </div>
                        )}
                        {billData.discount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount:</span>
                            <span>-{currencySymbol} {billData.discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                          <span>Total Amount:</span>
                          <span>{currencySymbol} {finalTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setIsBillModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={handlePrintBill}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Bill
                </Button>
                {selectedReservation?.status !== 'checked-out' && (
                  <Button onClick={handleCheckout} disabled={checkoutMutation.isPending}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    {checkoutMutation.isPending ? "Processing..." : "Checkout & Pay"}
                  </Button>
                )}
                {selectedReservation?.status === 'checked-out' && (
                  <div className="text-green-600 font-medium">
                    ✓ Payment Completed
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}