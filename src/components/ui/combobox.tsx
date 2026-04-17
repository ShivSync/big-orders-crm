"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  className?: string;
  name?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Search...",
  emptyLabel = "—",
  className,
  name,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find(o => o.value === value)?.label || "";

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {name && <input type="hidden" name={name} value={value} />}
      <div
        className="flex items-center border rounded-md px-3 py-2 text-sm bg-white cursor-pointer hover:border-gray-400 transition-colors"
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 0); }}
      >
        {open ? (
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={placeholder}
            className="border-0 p-0 h-auto shadow-none focus-visible:ring-0"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          <span className={cn("flex-1 truncate", !value && "text-gray-500")}>
            {value ? selectedLabel : (emptyLabel || placeholder)}
          </span>
        )}
        <div className="flex items-center gap-1 ml-2 shrink-0">
          {value && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(""); setQuery(""); }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", open && "rotate-180")} />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No results</div>
          ) : (
            filtered.map(o => (
              <div
                key={o.value}
                className={cn(
                  "px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 transition-colors",
                  o.value === value && "bg-red-50 text-red-700 font-medium"
                )}
                onClick={() => { onChange(o.value); setOpen(false); setQuery(""); }}
              >
                {o.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
