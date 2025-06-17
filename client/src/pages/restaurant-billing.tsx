import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Eye, Download, Receipt, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const checkoutSchema = z.object({
  paymentMethod: z.enum(["cash", "card", "upi", "online"]),
  discountAmount: z.number().min(0).optional(),
  discountPercentage: z.number().min(0).max(100).optional(),
  serviceChargePercentage: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function RestaurantBilling() {
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [viewingBill, setViewingBill] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: bills, isLoading } = useQuery({
    queryKey: ['/api/restaurant/bills'],
  });

  const { data: orders } = useQuery({
    queryKey: ['/api/restaurant/orders'],
  });

  const { data: tables } = useQuery({
    queryKey: ['/api/restaurant/tables'],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (data: CheckoutFormData & { orderId: string }) => {
      // Get order details to calculate amounts
      const order = orders?.find((o: any) => o.id === data.orderId);
      if (!order) throw new Error('Order not found');

      const subtotal = parseFloat(order.subtotal || order.totalAmount || "0");
      const discountAmount = data.discountAmount || 0;
      const discountPercentage = data.discountPercentage || 0;
      const serviceChargePercentage = data.serviceChargePercentage || 10;

      // Calculate discount
      const finalDiscountAmount = discountPercentage > 0 
        ? (subtotal * discountPercentage / 100)
        : discountAmount;

      // Calculate amounts
      const afterDiscount = subtotal - finalDiscountAmount;
      const serviceChargeAmount = afterDiscount * serviceChargePercentage / 100;
      const taxAmount = (afterDiscount + serviceChargeAmount) * 0.13; // 13% VAT
      const totalAmount = afterDiscount + serviceChargeAmount + taxAmount;

      const billData = {
        orderId: data.orderId,
        tableId: order.tableId,
        branchId: order.branchId,
        customerName: data.customerName || "",
        customerPhone: data.customerPhone || "",
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        taxPercentage: "13",
        discountAmount: finalDiscountAmount.toString(),
        discountPercentage: (data.discountPercentage || 0).toString(),
        serviceChargeAmount: serviceChargeAmount.toString(),
        serviceChargePercentage: serviceChargePercentage.toString(),
        totalAmount: totalAmount.toString(),
        paidAmount: totalAmount.toString(),
        changeAmount: "0",
        paymentStatus: "paid",
        paymentMethod: data.paymentMethod,
        notes: data.notes || "",
      };

      // Create bill
      const billResponse = await fetch('/api/restaurant/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billData),
      });
      if (!billResponse.ok) {
        const errorData = await billResponse.json();
        throw new Error(errorData.message || 'Failed to create bill');
      }

      // Update order status to completed
      const orderResponse = await fetch(`/api/restaurant/orders/${data.orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });
      if (!orderResponse.ok) {
        throw new Error('Failed to complete order');
      }

      return billResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/bills'] });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant/tables'] });
      setIsCheckoutModalOpen(false);
      setSelectedOrder(null);
      resetForm();
      toast({ title: "Checkout completed successfully", description: "Table is now available for new orders." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to checkout", 
        description: error.message,
        variant: "destructive"
      });
    },
  });

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: "cash",
      discountAmount: 0,
      discountPercentage: 0,
      serviceChargePercentage: 10,
      notes: "",
      customerName: "",
      customerPhone: "",
    },
  });

  const resetForm = () => {
    form.reset({
      paymentMethod: "cash",
      discountAmount: 0,
      discountPercentage: 0,
      serviceChargePercentage: 10,
      notes: "",
      customerName: "",
      customerPhone: "",
    });
  };

  const onSubmit = (data: CheckoutFormData) => {
    if (!selectedOrder) return;
    checkoutMutation.mutate({ ...data, orderId: selectedOrder.id });
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

  const getServedOrders = () => {
    if (!orders || !bills) return [];

    // Get orders that are served and don't have bills yet
    return orders.filter((order: any) => 
      order.status === 'served' && 
      !bills.some((bill: any) => bill.orderId === order.id)
    );
  };

  const getTableName = (tableId: number) => {
    const table = tables?.find((t: any) => t.id === tableId);
    return table ? table.name : `Table ${tableId}`;
  };

  const calculateBillPreview = () => {
    const discountAmount = form.watch('discountAmount') || 0;
    const discountPercentage = form.watch('discountPercentage') || 0;
    const serviceChargePercentage = form.watch('serviceChargePercentage') || 10;

    if (!selectedOrder) return null;

    const subtotal = parseFloat(selectedOrder.subtotal || selectedOrder.totalAmount || "0");
    const finalDiscountAmount = discountPercentage > 0 
      ? (subtotal * discountPercentage / 100)
      : discountAmount;

    const afterDiscount = subtotal - finalDiscountAmount;
    const serviceChargeAmount = afterDiscount * serviceChargePercentage / 100;
    const taxAmount = (afterDiscount + serviceChargeAmount) * 0.13;
    const totalAmount = afterDiscount + serviceChargeAmount + taxAmount;

    return {
      subtotal,
      discountAmount: finalDiscountAmount,
      serviceChargeAmount,
      taxAmount,
      totalAmount,
    };
  };

  const billPreview = calculateBillPreview();

  const handleCheckout = (order: any) => {
    setSelectedOrder(order);
    setIsCheckoutModalOpen(true);
    resetForm();
  };

  const generateInvoice = (bill: any) => {
    // Simple invoice generation - in a real app, this would generate a PDF
    const invoiceData = {
      billNumber: bill.billNumber,
      date: new Date(bill.createdAt).toLocaleDateString(),
      orderNumber: bill.order?.orderNumber,
      tableName: getTableName(bill.tableId),
      customerName: bill.customerName,
      customerPhone: bill.customerPhone,
      items: bill.order?.items || [],
      subtotal: bill.subtotal,
      discountAmount: bill.discountAmount,
      serviceChargeAmount: bill.serviceChargeAmount,
      taxAmount: bill.taxAmount,
      totalAmount: bill.totalAmount,
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
          {/* Orders Ready for Checkout */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Orders Ready for Checkout</CardTitle>
            </CardHeader>
            <CardContent>
              {getServedOrders().length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getServedOrders().map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                        <TableCell>{getTableName(order.tableId)}</TableCell>
                        <TableCell>{order.items?.length || 0} items</TableCell>
                        <TableCell>Rs. {order.totalAmount}</TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleCheckout(order)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Checkout
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No orders ready for checkout. Orders must be served before checkout.
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Bills */}
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
                      <TableHead>Customer</TableHead>
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
                          <TableCell>#{bill.order?.orderNumber || 'N/A'}</TableCell>
                          <TableCell>{getTableName(bill.tableId)}</TableCell>
                          <TableCell>{bill.customerName || 'Guest'}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Badge className={`${getPaymentMethodColor(bill.paymentMethod)} text-white`}>
                                {bill.paymentMethod}
                              </Badge>
                              <Badge variant="default">
                                paid
                              </Badge>
                            </div>
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
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No bills found. Complete orders to generate bills automatically.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Checkout Modal */}
          <Dialog open={isCheckoutModalOpen} onOpenChange={setIsCheckoutModalOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  <Receipt className="mr-2 h-5 w-5 inline" />
                  Checkout Order #{selectedOrder?.orderNumber}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Customer name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="customerPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Phone (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Customer phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                      name="serviceChargePercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Charge (%)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              step="0.1"
                              min="0"
                              max="100"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="discountPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount (%)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              step="0.1"
                              min="0"
                              max="100"
                              onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="discountAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Discount Amount (Rs.)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              step="0.01"
                              min="0"
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
                        <FormItem className="md:col-span-2">
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Additional notes..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Order Items Preview */}
                  {selectedOrder?.items && (
                    <div>
                      <h3 className="font-semibold mb-2">Order Items</h3>
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
                            {selectedOrder.items.map((item: any) => (
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
                  )}

                  {/* Bill Preview */}
                  {billPreview && (
                    <div className="border rounded-lg p-4 bg-gray-50">
                      <h3 className="font-semibold mb-3">Bill Preview</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>Rs. {billPreview.subtotal.toFixed(2)}</span>
                        </div>
                        {billPreview.discountAmount > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount:</span>
                            <span>- Rs. {billPreview.discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Service Charge:</span>
                          <span>Rs. {billPreview.serviceChargeAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax (13%):</span>
                          <span>Rs. {billPreview.taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                          <span>Total Amount:</span>
                          <span>Rs. {billPreview.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsCheckoutModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={checkoutMutation.isPending}>
                      {checkoutMutation.isPending ? "Processing..." : "Complete Checkout"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

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
                      <p className="font-medium">#{viewingBill.order?.orderNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Table:</span>
                      <p className="font-medium">{getTableName(viewingBill.tableId)}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Customer:</span>
                      <p className="font-medium">{viewingBill.customerName || 'Guest'}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Phone:</span>
                      <p className="font-medium">{viewingBill.customerPhone || 'N/A'}</p>
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

                  {viewingBill.order?.items && (
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
                            {viewingBill.order.items.map((item: any) => (
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
                  )}

                  <div className="border-t pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>Rs. {viewingBill.subtotal}</span>
                      </div>
                      {parseFloat(viewingBill.discountAmount) > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount:</span>
                          <span>- Rs. {viewingBill.discountAmount}</span>
                        </div>
                      )}
                      {parseFloat(viewingBill.serviceChargeAmount) > 0 && (
                        <div className="flex justify-between">
                          <span>Service Charge:</span>
                          <span>Rs. {viewingBill.serviceChargeAmount}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Tax (13%):</span>
                        <span>Rs. {viewingBill.taxAmount}</span>
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