import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Reservations from "@/pages/reservations";
import Rooms from "@/pages/rooms";
import Guests from "@/pages/guests";
import Branches from "@/pages/branches";
import Users from "@/pages/users";
import RoomTypes from "@/pages/room-types";
import Billing from "@/pages/billing";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import Analytics from "@/pages/analytics";
import RestaurantTables from "@/pages/restaurant-tables";
import RestaurantMenu from "@/pages/restaurant-menu";
import RestaurantOrders from "@/pages/restaurant-orders";
import RestaurantBilling from "@/pages/restaurant-billing";

function Router() {
  const { isAuthenticated, isLoading, user } = useAuth();
  useWebSocket(user);

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Login} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/reservations" component={Reservations} />
          <Route path="/rooms" component={Rooms} />
          <Route path="/room-types" component={RoomTypes} />
          <Route path="/guests" component={Guests} />
          <Route path="/branches" component={Branches} />
          <Route path="/users" component={Users} />
          <Route path="/analytics" component={Analytics} />
          <Route path="/billing" component={Billing} />
          <Route path="/profile" component={Profile} />
          <Route path="/settings" component={Settings} />
          <Route path="/restaurant/tables" component={RestaurantTables} />
          <Route path="/restaurant/menu" component={RestaurantMenu} />
          <Route path="/restaurant/orders" component={RestaurantOrders} />
          <Route path="/restaurant/billing" component={RestaurantBilling} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
