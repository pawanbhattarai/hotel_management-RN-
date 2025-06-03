import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface HeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600">{subtitle}</p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">Today: {currentDate}</p>
          </div>

          {action}
        </div>
      </div>
    </header>
  );
}