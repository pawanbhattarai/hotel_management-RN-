
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";

const tableSchema = z.object({
  name: z.string().min(1, "Table name is required"),
  capacity: z.number().min(1, "Capacity must be at least 1"),
  branchId: z.number(),
  status: z.enum(["open", "occupied", "maintenance"]).optional(),
});

type TableFormData = z.infer<typeof tableSchema>;

export default function RestaurantTables() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  const { toast } = useToast();

  const { data: tables, isLoading } = useQuery({
    queryKey: ['/api/restaurant/tables'],
  });

  const { data: branches } = useQuery({
    queryKey: ['/api/branches'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: TableFormData) => {
      const response = await fetch('/api/restaurant/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create table');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/tables'] });
      setIsDialogOpen(false);
      toast({ title: "Table created successfully" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TableFormData> }) => {
      const response = await fetch(`/api/restaurant/tables/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update table');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/tables'] });
      setIsDialogOpen(false);
      setEditingTable(null);
      toast({ title: "Table updated successfully" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/restaurant/tables/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete table');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/tables'] });
      toast({ title: "Table deleted successfully" });
    },
  });

  const form = useForm<TableFormData>({
    resolver: zodResolver(tableSchema),
    defaultValues: {
      name: "",
      capacity: 1,
      status: "open",
    },
  });

  const onSubmit = (data: TableFormData) => {
    if (editingTable) {
      updateMutation.mutate({ id: editingTable.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (table: any) => {
    setEditingTable(table);
    form.reset({
      name: table.name,
      capacity: table.capacity,
      branchId: table.branchId,
      status: table.status,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this table?')) {
      deleteMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500';
      case 'occupied': return 'bg-red-500';
      case 'maintenance': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  if (isLoading) return <div>Loading tables...</div>;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 lg:ml-64">
        <Header />
        <main className="p-4 lg:p-6 xl:p-8">
          <div className="max-w-7xl mx-auto space-y-4 lg:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h1 className="text-2xl lg:text-3xl font-bold">Restaurant Tables</h1>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="w-full sm:w-auto"
                    onClick={() => {
                      setEditingTable(null);
                      form.reset();
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Table
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-md mx-auto">
                  <DialogHeader>
                    <DialogTitle>{editingTable ? 'Edit Table' : 'Add New Table'}</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Table Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Table 1" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="capacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Capacity</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                min={1}
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
                            <FormControl>
                              <Select 
                                value={field.value?.toString()} 
                                onValueChange={(value) => field.onChange(parseInt(value))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select branch" />
                                </SelectTrigger>
                                <SelectContent>
                                  {branches?.map((branch: any) => (
                                    <SelectItem key={branch.id} value={branch.id.toString()}>
                                      {branch.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status</FormLabel>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="open">Open</SelectItem>
                                  <SelectItem value="occupied">Occupied</SelectItem>
                                  <SelectItem value="maintenance">Maintenance</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex flex-col sm:flex-row justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                          {editingTable ? 'Update' : 'Create'} Table
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tables?.map((table: any) => (
                <Card key={table.id} className="relative">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base lg:text-lg truncate">{table.name}</CardTitle>
                      <div className="flex space-x-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(table)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(table.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Capacity:</span>
                        <span className="font-medium text-sm">{table.capacity} people</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Status:</span>
                        <Badge className={`${getStatusColor(table.status)} text-white text-xs`}>
                          {table.status}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
