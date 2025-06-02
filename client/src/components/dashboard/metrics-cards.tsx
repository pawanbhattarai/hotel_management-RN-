import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Bed, DollarSign, DoorOpen } from "lucide-react";

export default function MetricsCards() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics"],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-24 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricsData = [
    {
      title: "Total Reservations",
      value: metrics?.totalReservations || 0,
      change: "+12.5%",
      changeType: "positive" as const,
      icon: Calendar,
      iconBg: "bg-primary-50",
      iconColor: "text-primary",
    },
    {
      title: "Occupancy Rate",
      value: `${metrics?.occupancyRate || 0}%`,
      change: "+5.2%",
      changeType: "positive" as const,
      icon: Bed,
      iconBg: "bg-success-50",
      iconColor: "text-success",
    },
    {
      title: "Revenue Today",
      value: `$${(metrics?.revenueToday || 0).toLocaleString()}`,
      change: "-2.1%",
      changeType: "negative" as const,
      icon: DollarSign,
      iconBg: "bg-warning-50",
      iconColor: "text-warning",
    },
    {
      title: "Available Rooms",
      value: metrics?.availableRooms || 0,
      change: "-8 rooms",
      changeType: "negative" as const,
      icon: DoorOpen,
      iconBg: "bg-error-50",
      iconColor: "text-error",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metricsData.map((metric, index) => (
        <Card key={index} className="bg-white rounded-xl shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{metric.value}</p>
                <div className="flex items-center mt-2">
                  <span 
                    className={`text-sm font-medium ${
                      metric.changeType === "positive" ? "text-success" : "text-warning"
                    }`}
                  >
                    {metric.change}
                  </span>
                  <span className="text-xs text-gray-500 ml-1">vs last month</span>
                </div>
              </div>
              <div className={`w-12 h-12 ${metric.iconBg} rounded-xl flex items-center justify-center`}>
                <metric.icon className={`${metric.iconColor} text-xl h-6 w-6`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
