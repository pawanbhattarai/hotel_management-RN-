
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Facebook, Instagram, Phone, Mail, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            {/* Contact Information */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-center sm:text-left">
                Contact Us
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                {/* Email */}
                <a
                  href="mailto:support@maptechnepal.com"
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                  <span className="text-sm sm:text-base truncate">Email</span>
                </a>

                {/* WhatsApp */}
                <a
                  href="https://wa.me/9779745673009"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm sm:text-base truncate">WhatsApp</span>
                </a>

                {/* Facebook */}
                <a
                  href="https://www.facebook.com/maptech.np/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Facebook className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                  <span className="text-sm sm:text-base truncate">Facebook</span>
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/maptech.np/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Instagram className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600 flex-shrink-0" />
                  <span className="text-sm sm:text-base truncate">Instagram</span>
                </a>

                {/* Website */}
                <a
                  href="https://maptechnepal.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 flex-shrink-0" />
                  <span className="text-sm sm:text-base truncate">Website</span>
                </a>
              </div>
            </div>

            {/* Powered by section */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs sm:text-sm text-gray-500 text-center">
                Powered by{" "}
                <a
                  href="https://maptechnepal.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <img
                    src="https://maptechnepal.com/_next/static/media/company__logo.388080d1.webp"
                    alt="MapTech Nepal"
                    className="h-3 sm:h-4 w-auto inline"
                  />
                  MapTech Nepal
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </footer>
  );
}
