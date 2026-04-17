"use client";

import { Label } from "./label";
import { cn } from "@/lib/utils";

interface RequiredLabelProps {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
  htmlFor?: string;
}

export function RequiredLabel({ children, required = false, className, htmlFor }: RequiredLabelProps) {
  return (
    <Label htmlFor={htmlFor} className={cn("flex items-center gap-1", className)}>
      {children}
      {required ? (
        <span className="text-red-500 text-xs">*</span>
      ) : (
        <span className="text-gray-400 text-xs font-normal">(optional)</span>
      )}
    </Label>
  );
}
