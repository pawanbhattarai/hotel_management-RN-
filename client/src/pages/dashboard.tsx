import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MetricsCards from "@/components/dashboard/metrics-cards";
import RecentReservations from "@/components/dashboard/recent-reservations";
import QuickActions from "@/components/dashboard/quick-actions";
import RoomStatusOverview from "@/components/dashboard/room-status-overview";
import BranchMetrics from "@/components/dashboard/branch-metrics";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  
  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
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
          title="Dashboard"
          subtitle="Overview of hotel operations"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <MetricsCards />
          
          {/* Show branch metrics only for super admin */}
          {user?.role === "superadmin" && <BranchMetrics />}
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <RecentReservations />
            </div>
            <QuickActions />
          </div>
          
          <RoomStatusOverview />
        </main>
      </div>
    </div>
  );
}
