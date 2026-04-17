"use client";

import { useTranslations } from "next-intl";
import { HelpCircle } from "lucide-react";

interface HelpTooltipProps {
  tooltipKey: string;
  className?: string;
}

export function HelpTooltip({ tooltipKey, className = "" }: HelpTooltipProps) {
  const t = useTranslations("help");

  return (
    <span className={`relative inline-flex items-center group ${className}`}>
      <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg z-50 whitespace-normal">
        {t(`tooltips.${tooltipKey}`)}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </span>
  );
}
