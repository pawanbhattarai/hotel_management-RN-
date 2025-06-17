import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Eye, Download, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import { useAuth } from "@/hooks/useAuth";

const billSchema = z.object({
  orderId: z.string(),
  branchId: z.number(),
  paymentMethod: z.enum(["cash", "card", "upi", "online"]),
  discount: z.number().optional(),
  notes: z.string().optional(),
});

type BillFormData = z.infer<typeof billSchema>;

export default function RestaurantBilling() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewingBill, setViewingBill] = useState<any>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: bills, isLoading } = useQuery({
    queryKey: ['/api/restaurant/bills'],
  });

  const { data: orders } = useQuery({
    queryKey: ['/api/restaurant/orders'],
  });

  const { data: branches } = useQuery({
    queryKey: ['/api/branches'],
  });

  const createBillMutation = useMutation({
    mutationFn: async (data: BillFormData) => {
      // Get order details to calculate amounts
      const order = orders?.find((o: any) => o.id === data.orderId);
      if (!order) throw new Error('Order not found');

      const subtotal = parseFloat(order.subtotal);
      const discount = data.discount || 0;
      const tax = (subtotal - discount) * 0.1; // 10% tax
      const totalAmount = subtotal - discount + tax;

      const billData = {
        ...data,
        subtotal: order.subtotal,
        totalAmount: totalAmount.toString(),
        tax: tax.toString(),
        discount: discount.toString(),
        status: "paid",
      };

      const response = await fetch('/api/restaurant/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billData),
      });
      if (!response.ok) throw new Error('Failed to create bill');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/bills'] });
      setIsDialogOpen(false);
      resetForm();
      toast({ title: "Bill created successfully" });
    },
  });

  const updateBillMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BillFormData> }) => {
      const response = await fetch(`/api/restaurant/bills/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update bill');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/bills'] });
      toast({ title: "Bill updated successfully" });
    },
  });

  const form = useForm<BillFormData>({
    resolver: zodResolver(billSchema),
    defaultValues: {
      paymentMethod: "cash",
      discount: 0,
      notes: "",
      branchId: user?.role !== "superadmin" ? user?.branchId : undefined,
    },
  });

  const resetForm = () => {
    form.reset({
      paymentMethod: "cash",
      discount: 0,
      notes: "",
      branchId: user?.role !== "superadmin" ? user?.branchId : undefined,
    });
  };

  const onSubmit = (data: BillFormData) => {
    createBillMutation.mutate(data);
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return 'bg-green-500';
      case 'card': return 'bg-blue-500';
      case 'upi': return 'bg-purple-500';
      case 'online': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getPaidOrders = () => {
    return orders?.filter((order: any) => 
      order.status === 'completed' && 
      !bills?.some((bill: any) => bill.orderId === order.id)
    ) || [];
  };

  const generateInvoice = (bill: any) => {
    // Simple invoice generation - in a real app, this would generate a PDF
    const invoiceData = {
      billNumber: bill.billNumber,
      date: new Date(bill.createdAt).toLocaleDateString(),
      orderNumber: bill.order?.orderNumber,
      tableName: bill.table?.name,
      items: bill.order?.items || [],
      subtotal: bill.subtotal,
      discount: bill.discount,
      tax: bill.tax,
      total: bill.totalAmount,
      paymentMethod: bill.paymentMethod,
    };

    console.log('Invoice Data:', invoiceData);
    toast({ title: "Invoice generated", description: "Check console for invoice data" });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        isMobileMenuOpen={isMobileSidebarOpen}
        setIsMobileMenuOpen={setIsMobileSidebarOpen}
      />
      <div className="main-content">
        <Header
          title="Restaurant Billing"
          subtitle="Manage restaurant bills and payments"
          onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />
        <main className="p-6">
          {/* Add Button Section */}
          <div className="mb-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={resetForm}
                  className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Bill
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create New Bill</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="orderId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Order</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select order to bill" />
                              </SelectTrigger>
                              <SelectContent>
                                {getPaidOrders().map((order: any) => (
                                  <SelectItem key={order.id} value={order.id}>
                                    Order #{order.orderNumber} - {order.table?.name} (Rs. {order.totalAmount})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     {user?.role === "superadmin" && (
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
                      )}
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cash">Cash</SelectItem>
                                <SelectItem value="card">Card</SelectItem>
                                <SelectItem value="upi">UPI</SelectItem>
                                <SelectItem value="online">Online</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="discount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount (Rs.)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              step="0.01"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Additional notes..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createBillMutation.isPending}>
                        Create Bill
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>All Bills</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Order #</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills?.length ? (
                      bills.map((bill: any) => (
                        <TableRow key={bill.id}>
                          <TableCell className="font-medium">#{bill.billNumber}</TableCell>
                          <TableCell>#{bill.order?.orderNumber}</TableCell>
                          <TableCell>{bill.table?.name}</TableCell>
                          <TableCell>
                            <Badge className={`${getPaymentMethodColor(bill.paymentMethod)} text-white`}>
                              {bill.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell>Rs. {bill.totalAmount}</TableCell>
                          <TableCell>{new Date(bill.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingBill(bill)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateInvoice(bill)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No bills found. Create your first bill to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* View Bill Modal */}
          {viewingBill && (
            <Dialog open={!!viewingBill} onOpenChange={() => setViewingBill(null)}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center">
                    <Receipt className="mr-2 h-5 w-5" />
                    Bill Details - #{viewingBill.billNumber}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Order Number:</span>
                      <p className="font-medium">#{viewingBill.order?.orderNumber}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Table:</span>
                      <p className="font-medium">{viewingBill.table?.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Payment Method:</span>
                      <Badge className={`${getPaymentMethodColor(viewingBill.paymentMethod)} text-white ml-2`}>
                        {viewingBill.paymentMethod}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Date:</span>
                      <p className="font-medium text-sm">{new Date(viewingBill.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Order Items</h3>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewingBill.order?.items?.map((item: any) => (
                            <TableRow key={item.id}>
                              <TableCell className="font-medium">{item.dish?.name}</TableCell>
                              <TableCell>Rs. {item.unitPrice}</TableCell>
                              <TableCell>{item.quantity}</TableCell>
                              <TableCell>Rs. {(parseFloat(item.unitPrice) * item.quantity).toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>Rs. {viewingBill.subtotal}</span>
                      </div>
                      {parseFloat(viewingBill.discount) > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount:</span>
                          <span>- Rs. {viewingBill.discount}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Tax (10%):</span>
                        <span>Rs. {viewingBill.tax}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total Amount:</span>
                        <span>Rs. {viewingBill.totalAmount}</span>
                      </div>
                    </div>
                  </div>

                  {viewingBill.notes && (
                    <div>
                      <span className="text-sm text-muted-foreground">Notes:</span>
                      <p className="font-medium">{viewingBill.notes}</p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button onClick={() => generateInvoice(viewingBill)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Invoice
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </main>
      </div>
    </div>
  );
}