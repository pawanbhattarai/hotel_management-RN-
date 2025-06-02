import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";

export default function Users() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth();

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

  // Only superadmin should see this page
  if (user && user.role !== "superadmin") {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            title="User Management"
            subtitle="Access Denied"
          />
          <main className="flex-1 overflow-y-auto p-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-gray-500">You don't have permission to view this page.</p>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

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
          title="User Management"
          subtitle="Manage staff accounts and permissions"
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <p className="text-gray-500">User management functionality coming soon.</p>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
