import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";

interface MultiRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RoomData {
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  specialRequests: string;
  ratePerNight: number;
  totalAmount: number;
}

interface GuestData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  idType: string;
  idNumber: string;
}

export default function MultiRoomModal({
  isOpen,
  onClose,
}: MultiRoomModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [guestData, setGuestData] = useState<GuestData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    idType: "passport",
    idNumber: "",
  });

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [rooms, setRooms] = useState<RoomData[]>([
    {
      roomTypeId: "",
      checkInDate: "",
      checkOutDate: "",
      adults: 1,
      children: 0,
      specialRequests: "",
      ratePerNight: 0,
      totalAmount: 0,
    },
  ]);

  const { data: roomTypes } = useQuery({
    queryKey: ["/api/room-types"],
    enabled: isOpen && !!user,
  });

  const { data: branches } = useQuery({
    queryKey: ["/api/branches"],
    enabled: isOpen && !!user && user?.role === "superadmin",
  });

  const { data: availableRooms } = useQuery({
    queryKey: ["/api/rooms/availability", selectedBranchId || user?.branchId],
    queryFn: async () => {
      const branchId = user?.role === "superadmin" ? selectedBranchId : user?.branchId;
      if (!branchId) return [];
      
      const response = await apiRequest("GET", `/api/rooms?branchId=${branchId}&status=available`);
      return await response.json();
    },
    enabled: isOpen && !!user && !!(selectedBranchId || user?.branchId),
  });

  const createReservationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/reservations", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Reservation created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms/availability"] });
      onClose();
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
        description: "Failed to create reservation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setGuestData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      idType: "passport",
      idNumber: "",
    });
    setSelectedBranchId("");
    setRooms([
      {
        roomTypeId: "",
        checkInDate: "",
        checkOutDate: "",
        adults: 1,
        children: 0,
        specialRequests: "",
        ratePerNight: 0,
        totalAmount: 0,
      },
    ]);
  };

  const addRoom = () => {
    setRooms([
      ...rooms,
      {
        roomTypeId: "",
        checkInDate: "",
        checkOutDate: "",
        adults: 1,
        children: 0,
        specialRequests: "",
        ratePerNight: 0,
        totalAmount: 0,
      },
    ]);
  };

  const removeRoom = (index: number) => {
    if (rooms.length > 1) {
      setRooms(rooms.filter((_, i) => i !== index));
    }
  };

  const updateRoom = (index: number, field: keyof RoomData, value: any) => {
    const updatedRooms = [...rooms];
    updatedRooms[index] = { ...updatedRooms[index], [field]: value };

    // Calculate total amount when relevant fields change
    if (
      field === "roomTypeId" ||
      field === "checkInDate" ||
      field === "checkOutDate"
    ) {
      const selectedRoom = availableRooms?.find(
        (room: any) => room.id === parseInt(updatedRooms[index].roomTypeId),
      );
      if (
        selectedRoom &&
        updatedRooms[index].checkInDate &&
        updatedRooms[index].checkOutDate
      ) {
        const checkIn = new Date(updatedRooms[index].checkInDate);
        const checkOut = new Date(updatedRooms[index].checkOutDate);
        const nights = Math.ceil(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
        );
        const ratePerNight = parseFloat(selectedRoom.roomType.basePrice);
        updatedRooms[index].ratePerNight = ratePerNight;
        updatedRooms[index].totalAmount = ratePerNight * nights;
      }
    }

    setRooms(updatedRooms);
  };

  const calculateSummary = () => {
    const totalRooms = rooms.length;
    const totalNights = rooms.reduce((sum, room) => {
      if (room.checkInDate && room.checkOutDate) {
        const checkIn = new Date(room.checkInDate);
        const checkOut = new Date(room.checkOutDate);
        return (
          sum +
          Math.ceil(
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
          )
        );
      }
      return sum;
    }, 0);
    const subtotal = rooms.reduce((sum, room) => sum + room.totalAmount, 0);
    const taxes = subtotal * 0.15; // 15% tax
    const total = subtotal + taxes;

    return { totalRooms, totalNights, subtotal, taxes, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const branchId = user?.role === "superadmin" ? parseInt(selectedBranchId) : user?.branchId;
    
    if (!branchId) {
      toast({
        title: "Error",
        description: user?.role === "superadmin" ? "Please select a branch." : "Branch information is required.",
        variant: "destructive",
      });
      return;
    }

    // Validate form
    if (!guestData.firstName || !guestData.lastName || !guestData.email) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required guest information.",
        variant: "destructive",
      });
      return;
    }

    const invalidRoom = rooms.find(
      (room) => !room.roomTypeId || !room.checkInDate || !room.checkOutDate,
    );
    if (invalidRoom) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required room information.",
        variant: "destructive",
      });
      return;
    }

    const summary = calculateSummary();

    try {
      // First create guest, then create reservation
      const guestResponse = await apiRequest("POST", "/api/guests", {
        ...guestData,
        branchId: branchId,
      });

      const guest = await guestResponse.json();

      const reservationData = {
        reservation: {
          guestId: guest.id,
          branchId: branchId,
          status: "confirmed",
          totalAmount: summary.total.toString(),
          paidAmount: "0",
          notes: "",
        },
        rooms: rooms.map((room) => ({
          roomId: parseInt(room.roomTypeId),
          checkInDate: room.checkInDate,
          checkOutDate: room.checkOutDate,
          adults: room.adults,
          children: room.children,
          ratePerNight: room.ratePerNight.toString(),
          totalAmount: room.totalAmount.toString(),
          specialRequests: room.specialRequests,
        })),
      };

      createReservationMutation.mutate(reservationData);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create guest. Please try again.",
        variant: "destructive",
      });
    }
  };

  const summary = calculateSummary();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Multi-Room Reservation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Branch Selection for Superadmin */}
          {user?.role === "superadmin" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Branch Selection
              </h3>
              <div>
                <Label htmlFor="branchId">Select Branch *</Label>
                <Select
                  value={selectedBranchId}
                  onValueChange={(value) => setSelectedBranchId(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches?.map((branch: any) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          {/* Guest Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Guest Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={guestData.firstName}
                  onChange={(e) =>
                    setGuestData({ ...guestData, firstName: e.target.value })
                  }
                  placeholder="Enter first name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={guestData.lastName}
                  onChange={(e) =>
                    setGuestData({ ...guestData, lastName: e.target.value })
                  }
                  placeholder="Enter last name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={guestData.email}
                  onChange={(e) =>
                    setGuestData({ ...guestData, email: e.target.value })
                  }
                  placeholder="guest@email.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={guestData.phone}
                  onChange={(e) =>
                    setGuestData({ ...guestData, phone: e.target.value })
                  }
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <Label htmlFor="idType">ID Type</Label>
                <Select
                  value={guestData.idType}
                  onValueChange={(value) =>
                    setGuestData({ ...guestData, idType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="driving-license">
                      Driving License
                    </SelectItem>
                    <SelectItem value="national-id">National ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="idNumber">ID Number</Label>
                <Input
                  id="idNumber"
                  value={guestData.idNumber}
                  onChange={(e) =>
                    setGuestData({ ...guestData, idNumber: e.target.value })
                  }
                  placeholder="Enter ID number"
                />
              </div>
            </div>
          </div>

          {/* Room Selection */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Room Selection
              </h3>
              <Button type="button" onClick={addRoom} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Room
              </Button>
            </div>

            {rooms.map((room, index) => (
              <Card key={index} className="mb-4">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">
                      Room {index + 1}
                    </CardTitle>
                    {rooms.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRoom(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Available Room *</Label>
                      <Select
                        value={room.roomTypeId}
                        onValueChange={(value) =>
                          updateRoom(index, "roomTypeId", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select available room" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRooms?.map((availableRoom: any) => (
                            <SelectItem
                              key={availableRoom.id}
                              value={availableRoom.id.toString()}
                            >
                              Room {availableRoom.number} - {availableRoom.roomType.name} - Rs.
                              {parseFloat(availableRoom.roomType.basePrice).toFixed(2)}/night
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Check-In Date *</Label>
                      <Input
                        type="date"
                        value={room.checkInDate}
                        onChange={(e) =>
                          updateRoom(index, "checkInDate", e.target.value)
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label>Check-Out Date *</Label>
                      <Input
                        type="date"
                        value={room.checkOutDate}
                        onChange={(e) =>
                          updateRoom(index, "checkOutDate", e.target.value)
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Adults</Label>
                      <Select
                        value={room.adults.toString()}
                        onValueChange={(value) =>
                          updateRoom(index, "adults", parseInt(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Adult</SelectItem>
                          <SelectItem value="2">2 Adults</SelectItem>
                          <SelectItem value="3">3 Adults</SelectItem>
                          <SelectItem value="4">4 Adults</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Children</Label>
                      <Select
                        value={room.children.toString()}
                        onValueChange={(value) =>
                          updateRoom(index, "children", parseInt(value))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0 Children</SelectItem>
                          <SelectItem value="1">1 Child</SelectItem>
                          <SelectItem value="2">2 Children</SelectItem>
                          <SelectItem value="3">3 Children</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Special Requests</Label>
                    <Textarea
                      value={room.specialRequests}
                      onChange={(e) =>
                        updateRoom(index, "specialRequests", e.target.value)
                      }
                      placeholder="Any special requirements for this room..."
                      rows={3}
                    />
                  </div>

                  {room.totalAmount > 0 && (
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Rate: ${room.ratePerNight.toFixed(2)}/night
                      </p>
                      <p className="font-medium">
                        Room Total: ${room.totalAmount.toFixed(2)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Reservation Summary */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="text-base">Reservation Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Rooms:</span>
                <span className="font-medium">{summary.totalRooms}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Nights:</span>
                <span className="font-medium">{summary.totalNights}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">
                  ${summary.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Taxes & Fees (15%):</span>
                <span className="font-medium">${summary.taxes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-300 pt-2">
                <span className="font-semibold text-gray-900">
                  Total Amount:
                </span>
                <span className="font-bold text-lg text-primary">
                  ${summary.total.toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createReservationMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {createReservationMutation.isPending
                ? "Creating..."
                : "Confirm Reservation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
