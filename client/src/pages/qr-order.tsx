import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, ShoppingCart, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrderItem {
  dishId: number;
  name: string;
  price: string;
  quantity: number;
  specialInstructions?: string;
}

interface MenuDish {
  id: number;
  name: string;
  price: string;
  description?: string;
  categoryId: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  spiceLevel?: string;
}

interface MenuCategory {
  id: number;
  name: string;
}

interface LocationInfo {
  type: 'table' | 'room';
  id: number;
  branchId: number;
  name: string;
}

export default function QROrderPage() {
  const [location] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [dishes, setDishes] = useState<MenuDish[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  const token = location.split('/').pop();

  useEffect(() => {
    if (token) {
      fetchOrderInfo();
    }
  }, [token]);

  const fetchOrderInfo = async () => {
    try {
      const response = await fetch(`/api/order/info/${token}`);
      if (!response.ok) {
        throw new Error('Invalid QR code');
      }
      const data = await response.json();
      setLocationInfo(data.location);
      setCategories(data.menu.categories);
      setDishes(data.menu.dishes);
    } catch (error) {
      toast({
        title: "Error",
        description: "Invalid QR code or expired link",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (dish: MenuDish) => {
    const existingItem = cart.find(item => item.dishId === dish.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.dishId === dish.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        dishId: dish.id,
        name: dish.name,
        price: dish.price,
        quantity: 1
      }]);
    }
  };

  const updateQuantity = (dishId: number, quantity: number) => {
    if (quantity === 0) {
      setCart(cart.filter(item => item.dishId !== dishId));
    } else {
      setCart(cart.map(item => 
        item.dishId === dishId 
          ? { ...item, quantity }
          : item
      ));
    }
  };

  const getTotal = () => {
    return cart.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
  };

  const submitOrder = async () => {
    if (!customerName || !customerPhone) {
      toast({
        title: "Error",
        description: "Please enter your name and phone number",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Please add items to your cart",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/order/submit/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            dishId: item.dishId,
            quantity: item.quantity,
            specialInstructions: item.specialInstructions
          })),
          customerName,
          customerPhone,
          notes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit order');
      }

      const data = await response.json();
      setOrderNumber(data.orderNumber);
      setOrderComplete(true);
      
      toast({
        title: "Order Placed!",
        description: `Your order ${data.orderNumber} has been placed successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Order Placed!</h2>
            <p className="text-gray-600 mb-4">
              Your order <strong>{orderNumber}</strong> has been placed successfully.
            </p>
            <p className="text-sm text-gray-500">
              Our staff will prepare your order and deliver it to {locationInfo?.name}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!locationInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <h2 className="text-xl font-bold text-red-600 mb-2">Invalid QR Code</h2>
            <p className="text-gray-600">This QR code is invalid or has expired.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const groupedDishes = categories.map(category => ({
    ...category,
    dishes: dishes.filter(dish => dish.categoryId === category.id)
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-10 bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto p-4">
          <h1 className="text-xl font-bold">Order from {locationInfo.name}</h1>
          <p className="text-gray-600">Browse menu and place your order</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 grid md:grid-cols-3 gap-6">
        {/* Menu Section */}
        <div className="md:col-span-2 space-y-6">
          {groupedDishes.map(category => (
            <div key={category.id}>
              <h2 className="text-lg font-semibold mb-3">{category.name}</h2>
              <div className="grid gap-3">
                {category.dishes.map(dish => (
                  <Card key={dish.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium">{dish.name}</h3>
                        {dish.description && (
                          <p className="text-sm text-gray-600 mt-1">{dish.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <span className="font-semibold">₹{dish.price}</span>
                          {dish.isVegetarian && <Badge variant="outline" className="text-green-600">Veg</Badge>}
                          {dish.isVegan && <Badge variant="outline" className="text-green-700">Vegan</Badge>}
                          {dish.spiceLevel && (
                            <Badge variant="outline" className="text-red-600">
                              {dish.spiceLevel}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button onClick={() => addToCart(dish)} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Cart & Customer Info Section */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle>Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Your phone number"
                />
              </div>
              <div>
                <Label htmlFor="notes">Special Instructions</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Cart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Your Order ({cart.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No items in cart</p>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.dishId} className="flex justify-between items-center">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-sm text-gray-600">₹{item.price} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateQuantity(item.dishId, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateQuantity(item.dishId, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center font-semibold">
                    <span>Total:</span>
                    <span>₹{getTotal().toFixed(2)}</span>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={submitOrder}
                    disabled={submitting || cart.length === 0}
                  >
                    {submitting ? "Placing Order..." : "Place Order"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}