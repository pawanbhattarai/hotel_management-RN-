import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Building, Globe, Clock, FileText, Save, Hotel } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const hotelSettingsSchema = z.object({
  branchId: z.number().optional(),
  hotelName: z.string().min(1, "Hotel name is required"),
  hotelChain: z.string().optional(),
  logo: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email address"),
  website: z.string().optional(),
  taxNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  checkInTime: z.string().default("15:00"),
  checkOutTime: z.string().default("11:00"),
  currency: z.string().default("NPR"),
  timeZone: z.string().default("Asia/Kathmandu"),
  billingFooter: z.string().optional(),
  termsAndConditions: z.string().optional(),
  cancellationPolicy: z.string().optional(),
  // Social media and company info
  facebookUrl: z.string().optional(),
  instagramUrl: z.string().optional(),
  tiktokUrl: z.string().optional(),
  youtubeUrl: z.string().optional(),
  contactInfo: z.string().optional(),
  reviewsUrl: z.string().optional(),
});

type HotelSettingsForm = z.infer<typeof hotelSettingsSchema>;

const currencies = [
  { value: "NPR", label: "NPR - Nepalese Rupee" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "CHF", label: "CHF - Swiss Franc" },
  { value: "CNY", label: "CNY - Chinese Yuan" },
  { value: "INR", label: "INR - Indian Rupee" },
];

