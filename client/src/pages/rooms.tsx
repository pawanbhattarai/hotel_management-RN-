import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Edit2, Trash2, QrCode } from "lucide-react";
import { QRCodeModal } from "@/components/qr-code-modal";

export default function Rooms() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [formData, setFormData] = useState({
    number: "",
    floor: "",
    roomTypeId: "",
    branchId: "",
    status: "available",
  });

  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ["/api/rooms"],
    enabled: isAuthenticated,
  });

  const { data: roomTypes } = useQuery({
    queryKey: ["/api/room-types"],
    enabled: isAuthenticated,
  });

  const { data: branches } = useQuery({
    queryKey: ["/api/branches"],
    enabled: isAuthenticated && user?.role === "superadmin",
  });

  const createRoomMutation = useMutation({
    mutationFn: async (roomData: any) => {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...roomData,
          roomTypeId: parseInt(roomData.roomTypeId),
          branchId: parseInt(roomData.branchId),
        }),
      });
      if (!response.ok) throw new Error("Failed to create room");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Room created successfully" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create room",
        variant: "destructive",
      });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: async ({ id, ...roomData }: any) => {
      const response = await fetch(`/api/rooms/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roomData),
      });
      if (!response.ok) throw new Error("Failed to update room");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Success", description: "Room updated successfully" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update room",
        variant: "destructive",
      });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: number) => {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete room");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      toast({ title: "Success", description: "Room deleted successfully" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete room",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      number: "",
      floor: "",
      roomTypeId: "",
      branchId:
        user?.role === "superadmin" ? "" : user?.branchId?.toString() || "",
      status: "available",
    });
    setEditingRoom(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const roomData = {
      ...formData,
      floor: formData.floor ? parseInt(formData.floor) : null,
      roomTypeId: parseInt(formData.roomTypeId),
      branchId: parseInt(formData.branchId),
    };

    if (editingRoom) {
      updateRoomMutation.mutate({ id: editingRoom.id, ...roomData });
    } else {
      createRoomMutation.mutate(roomData);
    }
  };

  const handleEdit = (room: any) => {
    setEditingRoom(room);
    setFormData({
      number: room.number,
      floor: room.floor?.toString() || "",
      roomTypeId: room.roomTypeId.toString(),
      branchId: room.branchId.toString(),
      status: room.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (roomId: number) => {
    if (confirm("Are you sure you want to delete this room?")) {
      deleteRoomMutation.mutate(roomId);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: {
        label: "Available",
        className: "bg-green-100 text-green-800",
      },
      occupied: { label: "Occupied", className: "bg-red-100 text-red-800" },
      maintenance: {
        label: "Maintenance",
        className: "bg-orange-100 text-orange-800",
      },
      housekeeping: {
        label: "Housekeeping",
        className: "bg-blue-100 text-blue-800",
      },
      "out-of-order": {
        label: "Out of Order",
        className: "bg-gray-100 text-gray-800",
      },
      reserved: {
        label: "Reserved",
        className: "bg-yellow-100 text-yellow-800",
      },
    };

    const config =
      statusConfig[status as keyof typeof statusConfig] ||
      statusConfig.available;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getRoomTypeName = (roomTypeId: number) => {
    const roomType = roomTypes?.find((rt: any) => rt.id === roomTypeId);
    return roomType?.name || "Unknown";
  };

  const getBranchName = (branchId: number) => {
    const branch = branches?.find((b: any) => b.id === branchId);
    return branch?.name || "Unknown";
  };

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
          title="Room Management"
          subtitle="Monitor room status"
          onMobileMenuToggle={() =>
            setIsMobileSidebarOpen(!isMobileSidebarOpen)
          }
        />
        <main className="p-6">
          {/* Add Room Button - Outside the card */}
          {(user?.role === "superadmin" || user?.role === "branch-admin") && (
            <div className="mb-6">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Room
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingRoom ? "Edit Room" : "Add New Room"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="number">Room Number</Label>
                      <Input
                        id="number"
                        value={formData.number}
                        onChange={(e) =>
                          setFormData({ ...formData, number: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="floor">Floor</Label>
                      <Input
                        id="floor"
                        type="number"
                        value={formData.floor}
                        onChange={(e) =>
                          setFormData({ ...formData, floor: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="roomTypeId">Room Type</Label>
                      <Select
                        value={formData.roomTypeId}
                        onValueChange={(value) =>
                          setFormData({ ...formData, roomTypeId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select room type" />
                        </SelectTrigger>
                        <SelectContent>
                          {roomTypes?.map((roomType: any) => (
                            <SelectItem
                              key={roomType.id}
                              value={roomType.id.toString()}
                            >
                              {roomType.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {user?.role === "superadmin" && (
                      <div>
                        <Label htmlFor="branchId">Branch</Label>
                        <Select
                          value={formData.branchId}
                          onValueChange={(value) =>
                            setFormData({ ...formData, branchId: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select branch" />
                          </SelectTrigger>
                          <SelectContent>
                            {branches?.map((branch: any) => (
                              <SelectItem
                                key={branch.id}
                                value={branch.id.toString()}
                              >
                                {branch.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) =>
                          setFormData({ ...formData, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">Available</SelectItem>
                          <SelectItem value="occupied">Occupied</SelectItem>
                          <SelectItem value="maintenance">
                            Maintenance
                          </SelectItem>
                          <SelectItem value="housekeeping">
                            Housekeeping
                          </SelectItem>
                          <SelectItem value="out-of-order">
                            Out of Order
                          </SelectItem>
                          <SelectItem value="reserved">Reserved</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">
                      {editingRoom ? "Update Room" : "Create Room"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          )}

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
                      {user?.role === "superadmin" && (
                        <TableHead>Branch</TableHead>
                      )}
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
                          {user?.role === "superadmin" && (
                            <TableCell>
                              {getBranchName(room.branchId)}
                            </TableCell>
                          )}
                          <TableCell>{getStatusBadge(room.status)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <QRCodeModal type="room" id={room.id} name={`Room ${room.number}`}>
                                <Button variant="outline" size="sm">
                                  <QrCode className="h-4 w-4" />
                                </Button>
                              </QRCodeModal>
                              {(user?.role === "superadmin" ||
                                user?.role === "branch-admin") && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(room)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDelete(room.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={user?.role === "superadmin" ? 6 : 5}
                          className="text-center py-8 text-gray-500"
                        >
                          No rooms found. Contact your administrator to set up
                          rooms.
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
