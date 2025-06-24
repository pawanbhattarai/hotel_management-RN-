import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, ShoppingCart, CheckCircle, Search, Clock, Facebook, Instagram, Youtube, ExternalLink } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  preparationTime?: number;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [hotelSettings, setHotelSettings] = useState<any>({});
  const [existingOrderId, setExistingOrderId] = useState<string | null>(null);
  const [orderStatus, setOrderStatus] = useState<string>('');
  const [orderCreatedAt, setOrderCreatedAt] = useState<Date | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [canModifyOrder, setCanModifyOrder] = useState(true);
  const [locationInfo, setLocationInfo] = useState<LocationInfo | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [dishes, setDishes] = useState<MenuDish[]>([]);
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Extract token from URL path like /order/token or /qr-order/token
  const token = location.startsWith('/order/') 
    ? location.replace('/order/', '')
    : location.replace('/qr-order/', '');

  console.log('QR Order Page - Location:', location);
  console.log('QR Order Page - Token:', token);

  useEffect(() => {
    if (token) {
      fetchOrderInfo();
      // Check for existing order every 30 seconds
      const interval = setInterval(checkExistingOrder, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  useEffect(() => {
    if (existingOrderId && orderCreatedAt) {
      const interval = setInterval(() => {
        const now = new Date();
        const diffInMinutes = (now.getTime() - orderCreatedAt.getTime()) / (1000 * 60);
        setCanModifyOrder(diffInMinutes <= 2);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [existingOrderId, orderCreatedAt]);

  useEffect(() => {
    calculateEstimatedTime();
  }, [cart, dishes]);

  const fetchOrderInfo = async () => {
    try {
      console.log('🔍 QR Order - Fetching order info for token:', token);
      
      if (!token || token.length < 10) {
        throw new Error('Invalid or missing QR token');
      }

      const response = await fetch(`/api/order/info/${token}`);
      
      console.log('📡 QR Order - Response status:', response.status);
      console.log('📡 QR Order - Response ok:', response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ QR Order - API Error:', response.status, errorText);
        
        if (response.status === 404) {
          throw new Error('QR code not found. Please check if the QR code is valid.');
        } else if (response.status === 500) {
          throw new Error('Server error. Please try again later.');
        } else {
          throw new Error(`Failed to load menu: ${response.status}`);
        }
      }
      
      const data = await response.json();
      console.log('✅ QR Order - Order info data:', data);
      
      if (!data.location) {
        throw new Error('Invalid QR code - no location information found');
      }

      if (!data.menu || !data.menu.categories || !data.menu.dishes) {
        console.warn('⚠️ QR Order - Menu data incomplete:', data.menu);
      }
      
      setLocationInfo(data.location);
      setCategories(data.menu.categories || []);
      setDishes(data.menu.dishes || []);
      
      console.log(`📍 QR Order - Location: ${data.location.type} ${data.location.name}`);
      console.log(`🍽️ QR Order - Menu: ${data.menu.categories?.length || 0} categories, ${data.menu.dishes?.length || 0} dishes`);
      
      // Fetch hotel settings for company information
      try {
        const settingsResponse = await fetch('/api/hotel-settings');
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setHotelSettings(settingsData);
        }
      } catch (error) {
        console.error('Failed to fetch hotel settings:', error);
      }
      
      // Check for existing order
      await checkExistingOrder();
    } catch (error) {
      console.error('❌ QR Order - Error fetching order info:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load menu. Please try scanning the QR code again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkExistingOrder = async () => {
    try {
      const response = await fetch(`/api/order/existing/${token}`);
      if (response.ok) {
        const orderData = await response.json();
        setExistingOrderId(orderData.id);
        setOrderNumber(orderData.orderNumber);
        setOrderStatus(orderData.status);
        setOrderCreatedAt(new Date(orderData.createdAt));
        setCustomerName(orderData.customerName || '');
        setCustomerPhone(orderData.customerPhone || '');
        setNotes(orderData.notes || '');
        
        // Load existing order items into cart
        if (orderData.items) {
          const existingItems = orderData.items.map((item: any) => {
            const dish = dishes.find(d => d.id === item.dishId);
            return {
              dishId: item.dishId,
              name: dish?.name || item.dish?.name || 'Unknown',
              price: item.unitPrice,
              quantity: item.quantity,
              specialInstructions: item.specialInstructions
            };
          });
          setCart(existingItems);
        }
      }
    } catch (error) {
      // No existing order found, that's fine
    }
  };

  const calculateEstimatedTime = () => {
    let totalTime = 0;
    cart.forEach(item => {
      const dish = dishes.find(d => d.id === item.dishId);
      if (dish && dish.preparationTime) {
        totalTime = Math.max(totalTime, dish.preparationTime * item.quantity);
      }
    });
    setEstimatedTime(totalTime);
  };

  const addToCart = (dish: MenuDish) => {
    if (!canModifyOrder && existingOrderId) {
      toast({
        title: "Cannot Modify Order",
        description: "Order can only be modified within 2 minutes of placement",
        variant: "destructive",
      });
      return;
    }

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
    if (!canModifyOrder && existingOrderId) {
      toast({
        title: "Cannot Modify Order",
        description: "Order can only be modified within 2 minutes of placement",
        variant: "destructive",
      });
      return;
    }

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

  // Filter dishes based on search query
  const filteredDishes = dishes.filter(dish => 
    dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    dish.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    categories.find(cat => cat.id === dish.categoryId)?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      const endpoint = existingOrderId 
        ? `/api/order/update/${existingOrderId}` 
        : `/api/order/submit/${token}`;
      
      const response = await fetch(endpoint, {
        method: existingOrderId ? 'PUT' : 'POST',
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
      setExistingOrderId(data.orderId);
      setOrderCreatedAt(new Date());
      
      toast({
        title: existingOrderId ? "Order Updated!" : "Order Placed!",
        description: `Your order ${data.orderNumber} has been ${existingOrderId ? 'updated' : 'placed'} successfully`,
      });
      
      // Refresh order status
      await checkExistingOrder();
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

  const clearTable = async () => {
    try {
      const response = await fetch(`/api/order/clear/${token}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        // Reset all state
        setExistingOrderId(null);
        setOrderNumber('');
        setOrderStatus('');
        setOrderCreatedAt(null);
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setNotes('');
        setOrderComplete(false);
        
        toast({
          title: "Table Cleared",
          description: "Table is now available for new orders",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear table",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'confirmed': return 'bg-blue-500';
      case 'preparing': return 'bg-orange-500';
      case 'ready': return 'bg-green-500';
      case 'served': return 'bg-gray-500';
      case 'completed': return 'bg-green-600';
      default: return 'bg-gray-400';
    }
  };

  const getTimeRemaining = () => {
    if (!orderCreatedAt) return null;
    const now = new Date();
    const diffInMinutes = (now.getTime() - orderCreatedAt.getTime()) / (1000 * 60);
    const remaining = Math.max(0, 2 - diffInMinutes);
    return remaining;
  };

  const getFilteredDishes = () => {
    let filtered = dishes;
    
    // Filter by category first
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(dish => dish.categoryId === parseInt(selectedCategory));
    }
    
    // Then filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(dish => 
        dish.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dish.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        categories.find(cat => cat.id === dish.categoryId)?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
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

  

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-0 min-h-screen">
        {/* Menu Section - Left Side */}
        <div className="lg:col-span-2 bg-white p-6 overflow-y-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">Menu Items</h1>
            </div>
            
            {/* Search Bar */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search dishes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
                className="whitespace-nowrap"
              >
                All Items
              </Button>
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id.toString() ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id.toString())}
                  className="whitespace-nowrap"
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {getFilteredDishes().map(dish => (
              <div key={dish.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex-1">
                  <h3 className="font-medium text-lg">{dish.name}</h3>
                  <p className="text-green-600 font-semibold text-lg mt-1">Rs. {dish.price}</p>
                  {dish.description && (
                    <p className="text-sm text-gray-600 mt-1">{dish.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="text-xs">
                      {categories.find(cat => cat.id === dish.categoryId)?.name}
                    </Badge>
                    {dish.preparationTime && (
                      <Badge variant="outline" className="text-blue-600 text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {dish.preparationTime} min
                      </Badge>
                    )}
                    {dish.isVegetarian && <Badge variant="outline" className="text-green-600 text-xs">Veg</Badge>}
                    {dish.isVegan && <Badge variant="outline" className="text-green-700 text-xs">Vegan</Badge>}
                    {dish.spiceLevel && (
                      <Badge variant="outline" className="text-red-600 text-xs">
                        {dish.spiceLevel}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button 
                  onClick={() => addToCart(dish)} 
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {getFilteredDishes().length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No dishes found in this category</p>
              </div>
            )}
          </div>
        </div>

        {/* Order Summary - Right Side */}
        <div className="bg-gray-100 p-6 border-l">
          <div className="sticky top-6">
            <div className="flex items-center gap-2 mb-6">
              <ShoppingCart className="h-5 w-5" />
              <h2 className="text-xl font-bold">Order Summary</h2>
              {cart.length > 0 && (
                <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">
                  {cart.length}
                </span>
              )}
            </div>

            {/* Existing Order Status */}
            {existingOrderId && (
              <div className="bg-white p-4 rounded-lg mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Order #{orderNumber}</h3>
                  <span className={`px-2 py-1 rounded text-white text-xs ${getStatusColor(orderStatus)}`}>
                    {orderStatus.toUpperCase()}
                  </span>
                </div>
                {estimatedTime > 0 && (
                  <p className="text-sm text-gray-600 mb-2">
                    Estimated preparation: {estimatedTime} minutes
                  </p>
                )}
                {!canModifyOrder && (
                  <p className="text-red-600 text-xs">
                    Order modification time expired
                  </p>
                )}
                {canModifyOrder && getTimeRemaining() !== null && (
                  <p className="text-orange-600 text-xs">
                    {Math.ceil(getTimeRemaining()!)} minutes left to modify
                  </p>
                )}
                {orderStatus === 'completed' && (
                  <Button
                    onClick={clearTable}
                    className="w-full mt-2 bg-green-600 hover:bg-green-700"
                    size="sm"
                  >
                    Clear Table & New Order
                  </Button>
                )}
              </div>
            )}

            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No items in cart</p>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.dishId} className="bg-white p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-gray-600">Rs. {item.price} each</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateQuantity(item.dishId, 0)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        ×
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateQuantity(item.dishId, item.quantity - 1)}
                          className="w-8 h-8 p-0"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateQuantity(item.dishId, item.quantity + 1)}
                          className="w-8 h-8 p-0"
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="bg-white p-4 rounded-lg space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>Rs. {getTotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span>Rs. 0.00</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>Rs. {getTotal().toFixed(2)}</span>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-white p-4 rounded-lg space-y-4">
                  <h3 className="font-semibold">Customer Details</h3>
                  <div>
                    <Label htmlFor="name" className="text-sm">Name</Label>
                    <Input
                      id="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-sm">Phone Number</Label>
                    <Input
                      id="phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Your phone number"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Order Notes */}
                <div className="bg-white p-4 rounded-lg">
                  <Label htmlFor="notes" className="text-sm font-semibold">Order Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Special instructions..."
                    rows={3}
                    className="mt-2"
                  />
                </div>

                <Button 
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 text-lg font-semibold rounded-lg"
                  onClick={submitOrder}
                  disabled={submitting || cart.length === 0 || (!canModifyOrder && existingOrderId && orderStatus !== 'pending')}
                >
                  {submitting 
                    ? (existingOrderId ? "Updating Order..." : "Creating Order...")
                    : (existingOrderId ? "Update Order" : "Create Order")
                  }
                </Button>
              </div>
            )}

            {/* More Section with Company Information */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-lg mb-4">More</h3>
              
              {/* Company Information */}
              {hotelSettings && Object.keys(hotelSettings).length > 0 && (
                <div className="bg-white p-4 rounded-lg mb-4">
                  <h4 className="font-medium mb-2">About Us</h4>
                  {hotelSettings.hotelName && (
                    <p className="text-sm text-gray-600 mb-1">{hotelSettings.hotelName}</p>
                  )}
                  {hotelSettings.address && (
                    <p className="text-xs text-gray-500 mb-1">{hotelSettings.address}</p>
                  )}
                  {hotelSettings.phone && (
                    <p className="text-xs text-gray-500 mb-1">Phone: {hotelSettings.phone}</p>
                  )}
                  {hotelSettings.email && (
                    <p className="text-xs text-gray-500">Email: {hotelSettings.email}</p>
                  )}
                </div>
              )}

              {/* Follow Us Section with Social Media */}
              {(hotelSettings.facebookUrl || hotelSettings.instagramUrl || hotelSettings.tiktokUrl || hotelSettings.youtubeUrl) && (
                <div className="bg-white p-4 rounded-lg mb-4">
                  <h4 className="font-medium mb-3">Follow Us</h4>
                  <div className="flex flex-wrap gap-3">
                    {hotelSettings.facebookUrl && (
                      <a 
                        href={hotelSettings.facebookUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <Facebook className="h-4 w-4" />
                        Facebook
                      </a>
                    )}
                    {hotelSettings.instagramUrl && (
                      <a 
                        href={hotelSettings.instagramUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-pink-600 hover:text-pink-800 text-sm"
                      >
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </a>
                    )}
                    {hotelSettings.youtubeUrl && (
                      <a 
                        href={hotelSettings.youtubeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-red-600 hover:text-red-800 text-sm"
                      >
                        <Youtube className="h-4 w-4" />
                        YouTube
                      </a>
                    )}
                    {hotelSettings.tiktokUrl && (
                      <a 
                        href={hotelSettings.tiktokUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-gray-800 hover:text-black text-sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        TikTok
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Copyright Section */}
              <div className="bg-white p-4 rounded-lg text-center">
                <p className="text-xs text-gray-500">
                  Powered by{' '}
                  <a 
                    href="https://maptechnepal.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800"
                  >
                    <img 
                      src="https://maptechnepal.com/_next/static/media/company__logo.388080d1.webp" 
                      alt="MapTech Nepal" 
                      className="h-4 w-auto inline"
                    />
                    MapTech Nepal
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}