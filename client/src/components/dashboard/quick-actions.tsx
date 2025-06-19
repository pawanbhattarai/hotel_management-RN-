import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, UtensilsCrossed } from "lucide-react";
import MultiRoomModal from "@/components/reservations/multi-room-modal";

export default function QuickActions() {
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);

  const handleNewReservation = () => {
    setIsReservationModalOpen(true);
  };

  const handleDiningOrders = () => {
    // Navigate to dining orders page
    window.location.href = "/restaurant/orders";
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
      title: "Dining Orders",
      description: "Create dining order",
      icon: UtensilsCrossed,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      action: handleDiningOrders,
    },
  ];

  return (
    <>
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardHeader className="p-4">
          <CardTitle className="text-base font-semibold text-gray-900">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex space-x-2">
            {quickActionItems.map((item, index) => (
              <Button
                key={index}
                variant="ghost"
                onClick={item.action}
                className="flex-1 flex flex-col items-center p-3 text-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors h-auto"
              >
                <div
                  className={`w-8 h-8 ${item.iconBg} rounded-lg flex items-center justify-center mb-2`}
                >
                  <item.icon className={`${item.iconColor} h-4 w-4`} />
                </div>
                <div className="text-center">
                  <p className="font-medium text-gray-900 text-sm mb-1">
                    {item.title}
                  </p>
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
