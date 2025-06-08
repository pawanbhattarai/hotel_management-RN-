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
  const [billData, setBillData] = useState({
    additionalCharges: 0,
    discount: 0,
    tax: 0,
    paymentMethod: "cash",
    notes: "",
  });

  const { data: reservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ["/api/reservations"],
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
        tax: 0,
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
    if (!selectedReservation) return "";

    const subtotal = selectedReservation.reservationRooms.reduce((sum: number, room: any) => 
      sum + parseFloat(room.totalAmount), 0
    );
    const additionalCharges = billData.additionalCharges || 0;
    const discount = billData.discount || 0;
    const tax = billData.tax || 0;
    const finalTotal = subtotal + additionalCharges - discount + tax;
    const isPaid = selectedReservation.status === 'checked-out';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Hotel Bill - ${selectedReservation.confirmationNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .bill-details { margin-bottom: 20px; }
          .table { width: 100%; border-collapse: collapse; }
          .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .table th { background-color: #f2f2f2; }
          .total-section { margin-top: 20px; text-align: right; }
          .total-row { font-weight: bold; font-size: 1.1em; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Hotel Bill</h1>
          <p>Confirmation Number: ${selectedReservation.confirmationNumber}</p>
        </div>

        <div class="bill-details">
          <p><strong>Guest:</strong> ${selectedReservation.guest.firstName} ${selectedReservation.guest.lastName}</p>
          <p><strong>Email:</strong> ${selectedReservation.guest.email || "N/A"}</p>
          <p><strong>Phone:</strong> ${selectedReservation.guest.phone || "N/A"}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Dates</th>
              <th>Nights</th>
              <th>Rate/Night</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${selectedReservation.reservationRooms.map((room: any) => `
              <tr>
                <td>Room ${room.room.number} (${room.room.roomType.name})</td>
                <td>${formatDate(room.checkInDate)} - ${formatDate(room.checkOutDate)}</td>
                <td>${calculateNights(room.checkInDate, room.checkOutDate)}</td>
                <td>Rs.${parseFloat(room.ratePerNight).toFixed(2)}</td>
                <td>Rs.${parseFloat(room.totalAmount).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-section">
          <p>Subtotal: Rs.${subtotal.toFixed(2)}</p>
          ${additionalCharges > 0 ? `<p>Additional Charges: Rs.${additionalCharges.toFixed(2)}</p>` : ''}
          ${discount > 0 ? `<p>Discount: -Rs.${discount.toFixed(2)}</p>` : ''}
          ${tax > 0 ? `<p>Tax: Rs.${tax.toFixed(2)}</p>` : ''}
          <p class="total-row">Total: Rs.${finalTotal.toFixed(2)}</p>
          <p><strong>Payment Method:</strong> ${billData.paymentMethod.toUpperCase()}</p>
          <p style="color: ${isPaid ? 'green' : 'red'}; font-weight: bold; font-size: 1.2em;">
            Payment Status: ${isPaid ? 'PAID' : 'NOT PAID'}
          </p>
        </div>

        ${billData.notes ? `<div><p><strong>Notes:</strong> ${billData.notes}</p></div>` : ''}

        <div style="margin-top: 30px; text-align: center;">
          <p>Thank you for staying with us!</p>
        </div>
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
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Billing"
          subtitle="Manage guest checkout and billing"
        />
        <main className="flex-1 overflow-y-auto p-6">
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
                            Rs.{parseFloat(reservation.totalAmount).toFixed(2)}
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
                        <TableCell>Rs.{parseFloat(room.ratePerNight).toFixed(2)}</TableCell>
                        <TableCell>Rs.{parseFloat(room.totalAmount).toFixed(2)}</TableCell>
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
                    onChange={(e) => setBillData({...billData, additionalCharges: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="discount">Discount</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    value={billData.discount}
                    onChange={(e) => setBillData({...billData, discount: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="tax">Tax</Label>
                  <Input
                    id="tax"
                    type="number"
                    step="0.01"
                    value={billData.tax}
                    onChange={(e) => setBillData({...billData, tax: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <select
                    id="paymentMethod"
                    className="w-full p-2 border border-gray-300 rounded-md"
                    value={billData.paymentMethod}
                    onChange={(e) => setBillData({...billData, paymentMethod: e.target.value})}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank-transfer">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={billData.notes}
                  onChange={(e) => setBillData({...billData, notes: e.target.value})}
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
                    const finalTotal = roomSubtotal + billData.additionalCharges - billData.discount + billData.tax;
                    
                    return (
                      <>
                        <div>Subtotal: Rs.{roomSubtotal.toFixed(2)}</div>
                        {billData.additionalCharges > 0 && (
                          <div>Additional Charges: Rs.{billData.additionalCharges.toFixed(2)}</div>
                        )}
                        {billData.discount > 0 && (
                          <div>Discount: -Rs.{billData.discount.toFixed(2)}</div>
                        )}
                        {billData.tax > 0 && (
                          <div>Tax: Rs.{billData.tax.toFixed(2)}</div>
                        )}
                        <div className="text-lg font-bold">
                          Total: ₨{finalTotal.toFixed(2)}
                        </div>
                      </>
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