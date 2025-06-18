
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  CheckCircle, 
  User, 
  Calendar,
  Clock
} from "lucide-react";

export default function TableStatusOverview() {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ["/api/restaurant/dashboard/metrics"],
  });

  if (isLoading) {
    return (
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardHeader className="p-6 border-b border-gray-200">
          <CardTitle className="text-lg font-semibold text-gray-900">Table Status Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
        <CardHeader className="p-6 border-b border-gray-200">
          <CardTitle className="text-lg font-semibold text-gray-900">Table Status Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">Failed to load table status. Please try again.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tableStatusItems = [
    {
      key: "available",
      label: "Available",
      icon: CheckCircle,
      iconBg: "bg-success-50",
      iconColor: "text-success",
      count: metrics?.tableStatusCounts?.available || 0,
    },
    {
      key: "occupied",
      label: "Occupied",
      icon: User,
      iconBg: "bg-primary-50",
      iconColor: "text-primary",
      count: metrics?.tableStatusCounts?.occupied || 0,
    },
    {
      key: "reserved",
      label: "Reserved",
      icon: Calendar,
      iconBg: "bg-purple-50",
      iconColor: "text-purple-500",
      count: metrics?.tableStatusCounts?.reserved || 0,
    },
    {
      key: "cleaning",
      label: "Cleaning",
      icon: Clock,
      iconBg: "bg-warning-50",
      iconColor: "text-warning",
      count: metrics?.tableStatusCounts?.cleaning || 0,
    },
  ];

  return (
    <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
      <CardHeader className="p-6 border-b border-gray-200">
        <CardTitle className="text-lg font-semibold text-gray-900">Table Status Overview</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {tableStatusItems.map((item) => (
            <div key={item.key} className="text-center">
              <div className={`w-12 h-12 ${item.iconBg} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                <item.icon className={`${item.iconColor} h-6 w-6`} />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {item.count}
              </div>
              <div className="text-sm text-gray-600">
                {item.label}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Table Occupancy Rate</span>
            <span className="text-lg font-bold text-primary">
              {metrics?.tableOccupancyRate || 0}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