const timeZones = [
  { value: "Asia/Kathmandu", label: "Asia/Kathmandu - Nepal Time" },
  { value: "UTC", label: "UTC - Coordinated Universal Time" },
  { value: "America/New_York", label: "EST - Eastern Time" },
  { value: "America/Chicago", label: "CST - Central Time" },
  { value: "America/Denver", label: "MST - Mountain Time" },
  { value: "America/Los_Angeles", label: "PST - Pacific Time" },
  { value: "Europe/London", label: "GMT - Greenwich Mean Time" },
  { value: "Europe/Paris", label: "CET - Central European Time" },
  { value: "Asia/Tokyo", label: "JST - Japan Standard Time" },
  { value: "Asia/Shanghai", label: "CST - China Standard Time" },
  { value: "Asia/Kolkata", label: "IST - India Standard Time" },
];

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/hotel-settings"],
  });

  const form = useForm<HotelSettingsForm>({
    resolver: zodResolver(hotelSettingsSchema),
    defaultValues: {
      hotelName: "",
      hotelChain: "",
      logo: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      phone: "",
      email: "",
      website: "",
      taxNumber: "",
      registrationNumber: "",
      checkInTime: "15:00",
      checkOutTime: "11:00",
      currency: "NPR",
      timeZone: "Asia/Kathmandu",
      billingFooter: "",
      termsAndConditions: "",
      cancellationPolicy: "",
      // Social media and company info
      facebookUrl: "",
      instagramUrl: "",
      tiktokUrl: "",
      youtubeUrl: "",
      contactInfo: "",
      reviewsUrl: "",
    },
  });

  const { reset, setValue, watch } = form;

  // Reset form when settings data loads
  useEffect(() => {
    if (settings) {
      reset({
        branchId: (settings as any).branchId || undefined,
        hotelName: (settings as any).hotelName || "",
        hotelChain: (settings as any).hotelChain || "",
        logo: (settings as any).logo || "",
        address: (settings as any).address || "",
        city: (settings as any).city || "",
        state: (settings as any).state || "",
        country: (settings as any).country || "",
        postalCode: (settings as any).postalCode || "",
        phone: (settings as any).phone || "",
        email: (settings as any).email || "",
        website: (settings as any).website || "",
        taxNumber: (settings as any).taxNumber || "",
        registrationNumber: (settings as any).registrationNumber || "",
        checkInTime: (settings as any).checkInTime || "15:00",
        checkOutTime: (settings as any).checkOutTime || "11:00",
        currency: (settings as any).currency || "NPR",
        timeZone: (settings as any).timeZone || "Asia/Kathmandu",
        billingFooter: (settings as any).billingFooter || "",
        termsAndConditions: (settings as any).termsAndConditions || "",
        cancellationPolicy: (settings as any).cancellationPolicy || "",
        facebookUrl: (settings as any).facebookUrl || "",
        instagramUrl: (settings as any).instagramUrl || "",
        tiktokUrl: (settings as any).tiktokUrl || "",
        youtubeUrl: (settings as any).youtubeUrl || "",
        contactInfo: (settings as any).contactInfo || "",
        reviewsUrl: (settings as any).reviewsUrl || "",
      });
    }
  }, [settings, reset]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: HotelSettingsForm) => {
      const response = await fetch("/api/hotel-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save settings");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hotel-settings"] });
      toast({
        title: "Settings saved",
        description: "Hotel settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: HotelSettingsForm) => {
    saveSettingsMutation.mutate(data);
  };

  const handleSaveClick = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      const formData = form.getValues();
      onSubmit(formData);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 lg:p-6">
        <Header
          title="Hotel Settings"
          subtitle="Configure your hotel information and policies"
        />
        <div className="mt-6 animate-pulse">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar
        isMobileMenuOpen={isMobileSidebarOpen}
        setIsMobileMenuOpen={setIsMobileSidebarOpen}
      />

      <div className="main-content">
        <Header
          title="Hotel Settings"
          subtitle="Configure hotel information, policies, and operational settings"
          onMobileMenuToggle={() =>
            setIsMobileSidebarOpen(!isMobileSidebarOpen)
          }
          action={
            <Button
              onClick={handleSaveClick}
              disabled={saveSettingsMutation.isPending}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          }
        />

        <main className="p-4 lg:p-6 space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="space-y-6"
          >
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                <span className="hidden sm:inline">General</span>
              </TabsTrigger>
              <TabsTrigger
                value="operational"
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Operations</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Billing</span>
              </TabsTrigger>
              <TabsTrigger value="policies" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Policies</span>
              </TabsTrigger>
            </TabsList>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <TabsContent value="general" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Hotel className="h-5 w-5" />
                      Hotel Information
                    </CardTitle>
                    <CardDescription>
                      Basic information about your hotel property
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="hotelName">Hotel Name *</Label>
                        <Input
                          id="hotelName"
                          {...form.register("hotelName")}
                          placeholder="Grand Hotel & Resort"
                        />
                        {form.formState.errors.hotelName && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.hotelName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="hotelChain">Hotel Chain</Label>
                        <Input
                          id="hotelChain"
                          {...form.register("hotelChain")}
                          placeholder="Luxury Hotels International"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="timeZone">Time Zone</Label>
                        <Select
                          value={watch("timeZone")}
                          onValueChange={(value) => setValue("timeZone", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Asia/Kathmandu">
                              Asia/Kathmandu (Nepal Time)
                            </SelectItem>
                            <SelectItem value="UTC">UTC</SelectItem>
                            <SelectItem value="America/New_York">
                              America/New_York (EST)
                            </SelectItem>
                            <SelectItem value="Europe/London">
                              Europe/London (GMT)
                            </SelectItem>
                            <SelectItem value="Asia/Tokyo">
                              Asia/Tokyo (JST)
                            </SelectItem>
                            <SelectItem value="Asia/Dubai">
                              Asia/Dubai (GST)
                            </SelectItem>
                            <SelectItem value="Asia/Kolkata">
                              Asia/Kolkata (IST)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="logo">Logo URL</Label>
                      <Input
                        id="logo"
                        {...form.register("logo")}
                        placeholder="https://example.com/logo.png"
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Address Information</h4>

                      <div className="space-y-2">
                        <Label htmlFor="address">Street Address *</Label>
                        <Textarea
                          id="address"
                          {...form.register("address")}
                          placeholder="123 Main Street, Suite 100"
                          rows={2}
                        />
                        {form.formState.errors.address && (
                          <p className="text-sm text-red-600">
                            {form.formState.errors.address.message}
                          </p>
                        )}
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            {...form.register("city")}
                            placeholder="Kathmandu"
                          />
                          {form.formState.errors.city && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.city.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="state">State/Province *</Label>
                          <Input
                            id="state"
                            {...form.register("state")}
                            placeholder="Bagmati"
                          />
                          {form.formState.errors.state && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.state.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="country">Country *</Label>
                          <Input
                            id="country"
                            {...form.register("country")}
                            placeholder="Nepal"
                          />
                          {form.formState.errors.country && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.country.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="postalCode">Postal Code *</Label>
                          <Input
                            id="postalCode"
                            {...form.register("postalCode")}
                            placeholder="44600"
                          />
                          {form.formState.errors.postalCode && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.postalCode.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Contact Information</h4>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number *</Label>
                          <Input
                            id="phone"
                            {...form.register("phone")}
                            placeholder="+977-1-4123456"
                          />
                          {form.formState.errors.phone && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.phone.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address *</Label>
                          <Input
                            id="email"
                            type="email"
                            {...form.register("email")}
                            placeholder="info@grandhotel.com"
                          />
                          {form.formState.errors.email && (
                            <p className="text-sm text-red-600">
                              {form.formState.errors.email.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="website">Website</Label>
                        <Input
                          id="website"
                          {...form.register("website")}
                          placeholder="https://www.grandhotel.com"
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Social Media & Company Info Section */}
                    <div className="space-y-6">
                      <h4 className="font-medium">Social Media & Company Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="facebookUrl">Facebook URL</Label>
                          <Input
                            id="facebookUrl"
                            placeholder="https://facebook.com/yourpage"
                            {...form.register("facebookUrl")}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="instagramUrl">Instagram URL</Label>
                          <Input
                            id="instagramUrl"
                            placeholder="https://instagram.com/yourpage"
                            {...form.register("instagramUrl")}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="tiktokUrl">TikTok URL</Label>
                          <Input
                            id="tiktokUrl"
                            placeholder="https://tiktok.com/@yourpage"
                            {...form.register("tiktokUrl")}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="youtubeUrl">YouTube URL</Label>
                          <Input
                            id="youtubeUrl"
                            placeholder="https://youtube.com/c/yourpage"
                            {...form.register("youtubeUrl")}
                          />
                        </div>

                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor="contactInfo">Company Description</Label>
                          <Textarea
                            id="contactInfo"
                            placeholder="Brief description about your restaurant/hotel"
                            {...form.register("contactInfo")}
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="reviewsUrl">Reviews URL</Label>
                          <Input
                            id="reviewsUrl"
                            placeholder="https://google.com/reviews or TripAdvisor link"
                            {...form.register("reviewsUrl")}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="operational" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Operational Settings
                    </CardTitle>
                    <CardDescription>
                      Configure check-in/out times, currency, and timezone
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="checkInTime">Check-in Time</Label>
                        <Input
                          id="checkInTime"
                          type="time"
                          {...form.register("checkInTime")}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="checkOutTime">Check-out Time</Label>
                        <Input
                          id="checkOutTime"
                          type="time"
                          {...form.register("checkOutTime")}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Select
                          value={watch("currency")}
                          onValueChange={(value) => setValue("currency", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {currencies.map((currency) => (
                              <SelectItem
                                key={currency.value}
                                value={currency.value}
                              >
                                {currency.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="timeZone">Time Zone</Label>
                        <Select
                          value={watch("timeZone")}
                          onValueChange={(value) => setValue("timeZone", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeZones.map((tz) => (
                              <SelectItem key={tz.value} value={tz.value}>
                                {tz.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h4 className="font-medium">Legal Information</h4>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="taxNumber">Tax Number</Label>
                          <Input
                            id="taxNumber"
                            {...form.register("taxNumber")}
                            placeholder="TAX123456789"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="registrationNumber">
                            Registration Number
                          </Label>
                          <Input
                            id="registrationNumber"
                            {...form.register("registrationNumber")}
                            placeholder="REG987654321"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="billing" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Billing Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure billing footer and invoice information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="billingFooter">Billing Footer</Label>
                      <Textarea
                        id="billingFooter"
                        {...form.register("billingFooter")}
                        placeholder="Thank you for choosing our hotel. For questions about your invoice, please contact us at billing@grandhotel.com or call +977-1-4123456."
                        rows={4}
                      />
                      <p className="text-sm text-muted-foreground">
                        This text will appear at the bottom of all invoices and
                        receipts
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="policies" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Hotel Policies
                    </CardTitle>
                    <CardDescription>
                      Define terms and conditions and cancellation policies
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="termsAndConditions">
                        Terms and Conditions
                      </Label>
                      <Textarea
                        id="termsAndConditions"
                        {...form.register("termsAndConditions")}
                        placeholder="Enter your hotel's terms and conditions..."
                        rows={6}
                      />
                      <p className="text-sm text-muted-foreground">
                        These terms will be displayed during booking and on
                        invoices
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cancellationPolicy">
                        Cancellation Policy
                      </Label>
                      <Textarea
                        id="cancellationPolicy"
                        {...form.register("cancellationPolicy")}
                        placeholder="Enter your cancellation policy..."
                        rows={6}
                      />
                      <p className="text-sm text-muted-foreground">
                        Specify your cancellation terms and any applicable fees
                      </p>
                    </div>



                  </CardContent>
                </Card>
              </TabsContent>
            </form>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
