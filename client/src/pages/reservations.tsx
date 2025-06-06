import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Eye, Edit } from "lucide-react";
import MultiRoomModal from "@/components/reservations/multi-room-modal";

export default function Reservations() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: reservations, isLoading: reservationsLoading } = useQuery({
    queryKey: ["/api/reservations"],
    enabled: isAuthenticated,
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
          title="Reservations"
          subtitle="Manage bookings and availability"
        />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Add Button Section */}
          <div className="mb-6">
            <Button
              onClick={() => setIsModalOpen(true)}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Reservation
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>All Reservations</CardTitle>
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
                      <TableHead>Check-in</TableHead>
                      <TableHead>Check-out</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reservations?.length ? (
                      reservations.map((reservation: any) => (
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
                                    reservation.reservationRooms[0].checkInDate,
                                  )}
                                </div>
                                {reservation.reservationRooms.length > 1 && (
                                  <div className="text-sm text-gray-500">
                                    +{reservation.reservationRooms.length - 1}{" "}
                                    more
                                  </div>
                                )}
                              </div>
                            )}
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
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-gray-500"
                        >
                          No reservations found. Create your first reservation
                          to get started.
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

      <MultiRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
