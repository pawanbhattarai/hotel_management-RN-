import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  ChefHat,
  CheckCircle,
  Utensils,
  Printer,
  Timer,
  Users,
  FileText,
  Plus,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useAuth } from "@/hooks/useAuth";

interface KotItem {
  id: number;
  dishId: number;
  quantity: number;
  specialInstructions?: string;
  dish: {
    name: string;
  };
}

interface KotTicket {
  id: number;
  kotNumber: string;
  orderId: string;
  tableId?: number;
  roomId?: number;
  customerName?: string;
  status: "pending" | "preparing" | "ready" | "served";
  itemCount: number;
  notes?: string;
  printedAt?: string;
  startedAt?: string;
  completedAt?: string;
  servedAt?: string;
  createdAt: string;
  table?: {
    name: string;
  };
  order: {
    orderNumber: string;
  };
  items: KotItem[];
}

const statusConfig = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
    action: "Start Preparing",
    nextStatus: "preparing",
  },
  preparing: {
    label: "Preparing",
    color: "bg-blue-100 text-blue-800",
    icon: ChefHat,
    action: "Mark Ready",
    nextStatus: "ready",
  },
  ready: {
    label: "Ready",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
    action: "Mark Served",
    nextStatus: "served",
  },
  served: {
    label: "Served",
    color: "bg-gray-100 text-gray-800",
    icon: Utensils,
    action: null,
    nextStatus: null,
  },
};

