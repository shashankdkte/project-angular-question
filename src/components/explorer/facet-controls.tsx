"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ANY, type FilterOption } from "@/lib/search/filters";
import { cn } from "@/lib/utils";

interface FacetProps {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
  /** Wording for the unfiltered option, e.g. "All". */
  allLabel?: string;
  className?: string;
}

/** Compact dropdown for facets with a handful of values (difficulty, type, role...). */
export function FacetSelect({ label, value, options, onChange, allLabel = "All", className }: FacetProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={cn("w-full justify-between", className)} data-testid={`filter-${label.toLowerCase()}`}>
        <span className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="shrink-0 text-muted-foreground">{label}</span>
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ANY}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
            <span className="ml-1.5 text-muted-foreground tabular-nums">{option.count}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Searchable dropdown for facets that can grow long (topic, domain). */
export function FacetCombobox({ label, value, options, onChange, allLabel = "All", className }: FacetProps) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={label}
          data-testid={`filter-${label.toLowerCase()}`}
          className={cn("w-full justify-between gap-2 px-2.5 font-normal", className)}
        >
          <span className="shrink-0 text-muted-foreground">{label}</span>
          <span className="min-w-0 flex-1 truncate text-left">{selected?.label ?? allLabel}</span>
          <ChevronsUpDown aria-hidden className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,90vw)] p-0">
        <Command>
          <CommandInput placeholder={`Search ${label.toLowerCase()}…`} />
          <CommandList>
            <CommandEmpty>No match.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={`${allLabel} ${label}`}
                onSelect={() => {
                  onChange(ANY);
                  setOpen(false);
                }}
              >
                <Check aria-hidden className={cn("size-4", value === ANY ? "opacity-100" : "opacity-0")} />
                {allLabel}
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check aria-hidden className={cn("size-4", value === option.value ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{option.count}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
