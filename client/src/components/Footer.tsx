
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Facebook, Instagram, Phone, Mail, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Card>
          <CardContent className="p-4 sm:p-6">
            

            {/* Powered by section with contact icons */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                <p className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
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
                
                {/* Contact icons - positioned on the far right */}
                <div className="flex items-center gap-2">
                  <a
                    href="mailto:support@maptechnepal.com"
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Email"
                  >
                    <Mail className="w-3 h-3" />
                  </a>
                  <a
                    href="https://wa.me/9779745673009"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                    title="WhatsApp"
                  >
                    <Phone className="w-3 h-3" />
                  </a>
                  <a
                    href="https://www.facebook.com/maptech.np/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Facebook"
                  >
                    <Facebook className="w-3 h-3" />
                  </a>
                  <a
                    href="https://www.instagram.com/maptech.np/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-pink-600 transition-colors"
                    title="Instagram"
                  >
                    <Instagram className="w-3 h-3" />
                  </a>
                  <a
                    href="https://maptechnepal.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Website"
                  >
                    <Globe className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </footer>
  );
}
