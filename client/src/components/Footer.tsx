import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Facebook, Instagram, Mail, Globe, MessageCircle } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-auto bg-gray-50 border-t border-gray-200 lg:ml-64">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <Card>
          <CardContent className="p-3 sm:p-4">
            {/* Powered by section with contact icons */}
            <div className="flex items-center justify-between gap-2">
              {/* Left: Powered by */}
              <div className="flex items-center text-xs text-gray-500">
                Powered by{" "}
                <a
                  href="https://maptechnepal.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors ml-1"
                >
                  <img
                    src="https://maptechnepal.com/_next/static/media/company__logo.388080d1.webp"
                    alt="MapTech Nepal"
                    className="h-3 w-auto inline"
                  />
                </a>
              </div>

              {/* Right: Colored social icons */}
              <div className="flex items-center gap-1">
                <a
                  href="mailto:support@maptechnepal.com"
                  className="p-0.5 text-red-500 hover:text-red-600 transition-colors"
                  title="Email"
                >
                  <Mail className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://wa.me/9779745673009"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-0.5 text-green-500 hover:text-green-600 transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://www.facebook.com/maptech.np/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-0.5 text-blue-600 hover:text-blue-700 transition-colors"
                  title="Facebook"
                >
                  <Facebook className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://www.instagram.com/maptech.np/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-0.5 text-pink-500 hover:text-pink-600 transition-colors"
                  title="Instagram"
                >
                  <Instagram className="w-3.5 h-3.5" />
                </a>
                <a
                  href="https://maptechnepal.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-0.5 text-gray-600 hover:text-gray-700 transition-colors"
                  title="Website"
                >
                  <Globe className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </footer>
  );
}