export default function RestaurantKOT() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pending");

  const { data: kotTickets = [], isLoading } = useQuery({
    queryKey: ["/api/restaurant/kot", activeTab],
    queryFn: async () => {
      const status = activeTab === "all" ? "" : activeTab;
      const response = await fetch(`/api/restaurant/kot?status=${status}`);
      if (!response.ok) throw new Error("Failed to fetch KOT tickets");
      return response.json();
    },
    refetchInterval: 2000, // Real-time polling every 2 seconds for immediate updates
  });

  // Real-time updates via polling (WebSocket disabled in dev mode)

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      kotId,
      status,
    }: {
      kotId: number;
      status: string;
    }) => {
      const response = await fetch(`/api/restaurant/kot/${kotId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Failed to update KOT status");
      return response.json();
    },
    onSuccess: () => {
      // Real-time update via WebSocket, but also invalidate for safety
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/kot"] });
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/orders"] });
      toast({
        title: "Success",
        description: "KOT status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update KOT status",
        variant: "destructive",
      });
    },
  });

  const markPrintedMutation = useMutation({
    mutationFn: async (kotId: number) => {
      const response = await fetch(`/api/restaurant/kot/${kotId}/print`, {
        method: "PATCH",
      });
      if (!response.ok) throw new Error("Failed to mark KOT as printed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurant/kot"] });
      toast({
        title: "Success",
        description: "KOT marked as printed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to mark KOT as printed",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (kotId: number, nextStatus: string) => {
    updateStatusMutation.mutate({ kotId, status: nextStatus });
  };

  const handlePrint = (kotId: number) => {
    // In a real implementation, this would trigger the print dialog
    markPrintedMutation.mutate(kotId);
    window.print();
  };

  const getTimeDuration = (startTime: string, endTime?: string) => {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffInMinutes = Math.floor(
      (end.getTime() - start.getTime()) / (1000 * 60),
    );
    return `${diffInMinutes}m`;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="main-content">
          <Header
            title="Kitchen Order Tickets (KOT)"
            subtitle="Manage kitchen orders and track preparation status"
          />
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Header */}
        <Header
          title="Kitchen Order Tickets (KOT)"
          subtitle="Manage kitchen orders and track preparation status"
        />

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <TabsList className="grid w-full grid-cols-5 sm:w-auto">
                  <TabsTrigger
                    value="all"
                    className="text-xs sm:text-sm font-medium"
                  >
                    All
                  </TabsTrigger>
                  <TabsTrigger
                    value="pending"
                    className="text-xs sm:text-sm font-medium"
                  >
                    Pending
                  </TabsTrigger>
                  <TabsTrigger
                    value="preparing"
                    className="text-xs sm:text-sm font-medium"
                  >
                    Preparing
                  </TabsTrigger>
                  <TabsTrigger
                    value="ready"
                    className="text-xs sm:text-sm font-medium"
                  >
                    Ready
                  </TabsTrigger>
                  <TabsTrigger
                    value="served"
                    className="text-xs sm:text-sm font-medium"
                  >
                    Served
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">
                    Total KOTs: {kotTickets.length}
                  </span>
                </div>
              </div>

              <TabsContent value={activeTab} className="space-y-4">
                {kotTickets.length === 0 ? (
                  <div className="text-center py-12 lg:py-20">
                    <ChefHat className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-medium">No KOT tickets</h3>
                    <p className="text-muted-foreground mt-2">
                      {activeTab === "all"
                        ? "No KOT tickets found"
                        : `No ${activeTab} KOT tickets found`}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                    {kotTickets.map((kot: KotTicket) => {
                      const config = statusConfig[kot.status];
                      const StatusIcon = config.icon;

                      return (
                        <Card
                          key={kot.id}
                          className="relative hover:shadow-lg transition-shadow"
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-base lg:text-lg font-semibold truncate">
                                {kot.kotNumber}
                              </CardTitle>
                              <Badge className={config.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">
                                  {config.label}
                                </span>
                              </Badge>
                            </div>

                            <div className="space-y-2 text-xs lg:text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                <FileText className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />
                                <span className="truncate">
                                  Order: {kot.order.orderNumber}
                                </span>
                              </div>

                              {kot.table && (
                                <div className="flex items-center gap-2">
                                  <Utensils className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />
                                  <span className="truncate">
                                    Table: {kot.table.name}
                                  </span>
                                </div>
                              )}

                              {kot.customerName && (
                                <div className="flex items-center gap-2">
                                  <Users className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />
                                  <span className="truncate">
                                    {kot.customerName}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-2">
                                <Timer className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />
                                <span className="truncate">
                                  {kot.status === "pending" &&
                                    `Created ${getTimeDuration(kot.createdAt)} ago`}
                                  {kot.status === "preparing" &&
                                    kot.startedAt &&
                                    `Preparing for ${getTimeDuration(kot.startedAt)}`}
                                  {kot.status === "ready" &&
                                    kot.completedAt &&
                                    `Ready since ${getTimeDuration(kot.completedAt)}`}
                                  {kot.status === "served" &&
                                    kot.servedAt &&
                                    `Served ${getTimeDuration(kot.servedAt)} ago`}
                                </span>
                              </div>
                            </div>
                          </CardHeader>

                          <CardContent className="space-y-3 lg:space-y-4">
                            <div>
                              <h4 className="font-medium mb-2 text-sm lg:text-base">
                                Items ({kot.itemCount})
                              </h4>
                              <div className="space-y-2">
                                {kot.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex justify-between items-start p-2 bg-muted rounded text-sm"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <span className="font-medium">
                                        {item.dish.name}
                                      </span>
                                      {item.specialInstructions && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                          Note: {item.specialInstructions}
                                        </p>
                                      )}
                                    </div>
                                    <Badge
                                      variant="outline"
                                      className="ml-2 text-xs"
                                    >
                                      {item.quantity}x
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {kot.notes && (
                              <div className="p-2 bg-yellow-50 rounded">
                                <p className="text-xs lg:text-sm">
                                  <strong>Order Notes:</strong> {kot.notes}
                                </p>
                              </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-2">
                              {!kot.printedAt && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePrint(kot.id)}
                                  disabled={markPrintedMutation.isPending}
                                  className="w-full sm:w-auto"
                                >
                                  <Printer className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">
                                    Print
                                  </span>
                                </Button>
                              )}

                              {config.action && config.nextStatus && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleStatusUpdate(
                                      kot.id,
                                      config.nextStatus!,
                                    )
                                  }
                                  disabled={updateStatusMutation.isPending}
                                  className="flex-1"
                                >
                                  {config.action}
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
