import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit, SquareStack } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertRoomTypeSchema, type RoomType, type Branch } from "@shared/schema";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import { useAuth } from "@/hooks/useAuth";

const roomTypeFormSchema = insertRoomTypeSchema.extend({
  basePrice: z.string().min(1, "Base price is required"),
  branchId: z.number().nullable().optional(),
});

type RoomTypeFormData = z.infer<typeof roomTypeFormSchema>;

export default function RoomTypes() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null);
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();

  const { data: roomTypes, isLoading } = useQuery<RoomType[]>({
    queryKey: ["/api/room-types"],
    enabled: isAuthenticated,
  });

  const { data: branches } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: isAuthenticated,
  });

  const createMutation = useMutation({
    mutationFn: (data: RoomTypeFormData) =>
      apiRequest("/api/room-types", "POST", {
        ...data,
        basePrice: parseFloat(data.basePrice),
        branchId: data.branchId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-types"] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Room type created successfully" });
    },
    onError: (error: any) => {
      console.error("Create room type error:", error);
      const errorMessage = error?.message || "Failed to create room type";
      toast({ title: errorMessage, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: RoomTypeFormData }) =>
      apiRequest(`/api/room-types/${id}`, "PATCH", {
        ...data,
        basePrice: parseFloat(data.basePrice),
        branchId: data.branchId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/room-types"] });
      setEditingRoomType(null);
      form.reset();
      toast({ title: "Room type updated successfully" });
    },
    onError: (error: any) => {
      console.error("Update room type error:", error);
      const errorMessage = error?.message || "Failed to update room type";
      toast({ title: errorMessage, variant: "destructive" });
    },
  });

  const form = useForm<RoomTypeFormData>({
    resolver: zodResolver(roomTypeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      basePrice: "",
      maxOccupancy: 1,
      branchId: null,
    },
  });

  const onSubmit = (data: RoomTypeFormData) => {
    console.log("Form submitted with data:", data);
    if (editingRoomType) {
      console.log("Updating room type:", editingRoomType.id);
      updateMutation.mutate({ id: editingRoomType.id, data });
    } else {
      console.log("Creating new room type");
      createMutation.mutate(data);
    }
  };

  const handleEdit = (roomType: RoomType) => {
    setEditingRoomType(roomType);
    form.reset({
      name: roomType.name,
      description: roomType.description || "",
      basePrice: roomType.basePrice.toString(),
      maxOccupancy: roomType.maxOccupancy,
      branchId: roomType.branchId || null,
    });
  };

  const handleCloseDialog = () => {
    setIsCreateOpen(false);
    setEditingRoomType(null);
    form.reset({
      name: "",
      description: "",
      basePrice: "",
      maxOccupancy: 1,
      branchId: null,
    });
  };

  const getBranchName = (branchId: number | null) => {
    if (!branchId) return "All Branches";
    return branches?.find(b => b.id === branchId)?.name || "Unknown Branch";
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
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
    
    if (!authLoading && isAuthenticated && user && user.role !== "superadmin") {
      toast({
        title: "Access Denied",
        description: "Only superadmin can access room types management.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
      return;
    }
  }, [isAuthenticated, authLoading, user, toast]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-8">
        <Header
          title="Room Types"
          subtitle="Manage room categories and pricing"
          action={
            <Dialog open={isCreateOpen || !!editingRoomType} onOpenChange={handleCloseDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Room Type
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingRoomType ? "Edit Room Type" : "Create Room Type"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Standard Room" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Room description and amenities"
                              value={field.value || ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="basePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Price per Night</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="maxOccupancy"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Maximum Occupancy</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="branchId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Branch</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(value === "unassigned" ? null : parseInt(value))}
                            value={field.value ? field.value.toString() : "unassigned"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a branch" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="unassigned">
                                All Branches (Unassigned)
                              </SelectItem>
                              {branches?.map((branch) => (
                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                  {branch.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end space-x-2 pt-4">
                      <Button type="button" variant="outline" onClick={handleCloseDialog}>
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {editingRoomType ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="mt-8">
          {!roomTypes || roomTypes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <SquareStack className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No room types found</h3>
                <p className="text-gray-600 text-center mb-4">
                  Create your first room type to start managing rooms
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Room Type
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roomTypes.map((roomType) => (
                <Card key={roomType.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{roomType.name}</CardTitle>
                        <Badge variant="secondary" className="mt-1">
                          {getBranchName(roomType.branchId)}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(roomType)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {roomType.description && (
                        <p className="text-sm text-gray-600">{roomType.description}</p>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Base Price:</span>
                        <span className="text-lg font-bold text-primary">
                          ${roomType.basePrice}/night
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Max Occupancy:</span>
                        <span className="text-sm">{roomType.maxOccupancy} guests</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}