import { useState } from "react";
import { Router, Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { queryClient } from "@/lib/queryClient";

import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

// Import pages
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Reservations from "@/pages/reservations";
import Rooms from "@/pages/rooms";
import RoomTypes from "@/pages/room-types";
import Guests from "@/pages/guests";
import Billing from "@/pages/billing";
import Branches from "@/pages/branches";
import Users from "@/pages/users";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <div className="container">
        <Router>
          <Route path="/login">
            <Login />
          </Route>
          <Route path="/">
            <ProtectedRoute>
              <div className="flex h-screen bg-gray-50">
                <Sidebar
                  isMobileMenuOpen={isMobileMenuOpen}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Header
                    title="Dashboard"
                    subtitle="Super Admin - All Branches Overview"
                    onMobileMenuToggle={toggleMobileMenu}
                  />
                  <main className="flex-1 overflow-auto p-6">
                    <Dashboard />
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          </Route>

          <Route path="/reservations">
            <ProtectedRoute>
              <div className="flex h-screen bg-gray-50">
                <Sidebar
                  isMobileMenuOpen={isMobileMenuOpen}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Header
                    title="Reservations"
                    subtitle="Manage hotel bookings and availability"
                    onMobileMenuToggle={toggleMobileMenu}
                  />
                  <main className="flex-1 overflow-auto p-6">
                    <Reservations />
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          </Route>

          <Route path="/rooms">
            <ProtectedRoute>
              <div className="flex h-screen bg-gray-50">
                <Sidebar
                  isMobileMenuOpen={isMobileMenuOpen}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Header
                    title="Room Management"
                    subtitle="Monitor and manage room status"
                    onMobileMenuToggle={toggleMobileMenu}
                  />
                  <main className="flex-1 overflow-auto p-6">
                    <Rooms />
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          </Route>

          <Route path="/room-types">
            <ProtectedRoute>
              <div className="flex h-screen bg-gray-50">
                <Sidebar
                  isMobileMenuOpen={isMobileMenuOpen}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Header
                    title="Room Types"
                    subtitle="Configure room categories and pricing"
                    onMobileMenuToggle={toggleMobileMenu}
                  />
                  <main className="flex-1 overflow-auto p-6">
                    <RoomTypes />
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          </Route>

          <Route path="/guests">
            <ProtectedRoute>
              <div className="flex h-screen bg-gray-50">
                <Sidebar
                  isMobileMenuOpen={isMobileMenuOpen}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Header
                    title="Guest Management"
                    subtitle="Manage guest information and profiles"
                    onMobileMenuToggle={toggleMobileMenu}
                  />
                  <main className="flex-1 overflow-auto p-6">
                    <Guests />
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          </Route>

          <Route path="/billing">
            <ProtectedRoute>
              <div className="flex h-screen bg-gray-50">
                <Sidebar
                  isMobileMenuOpen={isMobileMenuOpen}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Header
                    title="Billing"
                    subtitle="Handle payments and invoicing"
                    onMobileMenuToggle={toggleMobileMenu}
                  />
                  <main className="flex-1 overflow-auto p-6">
                    <Billing />
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          </Route>

          <Route path="/branches">
            <ProtectedRoute>
              <div className="flex h-screen bg-gray-50">
                <Sidebar
                  isMobileMenuOpen={isMobileMenuOpen}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Header
                    title="Branch Management"
                    subtitle="Manage hotel branches and locations"
                    onMobileMenuToggle={toggleMobileMenu}
                  />
                  <main className="flex-1 overflow-auto p-6">
                    <Branches />
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          </Route>

          <Route path="/users">
            <ProtectedRoute>
              <div className="flex h-screen bg-gray-50">
                <Sidebar
                  isMobileMenuOpen={isMobileMenuOpen}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Header
                    title="User Management"
                    subtitle="Manage staff accounts and permissions"
                    onMobileMenuToggle={toggleMobileMenu}
                  />
                  <main className="flex-1 overflow-auto p-6">
                    <Users />
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          </Route>

          <Route path="/profile">
            <ProtectedRoute>
              <div className="flex h-screen bg-gray-50">
                <Sidebar
                  isMobileMenuOpen={isMobileMenuOpen}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Header
                    title="Profile"
                    subtitle="Manage your account settings"
                    onMobileMenuToggle={toggleMobileMenu}
                  />
                  <main className="flex-1 overflow-auto p-6">
                    <Profile />
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          </Route>

          <Route path="/settings">
            <ProtectedRoute>
              <div className="flex h-screen bg-gray-50">
                <Sidebar
                  isMobileMenuOpen={isMobileMenuOpen}
                  setIsMobileMenuOpen={setIsMobileMenuOpen}
                />
                <div className="flex-1 flex flex-col overflow-hidden">
                  <Header
                    title="Settings"
                    subtitle="Configure system settings"
                    onMobileMenuToggle={toggleMobileMenu}
                  />
                  <main className="flex-1 overflow-auto p-6">
                    <Settings />
                  </main>
                </div>
              </div>
            </ProtectedRoute>
          </Route>

          <Route path="/landing">
            <ProtectedRoute>
              <Header title="Landing" subtitle="Landing page" />
              <Landing />
            </ProtectedRoute>
          </Route>

          <Route path="*">
            <NotFound />
          </Route>
        </Router>
      </div>
    </QueryClientProvider>
  );
}

export default App;