import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  BarChart3, 
  Calendar, 
  Bed, 
  Users, 
  CreditCard, 
  Building2, 
  UserCheck, 
  TrendingUp,
  SquareStack,
  User,
  Settings,
  LogOut,
  X,
  ChevronDown,
  ChevronRight,
  Hotel,
  UtensilsCrossed,
  TableProperties,
  Menu,
  ShoppingCart,
  Receipt
} from "lucide-react";
import { NotificationManager } from "@/components/NotificationManager";

interface SidebarProps {
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export default function Sidebar({ isMobileMenuOpen = false, setIsMobileMenuOpen }: SidebarProps = {}) {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
  const [isRestaurantExpanded, setIsRestaurantExpanded] = useState(false);

  // Use props if provided, otherwise use internal state
  const isMenuOpen = setIsMobileMenuOpen ? isMobileMenuOpen : internalMobileMenuOpen;
  const setMenuOpen = setIsMobileMenuOpen || setInternalMobileMenuOpen;

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
      title: "Guest Management",
      icon: Users,
      path: "/guests",
      roles: ["superadmin", "branch-admin", "front-desk"],
    },
    {
      title: "Billing",
      icon: CreditCard,
      path: "/billing",
      roles: ["superadmin", "branch-admin", "front-desk"],
    },
  ];

  const adminMenuItems = [
    {
      title: "Room Types",
      icon: SquareStack,
      path: "/room-types",
      roles: ["superadmin"],
    },
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
      roles: ["superadmin"],
    },
  ];

  const restaurantMenuItems = [
    {
      title: "Tables",
      icon: TableProperties,
      path: "/restaurant/tables",
      roles: ["superadmin", "branch-admin", "front-desk"],
    },
    {
      title: "Menu",
      icon: Menu,
      path: "/restaurant/menu",
      roles: ["superadmin", "branch-admin", "front-desk"],
    },
    {
      title: "Orders",
      icon: ShoppingCart,
      path: "/restaurant/orders",
      roles: ["superadmin", "branch-admin", "front-desk"],
    },
    {
      title: "Billing",
      icon: Receipt,
      path: "/restaurant/billing",
      roles: ["superadmin", "branch-admin", "front-desk"],
    },
  ];

  const profileMenuItems = [
    {
      title: "Profile",
      icon: User,
      path: "/profile",
      roles: ["superadmin", "branch-admin", "front-desk"],
    },
    {
      title: "Settings",
      icon: Settings,
      path: "/settings",
      roles: ["superadmin"],
    },
  ];

  const isActiveRoute = (path: string) => {
    return location === path;
  };

  const hasAccess = (roles: string[]) => {
    return user && roles.includes((user as any).role);
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
    <div className="relative">
      {/* Mobile overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        bg-white shadow-lg border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out
        lg:w-64 lg:translate-x-0 lg:static lg:z-auto
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed inset-y-0 left-0 z-50 w-64 sm:w-72 h-full
      `}>
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 lg:w-10 lg:h-10 bg-primary rounded-lg flex items-center justify-center">
                <Hotel className="h-4 w-4 lg:h-6 lg:w-6 text-white" />
              </div>
              <div className="ml-2 lg:ml-3">
                <h1 className="text-base lg:text-lg font-bold text-gray-900">HotelPro</h1>
                <p className="text-xs lg:text-sm text-gray-600">
                  {user ? getRoleDisplayName((user as any).role) : "Loading..."}
                </p>
              </div>
            </div>
            {/* Close button for mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMenuOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 h-0">
          <nav className="p-3 lg:p-4 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setMenuOpen(false);
                }}
                className={`
                  w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors
                  ${
                    isActiveRoute(item.path)
                      ? "bg-primary text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }
                `}
              >
                <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                <span className="text-sm font-medium truncate">{item.title}</span>
              </button>
            ))}

              {/* Admin Section */}
              {user && (user as any).role === "superadmin" && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
                    ADMIN
                  </p>
                  <div className="space-y-1">
                    {adminMenuItems.map((item) => {
                      if (!hasAccess(item.roles)) return null;
                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            setMenuOpen(false);
                          }}
                          className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ${
                            isActiveRoute(item.path)
                              ? "bg-primary text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{item.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Restaurant Management System Section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <button
                  onClick={() => setIsRestaurantExpanded(!isRestaurantExpanded)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left rounded-lg transition-colors text-gray-700 hover:bg-gray-100"
                >
                  <div className="flex items-center">
                    <UtensilsCrossed className="h-4 w-4 mr-3 flex-shrink-0" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      RESTAURANT
                    </span>
                  </div>
                  {isRestaurantExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>
                
                {isRestaurantExpanded && (
                  <div className="mt-2 space-y-1 ml-7">
                    {restaurantMenuItems.map((item) => {
                      if (!hasAccess(item.roles)) return null;
                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            setMenuOpen(false);
                          }}
                          className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ${
                            isActiveRoute(item.path)
                              ? "bg-primary text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{item.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reports Section */}
              {user && (user as any).role === "superadmin" && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
                    REPORTS
                  </p>
                  <div className="space-y-1">
                    {reportsMenuItems.map((item) => {
                      if (!hasAccess(item.roles)) return null;
                      return (
                        <button
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            setMenuOpen(false);
                          }}
                          className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ${
                            isActiveRoute(item.path)
                              ? "bg-primary text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                          <span className="text-sm font-medium truncate">{item.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notifications Section */}
              {user && ["superadmin", "branch-admin"].includes((user as any).role) && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
                    NOTIFICATIONS
                  </p>
                  <div className="px-3 py-1" style={{ pointerEvents: 'auto' }}>
                    <NotificationManager />
                  </div>
                </div>
              )}

              {/* Profile Section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
                  PROFILE
                </p>
                <div className="space-y-1">
                  {profileMenuItems.map((item) => {
                    if (!hasAccess(item.roles)) return null;
                    return (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          setMenuOpen(false);
                        }}
                        className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ${
                          isActiveRoute(item.path)
                            ? "bg-primary text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 lg:p-4 border-t border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <Users className="h-4 w-4 text-gray-600" />
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">
                {user ? `${(user as any).firstName || "User"} ${(user as any).lastName || ""}`.trim() : "Loading..."}
              </p>
              <p className="text-xs text-gray-600">
                {(user as any)?.email || "Loading..."}
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
    </div>
  );
}