import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
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

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

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
          <Route path="/billing" component={Billing} />
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