import { useState } from "react";
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
  SquareStack,
  Menu,
  X,
  CreditCard,
  User,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export default function Sidebar({ isMobileMenuOpen = false, setIsMobileMenuOpen }: SidebarProps = {}) {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isOpen = setIsMobileMenuOpen ? isMobileMenuOpen : internalMobileMenuOpen;
  const setIsOpen = setIsMobileMenuOpen || setInternalMobileMenuOpen;

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
      roles: ["superadmin"],
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
    return user && roles.includes(user.role);
  };

  const renderMenuItem = (item: any) => {
    if (!hasAccess(item.roles)) return null;

    return (
      <button
        key={item.path}
        onClick={() => {
          navigate(item.path);
          setIsOpen(false);
        }}
        className={`w-full flex items-center px-3 py-2.5 rounded-lg text-left transition-colors text-sm font-medium ${
          isActiveRoute(item.path)
            ? "bg-primary text-white"
            : "text-gray-700 hover:bg-gray-100"
        }`}
      >
        <item.icon className="h-4 w-4 mr-3 flex-shrink-0" />
        <span className="truncate">{item.title}</span>
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
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        bg-white shadow-lg border-r border-gray-200 flex flex-col h-full
        transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto lg:w-64
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed inset-y-0 left-0 z-50 w-64 sm:w-72 md:w-80 lg:w-64
      `}>
        
        {/* Header - Fixed at top */}
        <div className="flex-shrink-0 p-3 sm:p-4 lg:p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center min-w-0 flex-1">
              <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Hotel className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
              </div>
              <div className="ml-2 sm:ml-3 min-w-0 flex-1">
                <h1 className="text-sm sm:text-base lg:text-lg font-bold text-gray-900 truncate">HotelPro</h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">
                  {user ? getRoleDisplayName(user.role) : "Loading..."}
                </p>
              </div>
            </div>
            {/* Close button for mobile */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden flex-shrink-0 h-8 w-8 p-0"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 lg:p-3 space-y-1">
          <div className="space-y-1">
            {menuItems.map((item) => {
              if (!hasAccess(item.roles)) return null;
              
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center px-3 py-2.5 text-left rounded-lg transition-colors text-sm font-medium
                    ${
                      isActiveRoute(item.path)
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }
                  `}
                >
                  <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{item.title}</span>
                </button>
              );
            })}
          </div>

          {/* Admin Section */}
          {user && (user as any).role === "superadmin" && (
            <div className="border-t border-gray-200 pt-3 mt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
                ADMIN
              </p>
              <div className="space-y-1">
                {adminMenuItems.map(renderMenuItem)}
              </div>
            </div>
          )}

          {/* Reports Section */}
          {user && ["superadmin", "branch-admin"].includes((user as any).role) && (
            <div className="border-t border-gray-200 pt-3 mt-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
                REPORTS
              </p>
              <div className="space-y-1">
                {reportsMenuItems.map(renderMenuItem)}
              </div>
            </div>
          )}

          {/* Profile Section */}
          <div className="border-t border-gray-200 pt-3 mt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
              PROFILE
            </p>
            <div className="space-y-1">
              {profileMenuItems.map(renderMenuItem)}
            </div>
          </div>
        </nav>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 p-3 sm:p-4 lg:p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center min-w-0">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4 text-gray-600" />
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user ? `${(user as any).firstName || "User"} ${(user as any).lastName || ""}`.trim() : "Loading..."}
              </p>
              <p className="text-xs text-gray-600 truncate">
                {(user as any)?.email || "Loading..."}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 h-8 w-8 p-0"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}