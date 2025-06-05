import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { 
  BarChart3, 
  Calendar, 
  Bed, 
  Users, 
  Building2, 
  UserCheck, 
  TrendingUp,
  LogOut,
  Hotel,
  SquareStack
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Sidebar() {
  const { user } = useAuth();
  const [location, navigate] = useLocation();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/";
    }
  };

  const menuItems = [
    {
      title: "Dashboard",
      icon: BarChart3,
      path: "/",
      roles: ["superadmin", "branch-admin", "front-desk"],
    },
    {
      title: "Reservations",
      icon: Calendar,
      path: "/reservations",
      roles: ["superadmin", "branch-admin", "front-desk"],
    },
    {
      title: "Room Management",
      icon: Bed,
      path: "/rooms",
      roles: ["superadmin", "branch-admin", "front-desk"],
    },
    {
      title: "Room Types",
      icon: SquareStack,
      path: "/room-types",
      roles: ["superadmin", "branch-admin"],
    },
    {
      title: "Guest Management",
      icon: Users,
      path: "/guests",
      roles: ["superadmin", "branch-admin", "front-desk"],
    },
  ];

  const adminMenuItems = [
    {
      title: "Branch Management",
      icon: Building2,
      path: "/branches",
      roles: ["superadmin"],
    },
    {
      title: "User Management",
      icon: UserCheck,
      path: "/users",
      roles: ["superadmin"],
    },
  ];

  const reportsMenuItems = [
    {
      title: "Analytics",
      icon: TrendingUp,
      path: "/analytics",
      roles: ["superadmin", "branch-admin"],
    },
  ];

  const isActiveRoute = (path: string) => {
    return location === path;
  };

  const hasAccess = (roles: string[]) => {
    return user && roles.includes(user.role);
  };

  const renderMenuItem = (item: any) => {
    if (!hasAccess(item.roles)) return null;

    return (
      <button
        key={item.path}
        onClick={() => navigate(item.path)}
        className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${
          isActiveRoute(item.path)
            ? "text-primary bg-primary/10 font-medium"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        <item.icon className="h-5 w-5 mr-3" />
        {item.title}
      </button>
    );
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "superadmin":
        return "Superadmin";
      case "branch-admin":
        return "Branch Admin";
      case "front-desk":
        return "Front Desk";
      default:
        return role;
    }
  };

  return (
    <div className="w-280 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Hotel className="h-6 w-6 text-white" />
          </div>
          <div className="ml-3">
            <h1 className="text-lg font-bold text-gray-900">HotelPro</h1>
            <p className="text-sm text-gray-600">
              {user ? getRoleDisplayName(user.role) : "Loading..."}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map(renderMenuItem)}

          {/* Admin Section */}
          {user && (user.role === "superadmin") && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-4">
                ADMIN
              </p>
              {adminMenuItems.map(renderMenuItem)}
            </div>
          )}

          {/* Reports Section */}
          {user && ["superadmin", "branch-admin"].includes(user.role) && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-4">
                REPORTS
              </p>
              {reportsMenuItems.map(renderMenuItem)}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-gray-600" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {user ? `${user.firstName || "User"} ${user.lastName || ""}`.trim() : "Loading..."}
            </p>
            <p className="text-xs text-gray-600">
              {user?.email || "Loading..."}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
