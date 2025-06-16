import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  BarChart3,
  Calendar,
  Bed,
  Users,
  CreditCard,
  Settings,
  Building2,
  UserCheck,
  SquareStack,
  TrendingUp,
  LogOut,
  ChevronDown,
  ChevronRight,
  Menu as MenuIcon,
  X,
  ChefHat,
  Receipt,
  ClipboardList,
  Utensils,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { NotificationManager } from "@/components/NotificationManager";

interface SidebarProps {
  isMobileMenuOpen?: boolean;
  setIsMobileMenuOpen?: (open: boolean) => void;
}

export default function Sidebar({
  isMobileMenuOpen = false,
  setIsMobileMenuOpen,
}: SidebarProps = {}) {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const [internalMobileMenuOpen, setInternalMobileMenuOpen] = useState(false);

  // Smart expansion based on current route
  const [isPMSExpanded, setIsPMSExpanded] = useState(true);
  const [isSetupExpanded, setIsSetupExpanded] = useState(false);
  const [isRMSExpanded, setIsRMSExpanded] = useState(false);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);
  const [isCategoryExpanded, setIsCategoryExpanded] = useState(false);
  const [isDishesExpanded, setIsDishesExpanded] = useState(false);

  // Use props if provided, otherwise use internal state
  const isMenuOpen = setIsMobileMenuOpen
    ? isMobileMenuOpen
    : internalMobileMenuOpen;
  const setMenuOpen = setIsMobileMenuOpen || setInternalMobileMenuOpen;

  // Update expanded state based on current route
  useEffect(() => {
    const currentPath = location;

    if (currentPath.startsWith("/restaurant/")) {
      setIsRMSExpanded(true);
      setIsPMSExpanded(false);
      setIsSetupExpanded(false);

      // Expand menu section if on menu page
      if (currentPath === "/restaurant/menu") {
        setIsMenuExpanded(true);
      } else {
        setIsMenuExpanded(false);
      }
    } else if (["/room-types", "/branches", "/users"].includes(currentPath)) {
      setIsSetupExpanded(true);
      setIsPMSExpanded(true); // Keep PMS expanded for setup items
      setIsRMSExpanded(false);
      setIsMenuExpanded(false);
    } else {
      setIsPMSExpanded(true);
      setIsRMSExpanded(false);
      setIsSetupExpanded(false);
      setIsMenuExpanded(false);
    }
  }, [location]);

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

  const isActiveRoute = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  const hasAccess = (allowedRoles: string[]) => {
    return user && allowedRoles.includes((user as any).role);
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

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-3 lg:p-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 lg:space-x-3">
            <div className="w-7 h-7 lg:w-8 lg:h-8 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
            </div>
            <div className="hidden lg:block">
              <h1 className="text-base lg:text-lg font-bold text-gray-900">
                HotelPro
              </h1>
              <p className="text-xs lg:text-sm text-gray-600">
                {user ? getRoleDisplayName((user as any).role) : "Loading..."}
              </p>
            </div>
          </div>
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden h-8 w-8 p-0"
            onClick={() => setMenuOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-2 lg:px-3">
          <nav className="py-3 space-y-1">
            {/* PMS Section */}
            <Collapsible open={isPMSExpanded} onOpenChange={setIsPMSExpanded}>
              <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-100 rounded-lg">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  PMS
                </span>
                {isPMSExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-2">
                {/* Dashboard */}
                {hasAccess(["superadmin", "branch-admin", "front-desk"]) && (
                  <button
                    onClick={() => {
                      navigate("/");
                      setMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ml-4 ${
                      isActiveRoute("/")
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <BarChart3 className="mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">Dashboard</span>
                  </button>
                )}

                {/* Reservations */}
                {hasAccess(["superadmin", "branch-admin", "front-desk"]) && (
                  <button
                    onClick={() => {
                      navigate("/reservations");
                      setMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ml-4 ${
                      isActiveRoute("/reservations")
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Calendar className="mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">Reservations</span>
                  </button>
                )}

                {/* Room Management */}
                {hasAccess(["superadmin", "branch-admin", "front-desk"]) && (
                  <button
                    onClick={() => {
                      navigate("/rooms");
                      setMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ml-4 ${
                      isActiveRoute("/rooms")
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Bed className="mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">Room Management</span>
                  </button>
                )}

                {/* Guest Management */}
                {hasAccess(["superadmin", "branch-admin", "front-desk"]) && (
                  <button
                    onClick={() => {
                      navigate("/guests");
                      setMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ml-4 ${
                      isActiveRoute("/guests")
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Users className="mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">
                      Guest Management
                    </span>
                  </button>
                )}

                {/* Billing */}
                {hasAccess(["superadmin", "branch-admin", "front-desk"]) && (
                  <button
                    onClick={() => {
                      navigate("/billing");
                      setMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ml-4 ${
                      isActiveRoute("/billing")
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <CreditCard className="mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">Billing</span>
                  </button>
                )}

                {/* Setup Section */}
                <Collapsible
                  open={isSetupExpanded}
                  onOpenChange={setIsSetupExpanded}
                >
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-100 rounded-lg ml-4">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Setup
                    </span>
                    {isSetupExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-2">
                    {/* Room Types */}
                    {hasAccess(["superadmin"]) && (
                      <button
                        onClick={() => {
                          navigate("/room-types");
                          setMenuOpen(false);
                        }}
                        className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ml-8 ${
                          isActiveRoute("/room-types")
                            ? "bg-primary text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <SquareStack className="mr-3 h-4 w-4 flex-shrink-0" />
                        <span className="text-sm font-medium">Room Types</span>
                      </button>
                    )}

                    {/* Branch Management */}
                    {hasAccess(["superadmin"]) && (
                      <button
                        onClick={() => {
                          navigate("/branches");
                          setMenuOpen(false);
                        }}
                        className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ml-8 ${
                          isActiveRoute("/branches")
                            ? "bg-primary text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <Building2 className="mr-3 h-4 w-4 flex-shrink-0" />
                        <span className="text-sm font-medium">
                          Branch Management
                        </span>
                      </button>
                    )}

                    {/* User Management */}
                    {hasAccess(["superadmin"]) && (
                      <button
                        onClick={() => {
                          navigate("/users");
                          setMenuOpen(false);
                        }}
                        className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ml-8 ${
                          isActiveRoute("/users")
                            ? "bg-primary text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <UserCheck className="mr-3 h-4 w-4 flex-shrink-0" />
                        <span className="text-sm font-medium">
                          User Management
                        </span>
                      </button>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              </CollapsibleContent>
            </Collapsible>

            {/* RMS Section */}
            {hasAccess(["superadmin", "branch-admin", "front-desk"]) && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <Collapsible
                  open={isRMSExpanded}
                  onOpenChange={setIsRMSExpanded}
                >
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-100 rounded-lg">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      RMS
                    </span>
                    {isRMSExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-2">
                    {/* Tables */}
                    <button
                      onClick={() => {
                        navigate("/restaurant/tables");
                        setMenuOpen(false);
                      }}
                      className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ml-4 ${
                        isActiveRoute("/restaurant/tables")
                          ? "bg-primary text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Utensils className="mr-3 h-4 w-4 flex-shrink-0" />
                      <span className="text-sm font-medium">Tables</span>
                    </button>

                    {/* Menu Section */}
                    <Collapsible
                      open={isMenuExpanded}
                      onOpenChange={setIsMenuExpanded}
                    >
                      <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-100 rounded-lg ml-4">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          Menu
                        </span>
                        {isMenuExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1 mt-2">
                        {/* Category */}
                        <button
                          onClick={() => {
                            navigate("/restaurant/categories");
                            setMenuOpen(false);
                          }}
                          className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ml-8 ${
                            isActiveRoute("/restaurant/categories")
                              ? "bg-primary text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <MenuIcon className="mr-3 h-4 w-4 flex-shrink-0" />
                          <span className="text-sm font-medium">
                            Category
                          </span>
                        </button>
                         {/* Dishes */}
                         <button
                          onClick={() => {
                            navigate("/restaurant/dishes");
                            setMenuOpen(false);
                          }}
                          className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ml-8 ${
                            isActiveRoute("/restaurant/dishes")
                              ? "bg-primary text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <ChefHat className="mr-3 h-4 w-4 flex-shrink-0" />
                          <span className="text-sm font-medium">
                            Dishes
                          </span>
                        </button>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Orders */}
                    <button
                      onClick={() => {
                        navigate("/restaurant/orders");
                        setMenuOpen(false);
                      }}
                      className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ml-4 ${
                        isActiveRoute("/restaurant/orders")
                          ? "bg-primary text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <ClipboardList className="mr-3 h-4 w-4 flex-shrink-0" />
                      <span className="text-sm font-medium">Orders</span>
                    </button>

                    {/* Billing */}
                    <button
                      onClick={() => {
                        navigate("/restaurant/billing");
                        setMenuOpen(false);
                      }}
                      className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ml-4 ${
                        isActiveRoute("/restaurant/billing")
                          ? "bg-primary text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Receipt className="mr-3 h-4 w-4 flex-shrink-0" />
                      <span className="text-sm font-medium">Billing</span>
                    </button>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Reports */}
            {hasAccess(["superadmin"]) && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="px-3 py-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Reports
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigate("/analytics");
                    setMenuOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ml-4 ${
                    isActiveRoute("/analytics")
                      ? "bg-primary text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <TrendingUp className="mr-3 h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">Analytics</span>
                </button>
              </div>
            )}

            {/* Notifications Section */}
            {user &&
              ["superadmin", "branch-admin"].includes((user as any).role) && (
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
                    NOTIFICATIONS
                  </p>
                  <div className="px-3 py-1" style={{ pointerEvents: "auto" }}>
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
                {/* Profile */}
                {hasAccess(["superadmin", "branch-admin", "front-desk"]) && (
                  <button
                    onClick={() => {
                      navigate("/profile");
                      setMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ml-4 ${
                      isActiveRoute("/profile")
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <User className="mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">Profile</span>
                  </button>
                )}

                {/* Settings */}
                {hasAccess(["superadmin"]) && (
                  <button
                    onClick={() => {
                      navigate("/settings");
                      setMenuOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 lg:py-2.5 text-left rounded-lg transition-colors ml-4 ${
                      isActiveRoute("/settings")
                        ? "bg-primary text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Settings className="mr-3 h-4 w-4 flex-shrink-0" />
                    <span className="text-sm font-medium">Settings</span>
                  </button>
                )}
              </div>
            </div>
          </nav>
        </ScrollArea>
      </div>

      {/* Footer */}
      <div className="p-3 lg:p-4 border-t border-gray-200 flex-shrink-0">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-gray-600" />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {user
                ? `${(user as any).firstName || "User"} ${(user as any).lastName || ""}`.trim()
                : "Loading..."}
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
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <div className="lg:hidden">
        <Sheet open={isMenuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="fixed top-3 left-3 z-50 lg:hidden bg-white shadow-md border"
            >
              <MenuIcon className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 sm:w-80 p-0 max-w-[85vw]">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-gray-200 lg:z-30">
        <SidebarContent />
      </div>
    </>
  );
}