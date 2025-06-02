import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Rooms() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ["/api/rooms"],
    enabled: isAuthenticated,
  });

  const { data: roomTypes } = useQuery({
    queryKey: ["/api/room-types"],
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
      available: { label: "Available", className: "status-available" },
      occupied: { label: "Occupied", className: "status-occupied" },
      maintenance: { label: "Maintenance", className: "status-maintenance" },
      housekeeping: { label: "Housekeeping", className: "status-housekeeping" },
      "out-of-order": { label: "Out of Order", className: "status-out-of-order" },
      reserved: { label: "Reserved", className: "status-reserved" },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.available;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getRoomTypeName = (roomTypeId: number) => {
    const roomType = roomTypes?.find((rt: any) => rt.id === roomTypeId);
    return roomType?.name || "Unknown";
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
          title="Room Management"
          subtitle="Monitor room status and inventory"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>All Rooms</CardTitle>
            </CardHeader>
            <CardContent>
              {roomsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room Number</TableHead>
                      <TableHead>Floor</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms?.length ? (
                      rooms.map((room: any) => (
                        <TableRow key={room.id}>
                          <TableCell className="font-medium">
                            {room.number}
                          </TableCell>
                          <TableCell>
                            {room.floor ? `Floor ${room.floor}` : "N/A"}
                          </TableCell>
                          <TableCell>
                            {getRoomTypeName(room.roomTypeId)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(room.status)}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {/* Room action buttons would go here */}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                          No rooms found. Contact your administrator to set up rooms.
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
    </div>
  );
}
