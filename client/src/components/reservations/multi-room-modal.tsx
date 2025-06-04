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
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { z } from "zod";

interface MultiRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RoomData {
  roomId: string;
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

interface Room {
  id: number;
  number: string;
  roomTypeId: number;
  branchId: number;
  status: string;
  isActive: boolean;
  roomType: {
    id: number;
    name: string;
    description: string;
    basePrice: string;
    maxOccupancy: number;
    branchId: number;
  };
}

export default function MultiRoomModal({
  isOpen,
  onClose,
}: MultiRoomModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [guestData, setGuestData] = useState<GuestData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    idType: "passport",
    idNumber: "",
  });

  const [rooms, setRooms] = useState<RoomData[]>([
    {
      roomId: "",
      checkInDate: "",
      checkOutDate: "",
      adults: 1,
      children: 0,
      specialRequests: "",
      ratePerNight: 0,
      totalAmount: 0,
    },
  ]);

  // Set initial branch for non-super admin users
  useEffect(() => {
    if (user && user.role !== "super-admin" && user.branchId) {
      setSelectedBranchId(user.branchId.toString());
    }
  }, [user]);

  const { data: branches } = useQuery({
    queryKey: ["/api/branches"],
    enabled: isOpen && !!user && user.role === "super-admin",
  });

  // Get all rooms for the selected branch (not filtered by availability yet)
  const { data: allRoomsResponse } = useQuery({
    queryKey: ["/api/rooms", selectedBranchId],
    queryFn: async (): Promise<Room[]> => {
      if (!selectedBranchId) return [];
      return await apiRequest("GET", `/api/rooms?branchId=${selectedBranchId}`);
    },
    enabled: isOpen && !!user && !!selectedBranchId,
  });

  // Ensure allRooms is always an array
  const allRooms = Array.isArray(allRoomsResponse) ? allRoomsResponse : [];

  // Get available rooms for each room's date range
  const getAvailableRoomsForDates = (
    checkIn: string,
    checkOut: string,
  ): Room[] => {
    if (!allRooms || !Array.isArray(allRooms) || !checkIn || !checkOut)
      return [];

    // For now, return all active rooms with available status
    // In a real implementation, you'd call the getAvailableRooms API endpoint
    return allRooms.filter(
      (room) => room.isActive && room.status === "available",
    );
  };

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
    setRooms([
      {
        roomId: "",
        checkInDate: "",
        checkOutDate: "",
        adults: 1,
        children: 0,
        specialRequests: "",
        ratePerNight: 0,
        totalAmount: 0,
      },
    ]);
    if (user?.role === "super-admin") {
      setSelectedBranchId("");
    }
  };

  const addRoom = () => {
    setRooms([
      ...rooms,
      {
        roomId: "",
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
      field === "roomId" ||
      field === "checkInDate" ||
      field === "checkOutDate"
    ) {
      const room = Array.isArray(allRooms)
        ? allRooms.find(
            (r: Room) => r.id === parseInt(updatedRooms[index].roomId),
          )
        : undefined;

      if (
        room &&
        updatedRooms[index].checkInDate &&
        updatedRooms[index].checkOutDate
      ) {
        const checkIn = new Date(updatedRooms[index].checkInDate);
        const checkOut = new Date(updatedRooms[index].checkOutDate);
        const nights = Math.ceil(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (nights > 0) {
          const ratePerNight = parseFloat(room.roomType?.basePrice || "0");
          updatedRooms[index].ratePerNight = ratePerNight;
          updatedRooms[index].totalAmount = ratePerNight * nights;
        } else {
          updatedRooms[index].ratePerNight = 0;
          updatedRooms[index].totalAmount = 0;
        }
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
        const nights = Math.ceil(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
        );
        return sum + Math.max(0, nights);
      }
      return sum;
    }, 0);
    const subtotal = rooms.reduce((sum, room) => sum + room.totalAmount, 0);
    const taxes = subtotal * 0.15; // 15% tax
    const total = subtotal + taxes;

    return { totalRooms, totalNights, subtotal, taxes, total };
  };

  const validateDates = (checkIn: string, checkOut: string): boolean => {
    if (!checkIn || !checkOut) return false;
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return checkInDate >= today && checkOutDate > checkInDate;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const branchId =
      user?.role === "super-admin" ? selectedBranchId : user?.branchId;

    if (!branchId) {
      toast({
        title: "Error",
        description: "Branch information is required.",
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
      (room) => !room.roomId || !room.checkInDate || !room.checkOutDate,
    );
    if (invalidRoom) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required room information.",
        variant: "destructive",
      });
      return;
    }

    // Validate dates
    const invalidDates = rooms.find(
      (room) => !validateDates(room.checkInDate, room.checkOutDate),
    );
    if (invalidDates) {
      toast({
        title: "Validation Error",
        description:
          "Please ensure all check-in dates are today or later and check-out dates are after check-in dates.",
        variant: "destructive",
      });
      return;
    }

    const summary = calculateSummary();

    try {
      // First create guest, then create reservation
      const guestResponse = await apiRequest("POST", "/api/guests", {
        ...guestData,
        branchId: parseInt(branchId),
      });

      const guest = guestResponse;

      const reservationData = {
        reservation: {
          guestId: guest.id,
          branchId: parseInt(branchId),
          status: "confirmed",
          totalAmount: summary.total.toString(),
          paidAmount: "0",
          notes: "",
        },
        rooms: rooms.map((room) => ({
          roomId: parseInt(room.roomId),
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
          {/* Branch Selection for Super Admin */}
          {user?.role === "super-admin" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Branch Selection
              </h3>
              <div>
                <Label htmlFor="branch">Branch *</Label>
                <Select
                  value={selectedBranchId}
                  onValueChange={(value) => {
                    setSelectedBranchId(value);
                    // Reset rooms when branch changes
                    setRooms([
                      {
                        roomId: "",
                        checkInDate: "",
                        checkOutDate: "",
                        adults: 1,
                        children: 0,
                        specialRequests: "",
                        ratePerNight: 0,
                        totalAmount: 0,
                      },
                    ]);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.isArray(branches) &&
                      branches.map((branch: any) => (
                        <SelectItem
                          key={branch.id}
                          value={branch.id.toString()}
                        >
                          {branch.name} - {branch.location}
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
              <Button
                type="button"
                onClick={addRoom}
                size="sm"
                disabled={!selectedBranchId}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Room
              </Button>
            </div>

            {!selectedBranchId && user?.role === "super-admin" && (
              <div className="text-center py-8 text-gray-500">
                Please select a branch first to view available rooms.
              </div>
            )}

            {selectedBranchId &&
              rooms.map((room, index) => {
                const availableRooms = getAvailableRoomsForDates(
                  room.checkInDate,
                  room.checkOutDate,
                );
                const selectedRoom = Array.isArray(allRooms)
                  ? allRooms.find((r: Room) => r.id === parseInt(room.roomId))
                  : undefined;

                return (
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
                        <div className="md:col-span-1">
                          <Label>Check-In Date *</Label>
                          <Input
                            type="date"
                            value={room.checkInDate}
                            min={new Date().toISOString().split("T")[0]}
                            onChange={(e) =>
                              updateRoom(index, "checkInDate", e.target.value)
                            }
                            required
                          />
                        </div>
                        <div className="md:col-span-1">
                          <Label>Check-Out Date *</Label>
                          <Input
                            type="date"
                            value={room.checkOutDate}
                            min={
                              room.checkInDate ||
                              new Date().toISOString().split("T")[0]
                            }
                            onChange={(e) =>
                              updateRoom(index, "checkOutDate", e.target.value)
                            }
                            required
                          />
                        </div>
                        <div className="md:col-span-1">
                          <Label>Room *</Label>
                          <Select
                            value={room.roomId}
                            onValueChange={(value) =>
                              updateRoom(index, "roomId", value)
                            }
                            disabled={!room.checkInDate || !room.checkOutDate}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  !room.checkInDate || !room.checkOutDate
                                    ? "Select dates first"
                                    : availableRooms.length === 0
                                      ? "No rooms available"
                                      : "Select room"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {availableRooms.map((availableRoom: Room) => (
                                <SelectItem
                                  key={availableRoom.id}
                                  value={availableRoom.id.toString()}
                                >
                                  Room {availableRoom.number} -{" "}
                                  {availableRoom.roomType?.name}
                                  {availableRoom.roomType?.basePrice &&
                                    ` - $${parseFloat(availableRoom.roomType.basePrice).toFixed(2)}/night`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {room.checkInDate &&
                            room.checkOutDate &&
                            availableRooms.length === 0 && (
                              <div className="flex items-center mt-1 text-sm text-amber-600">
                                <AlertCircle className="h-4 w-4 mr-1" />
                                No rooms available for selected dates
                              </div>
                            )}
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

                      {selectedRoom && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <h4 className="font-medium text-sm text-gray-900">
                            Room Details
                          </h4>
                          <p className="text-sm text-gray-600">
                            {selectedRoom.roomType?.description}
                          </p>
                          <p className="text-sm text-gray-600">
                            Max Occupancy: {selectedRoom.roomType?.maxOccupancy}{" "}
                            guests
                          </p>
                        </div>
                      )}

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
                );
              })}
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
              disabled={
                createReservationMutation.isPending ||
                !selectedBranchId ||
                rooms.some(
                  (room) =>
                    !room.roomId || !room.checkInDate || !room.checkOutDate,
                )
              }
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
