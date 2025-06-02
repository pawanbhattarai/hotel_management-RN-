import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, LogIn, LogOut, DoorOpen } from "lucide-react";
import MultiRoomModal from "@/components/reservations/multi-room-modal";

export default function QuickActions() {
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);

  const handleNewReservation = () => {
    setIsReservationModalOpen(true);
  };

  const handleCheckInGuest = () => {
    // In a real implementation, this would open check-in modal or navigate to check-in page
    console.log("Opening check-in process");
  };

  const handleCheckOutGuest = () => {
    // In a real implementation, this would open check-out modal or navigate to check-out page
    console.log("Opening check-out process");
  };

  const handleViewRoomStatus = () => {
    // In a real implementation, this would navigate to room management page
    window.location.href = "/rooms";
  };

  const quickActionItems = [
    {
      title: "New Reservation",
      description: "Create multi-room booking",
      icon: Plus,
      iconBg: "bg-primary-50",
      iconColor: "text-primary",
      action: handleNewReservation,
    },
    {
      title: "Check-In Guest",
      description: "Process arrival",
      icon: LogIn,
      iconBg: "bg-success-50",
      iconColor: "text-success",
      action: handleCheckInGuest,
    },
    {
      title: "Check-Out Guest",
      description: "Process departure",
      icon: LogOut,
      iconBg: "bg-warning-50",
      iconColor: "text-warning",
      action: handleCheckOutGuest,
    },
    {
      title: "Room Status",
      description: "View availability",
      icon: DoorOpen,
      iconBg: "bg-gray-100",
      iconColor: "text-gray-600",
      action: handleViewRoomStatus,
    },
  ];

  return (
    <>
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardHeader className="p-6">
          <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
        </CardHeader>
        
        <CardContent className="p-6 pt-0">
          <div className="space-y-3">
            {quickActionItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                onClick={item.action}
                className="w-full flex items-center p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors h-auto justify-start"
              >
                <div className={`w-10 h-10 ${item.iconBg} rounded-lg flex items-center justify-center mr-3 flex-shrink-0`}>
                  <item.icon className={`${item.iconColor} h-5 w-5`} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <MultiRoomModal
        isOpen={isReservationModalOpen}
        onClose={() => setIsReservationModalOpen(false)}
      />
    </>
  );
}
