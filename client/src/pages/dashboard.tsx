import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MetricsCards from "@/components/dashboard/metrics-cards";
import RecentReservations from "@/components/dashboard/recent-reservations";
import RecentOrders from "@/components/dashboard/recent-orders";
import QuickActions from "@/components/dashboard/quick-actions";
import RoomStatusOverview from "@/components/dashboard/room-status-overview";
import TableStatusOverview from "@/components/dashboard/table-status-overview";
import BranchMetrics from "@/components/dashboard/branch-metrics";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Building2, TrendingUp, Users, TrendingUp as RevenueIcon, Bed } from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

  // Enhanced dashboard for super admin showing all branches performance
  const { data: superAdminMetrics } = useQuery({
    queryKey: ["/api/dashboard/super-admin-metrics"],
    enabled: isAuthenticated && (user as any)?.role === "superadmin",
  });

  const isSuperAdmin = (user as any)?.role === "superadmin";

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isMobileMenuOpen={isMobileSidebarOpen}
        setIsMobileMenuOpen={setIsMobileSidebarOpen}
      />
      <div className="main-content">
        <Header 
          title="Dashboard"
          subtitle={isSuperAdmin ? "Super Admin - Today's Overview (24 Hours)" : "Today's Hotel Operations Overview (24 Hours)"}
          onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
        <main className="content-wrapper">
          {/* Super Admin Global Overview */}
          {isSuperAdmin && superAdminMetrics && (
            <div className="mb-6" style={{ display: 'contents' }}>

              {/* Branch Performance Cards */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Branch Performance
                  </CardTitle>
                  <CardDescription>
                    Real-time performance metrics across all hotel branches
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {(superAdminMetrics as any)?.branchMetrics?.map((branch: any) => (
                      <Card key={branch.branchId} className="border-l-4 border-l-primary">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">{branch.branchName}</CardTitle>
                            <Badge variant="outline">ID: {branch.branchId}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-muted-foreground">Reservations</div>
                              <div className="font-medium">{branch.totalReservations}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">Orders</div>
                              <div className="font-medium">{branch.totalOrders || 0}</div>
                            </div>
                            <div className="col-span-2">
                              <div className="text-muted-foreground">Today's Revenue (Reservations, Orders)</div>
                              <div className="font-medium text-green-600">₨. {((branch.revenue || 0) + (branch.restaurantRevenue || 0)).toLocaleString()}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <MetricsCards />

          {/* Show branch metrics only for super admin */}
          {!isSuperAdmin && (user as any)?.role === "superadmin" && <BranchMetrics />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <RecentReservations />
            <RecentOrders />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:mb-8">
            <RoomStatusOverview />
            <TableStatusOverview />
          </div>

          <QuickActions />
        </main>
      </div>
    </div>
  );
}