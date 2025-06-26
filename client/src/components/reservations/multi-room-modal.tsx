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
  editData?: any;
  isEdit?: boolean;
}

export default function MultiRoomModal({
  isOpen,
  onClose,
  editData,
  isEdit = false,
}: MultiRoomModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [guestData, setGuestData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    idType: "passport",
    idNumber: "",
  });

  const [existingGuest, setExistingGuest] = useState(null);
  const [isSearchingGuest, setIsSearchingGuest] = useState(false);

  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [rooms, setRooms] = useState([
    {
      id: null, // For existing rooms
      roomId: "", // For room selection
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
  });

  const { data: activeTaxes } = useQuery({
    queryKey: ["/api/taxes/reservation"],
  });

  // Fetch all rooms (not just available) when editing to show current room selections
  const {
    data: availableRooms,
    error: roomsError,
    isLoading: roomsLoading,
  } = useQuery({
    queryKey: ["/api/rooms", selectedBranchId || user?.branchId, isEdit ? "all" : "available"],
    queryFn: async () => {
      const branchId =
        user?.role === "superadmin" ? selectedBranchId : user?.branchId;
      if (!branchId) {
        console.log("No branchId available for fetching rooms");
        return [];
      }

      console.log("Fetching rooms for branch:", branchId);
      console.log("Is edit mode:", isEdit);
      console.log("Edit data:", editData);

      try {
        // When editing, fetch all rooms to include currently booked rooms
        // When creating new, fetch only available rooms
        const statusParam = isEdit ? "" : "&status=available";
        const response = await apiRequest(
          "GET",
          `/api/rooms?branchId=${branchId}${statusParam}`,
        );
        if (!response.ok) {
          console.error("Room fetch failed with status:", response.status);
          throw new Error(`Failed to fetch rooms: ${response.status}`);
        }
        const rooms = await response.json();
        console.log("Rooms fetched:", rooms);
        console.log("Number of rooms:", rooms?.length || 0);

        // Log room IDs to debug selection
        if (isEdit && editData?.reservationRooms) {
          console.log("Current reservation rooms:", editData.reservationRooms.map((r: any) => ({
            roomId: r.roomId,
            roomNumber: r.room?.number,
            roomTypeId: r.room?.roomTypeId
          })));
          console.log("Available room IDs:", rooms.map((r: any) => r.id));
        }

        return rooms;
      } catch (error) {
        console.error("Error fetching rooms:", error);
        throw error;
      }
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
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
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

  const updateReservationMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", `/api/reservations/${editData.id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Reservation updated successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
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
        description: "Failed to update reservation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Populate form when editing existing reservation
  useEffect(() => {
    if (isEdit && editData && isOpen) {
      // Populate guest data
      if (editData.guest) {
        setGuestData({
          firstName: editData.guest.firstName || "",
          lastName: editData.guest.lastName || "",
          email: editData.guest.email || "",
          phone: editData.guest.phone || "",
          idType: editData.guest.idType || "passport",
          idNumber: editData.guest.idNumber || "",
        });
        setExistingGuest(editData.guest);
      }

      // Set branch ID for superadmin users
      if (user?.role === "superadmin") {
        setSelectedBranchId(editData.branchId?.toString() || "");
      }

      // Populate room data only after rooms are loaded
      if (editData.reservationRooms && editData.reservationRooms.length > 0 && availableRooms) {
        const roomsData = editData.reservationRooms.map((room: any) => ({
          id: room.id,
          roomId: room.roomId?.toString() || "",
          roomTypeId: room.room?.roomTypeId?.toString() || "",
          checkInDate: room.checkInDate?.split('T')[0] || "",
          checkOutDate: room.checkOutDate?.split('T')[0] || "",
          adults: room.adults || 1,
          children: room.children || 0,
          specialRequests: room.specialRequests || "",
          ratePerNight: parseFloat(room.ratePerNight || "0"),
          totalAmount: parseFloat(room.totalAmount || "0"),
          // Store room details for display
          roomNumber: room.room?.number || "",
          roomTypeName: room.room?.roomType?.name || "",
        }));
        setRooms(roomsData);
      }
    } else if (!isEdit && isOpen) {
      // Reset form for new reservation
      resetForm();
    }
  }, [isEdit, editData, isOpen, availableRooms]);

  const searchGuestByPhone = async (phone: string) => {
    if (!phone || phone.length < 5) {
      setExistingGuest(null);
      return;
    }

    setIsSearchingGuest(true);
    try {
      const response = await apiRequest(
        "GET",
        `/api/guests?phone=${encodeURIComponent(phone)}`,
      );
      if (response.ok) {
        const result = await response.json();
        // Handle both array response and single guest response
        const guests = Array.isArray(result) ? result : result ? [result] : [];

        if (guests && guests.length > 0) {
          const guest = guests[0];
          setExistingGuest(guest);
          // Auto-fill guest data from existing guest
          setGuestData({
            firstName: guest.firstName || "",
            lastName: guest.lastName || "",
            email: guest.email || "",
            phone: guest.phone || "",
            idType: guest.idType || "passport",
            idNumber: guest.idNumber || "",
          });
          toast({
            title: "Guest Found",
            description: `Found existing guest: ${guest.firstName} ${guest.lastName} (${guest.reservationCount || 0} previous reservations)`,
          });
        } else {
          setExistingGuest(null);
        }
      }
    } catch (error) {
      console.error("Error searching guest:", error);
      setExistingGuest(null);
    } finally {
      setIsSearchingGuest(false);
    }
  };

  const resetForm = () => {
    setGuestData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      idType: "passport",
      idNumber: "",
    });
    setExistingGuest(null);
    setSelectedBranchId("");
    setRooms([
      {
        id: null,
        roomId: "",
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
        id: null,
        roomId: "",
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

  const updateRoom = (index: number, field: string, value: any) => {
    const updatedRooms = [...rooms];
    updatedRooms[index] = { ...updatedRooms[index], [field]: value };

    // Calculate total amount when relevant fields change
    if (
      field === "roomId" ||
      field === "checkInDate" ||
      field === "checkOutDate"
    ) {
      const selectedRoom = availableRooms?.find(
        (room: any) => room.id === parseInt(updatedRooms[index].roomId),
      );
      if (
        selectedRoom &&
        updatedRooms[index].checkInDate &&
        updatedRooms[index].checkOutDate
      ) {
        const checkIn = new Date(updatedRooms[index].checkInDate);
        const checkOut = new Date(updatedRooms[index].checkOutDate);
        let nights = Math.ceil(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
        );
        // If same date selected, count as 1 day minimum
        if (nights <= 0) {
          nights = 1;
        }
        const ratePerNight = parseFloat(selectedRoom.roomType.basePrice);
        updatedRooms[index].ratePerNight = ratePerNight;
        updatedRooms[index].totalAmount = ratePerNight * nights;
        updatedRooms[index].roomTypeId = selectedRoom.roomTypeId.toString();
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
        let nights = Math.ceil(
          (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
        );
        // If same date selected, count as 1 day minimum
        if (nights <= 0) {
          nights = 1;
        }
        return sum + nights;
      }
      return sum;
    }, 0);
    const subtotal = rooms.reduce((sum, room) => sum + room.totalAmount, 0);
    // Calculate taxes dynamically from active taxes
    const taxes = activeTaxes
      ? activeTaxes.reduce((sum: number, tax: any) => {
          return sum + (subtotal * parseFloat(tax.rate)) / 100;
        }, 0)
      : 0;
    const total = subtotal + taxes;

    return { totalRooms, totalNights, subtotal, taxes, total };
  };

  // Helper function to get available rooms for selection
  const getAvailableRoomsForSelection = (currentRoomId?: string) => {
    if (!availableRooms) return [];

    if (isEdit) {
      // When editing, show all rooms but mark unavailable ones
      return availableRooms.map((room: any) => ({
        ...room,
        isCurrentlySelected: room.id.toString() === currentRoomId,
        isAvailable: room.status === 'available' || room.id.toString() === currentRoomId
      }));
    } else {
      // When creating new, only show available rooms
      return availableRooms.filter((room: any) => room.status === 'available');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const branchId =
      user?.role === "superadmin" ? parseInt(selectedBranchId) : user?.branchId;

    if (!branchId) {
      toast({
        title: "Error",
        description:
          user?.role === "superadmin"
            ? "Please select a branch."
            : "Branch information is required.",
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

    // Validate that checkout is not before checkin
    const invalidDates = rooms.find(
      (room) => room.checkOutDate < room.checkInDate,
    );
    if (invalidDates) {
      toast({
        title: "Validation Error",
        description: "Check-out date cannot be before check-in date.",
        variant: "destructive",
      });
      return;
    }

    const summary = calculateSummary();

    const reservationData = {
      guest: {
        ...guestData,
        branchId: branchId,
      },
      reservation: {
        branchId: branchId,
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
        // Include room reservation ID for existing rooms when editing
        ...(room.id && { id: room.id }),
      })),
    };

    // Use appropriate mutation based on mode
    if (isEdit) {
      updateReservationMutation.mutate(reservationData);
    } else {
      createReservationMutation.mutate(reservationData);
    }
  };

  const summary = calculateSummary();

  // Handle branch selection for superadmin
  const handleBranchChange = (branchId: string) => {
    setSelectedBranchId(branchId);

    // Only reset room data if not editing existing reservation
    if (!isEdit) {
      setRooms([{
        id: null,
        roomId: "",
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
    }
  };

  // Fetch available rooms when branch or dates change
  useEffect(() => {
    if (selectedBranchId) {
        queryClient.invalidateQueries({ queryKey: ["/api/rooms"] });
    }
  }, [selectedBranchId, queryClient]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit" : "Create"} Room Reservation</DialogTitle>
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
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="relative">
                  <Input
                    id="phone"
                    value={guestData.phone}
                    onChange={(e) => {
                      const phone = e.target.value;
                      setGuestData({ ...guestData, phone });
                      // Search for existing guest after user stops typing
                      clearTimeout((window as any).guestSearchTimeout);
                      (window as any).guestSearchTimeout = setTimeout(() => {
                        searchGuestByPhone(phone);
                      }, 500);
                    }}
                    placeholder="+9779745673009"
                    required
                  />
                  {isSearchingGuest && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    </div>
                  )}
                </div>
                {existingGuest && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                    Found existing guest: {existingGuest.firstName}{" "}
                    {existingGuest.lastName}(
                    {existingGuest.reservationCount || 0} previous reservations)
                  </div>
                )}
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

            {rooms.map((room, index) => {
              const availableRoomsForSelection = getAvailableRoomsForSelection(room.roomId);

              return (
                <Card key={index} className="mb-4">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        Room {index + 1}
                        {isEdit && room.roomNumber && (
                          <span className="text-sm font-normal text-gray-600 ml-2">
                            (Currently: Room {room.roomNumber} - {room.roomTypeName})
                          </span>
                        )}
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
                        {roomsError && (
                          <div className="text-red-500 text-sm mb-2">
                            Error loading rooms: {roomsError.message}
                          </div>
                        )}
                        <Select
                          value={room.roomId}
                          onValueChange={(value) =>
                            updateRoom(index, "roomId", value)
                          }
                          disabled={roomsLoading}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={
                                roomsLoading
                                  ? "Loading rooms..."
                                  : roomsError
                                    ? "Error loading rooms"
                                    : room.roomId && availableRooms
                                      ? (() => {
                                          const selectedRoom = availableRooms.find((r: any) => r.id.toString() === room.roomId);
                                          return selectedRoom 
                                            ? `Room ${selectedRoom.number} - ${selectedRoom.roomType.name}`
                                            : "Select room";
                                        })()
                                      : "Select room"
                              }
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {roomsLoading ? (
                              <SelectItem value="loading" disabled>
                                Loading rooms...
                              </SelectItem>
                            ) : roomsError ? (
                              <SelectItem value="error" disabled>
                                Error loading rooms
                              </SelectItem>
                            ) : availableRoomsForSelection && availableRoomsForSelection.length > 0 ? (
                              availableRoomsForSelection.map((availableRoom: any) => (
                                <SelectItem
                                  key={availableRoom.id}
                                  value={availableRoom.id.toString()}
                                  disabled={isEdit && !availableRoom.isAvailable && !availableRoom.isCurrentlySelected}
                                >
                                  Room {availableRoom.number} - {availableRoom.roomType.name} - Rs.
                                  {parseFloat(availableRoom.roomType.basePrice).toFixed(2)}/night
                                  {isEdit && availableRoom.isCurrentlySelected && (
                                    <span className="text-blue-600"> (Current)</span>
                                  )}
                                  {isEdit && !availableRoom.isAvailable && !availableRoom.isCurrentlySelected && (
                                    <span className="text-red-600"> (Occupied)</span>
                                  )}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-rooms" disabled>
                                No rooms found
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {availableRooms && (
                          <div className="text-xs text-gray-500 mt-1">
                            {isEdit 
                              ? `${availableRoomsForSelection.filter((r: any) => r.isAvailable).length} room(s) available`
                              : `${availableRooms.length} room(s) available`
                            }
                          </div>
                        )}
                      </div>
                      <div>
                        <Label>Check-In Date *</Label>
                        <Input
                          type="date"
                          value={room.checkInDate}
                          min={new Date().toISOString().split('T')[0]}
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
                          min={room.checkInDate || undefined}
                          onChange={(e) =>
                            updateRoom(index, "checkOutDate", e.target.value)
                          }
                          required
                        />
                        {room.checkInDate && room.checkOutDate && room.checkInDate === room.checkOutDate && (
                          <div className="text-sm text-blue-600 mt-1">
                            Same-day booking (counted as 1 night)
                          </div>
                        )}
                        {room.checkInDate && room.checkOutDate && room.checkOutDate < room.checkInDate && (
                          <div className="text-sm text-red-600 mt-1">
                            Check-out date cannot be before check-in date
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
                        Rate: Rs.{room.ratePerNight.toFixed(2)}/night
                      </p>
                      <p className="font-medium">
                        Room Total: Rs.{room.totalAmount.toFixed(2)}
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
                  Rs.{summary.subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Taxes & Fees (15%):</span>
                <span className="font-medium">
                  Rs.{summary.taxes.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-300 pt-2">
                <span className="font-semibold text-gray-900">
                  Total Amount:
                </span>
                <span className="font-bold text-lg text-primary">
                  Rs.{summary.total.toFixed(2)}
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