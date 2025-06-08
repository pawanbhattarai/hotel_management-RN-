import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, Calendar, Shield, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  profileImageUrl: z.string().optional(),
});

type ProfileUpdateForm = z.infer<typeof profileUpdateSchema>;

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/profile"],
  });

  const form = useForm<ProfileUpdateForm>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      firstName: profile?.firstName || "",
      lastName: profile?.lastName || "",
      email: profile?.email || "",
      phone: profile?.phone || "",
      profileImageUrl: profile?.profileImageUrl || "",
    },
  });

  const { reset } = form;

  // Reset form when profile data loads
  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        email: profile.email || "",
        phone: profile.phone || "",
        profileImageUrl: profile.profileImageUrl || "",
      });
    }
  }, [profile, reset]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileUpdateForm) =>
      apiRequest("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileUpdateForm) => {
    updateProfileMutation.mutate(data);
  };

  const handleSaveClick = () => {
    form.handleSubmit(onSubmit)();
  };

  const handleCancel = () => {
    reset();
    setIsEditing(false);
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "superadmin":
        return "Super Administrator";
      case "branch-admin":
        return "Branch Administrator";
      case "front-desk":
        return "Front Desk";
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "superadmin":
        return "destructive";
      case "branch-admin":
        return "default";
      case "front-desk":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6">
        <Header title="Profile Management" subtitle="Manage your account information" />
        <div className="mt-6 animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  const initials = profile?.firstName && profile?.lastName 
    ? `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
    : "U";

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header 
          title="Profile Management" 
          subtitle="Manage your account information and preferences"
          onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          action={
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancel} size="sm" className="text-xs px-2 py-1 lg:text-sm lg:px-3 lg:py-2">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveClick}
                    disabled={updateProfileMutation.isPending}
                    size="sm" 
                    className="text-xs px-2 py-1 lg:text-sm lg:px-3 lg:py-2"
                  >
                    {updateProfileMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} size="sm" className="text-xs px-2 py-1 lg:text-sm lg:px-3 lg:py-2">
                  Edit Profile
                </Button>
              )}
            </div>
          }
        />
        
        {/* Mobile Sidebar */}
        <div className="lg:hidden">
          <Sidebar 
            isMobileMenuOpen={isMobileSidebarOpen} 
            setIsMobileMenuOpen={setIsMobileSidebarOpen} 
          />
        </div>
        
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-4 lg:space-y-6">

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Overview */}
        <Card className="lg:col-span-1">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile?.profileImageUrl} />
                <AvatarFallback className="text-2xl bg-primary text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-xl">
              {profile?.firstName} {profile?.lastName}
            </CardTitle>
            <CardDescription className="space-y-2">
              <Badge variant={getRoleBadgeVariant(profile?.role)}>
                {getRoleDisplayName(profile?.role)}
              </Badge>
              <div className="flex items-center justify-center text-sm text-muted-foreground">
                <Mail className="h-4 w-4 mr-2" />
                {profile?.email}
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground">Joined:</span>
                <span className="ml-auto">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
                </span>
              </div>
              {profile?.phone && (
                <div className="flex items-center text-sm">
                  <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="ml-auto">{profile.phone}</span>
                </div>
              )}
              <div className="flex items-center text-sm">
                <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-muted-foreground">Status:</span>
                <Badge variant={profile?.isActive ? "default" : "secondary"} className="ml-auto">
                  {profile?.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              {profile?.branchId && (
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Branch ID:</span>
                  <span className="ml-auto">{profile.branchId}</span>
                </div>
              )}
              {profile?.lastLogin && (
                <div className="flex items-center text-sm">
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Last Login:</span>
                  <span className="ml-auto text-xs">
                    {new Date(profile.lastLogin).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Update your personal details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    {...form.register("firstName")}
                    disabled={!isEditing}
                    className={!isEditing ? "bg-gray-50" : ""}
                  />
                  {form.formState.errors.firstName && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.firstName.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    {...form.register("lastName")}
                    disabled={!isEditing}
                    className={!isEditing ? "bg-gray-50" : ""}
                  />
                  {form.formState.errors.lastName && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.lastName.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register("email")}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  {...form.register("phone")}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                  placeholder="+1 (555) 123-4567"
                />
                {form.formState.errors.phone && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profileImageUrl">Profile Image URL (Optional)</Label>
                <Input
                  id="profileImageUrl"
                  {...form.register("profileImageUrl")}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                  placeholder="https://example.com/avatar.jpg"
                />
                {form.formState.errors.profileImageUrl && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.profileImageUrl.message}
                  </p>
                )}
              </div>

              {!isEditing && (
                <Alert>
                  <AlertDescription>
                    Click "Edit Profile" to modify your information. Some fields may be restricted based on your role.
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
        </main>
      </div>
    </div>
  );
}