"use client"

import * as React from "react"
import { Check, ChevronDown, Plus } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function Combobox({
    items = [],
    value = "",
    onChange,
    placeholder = "Select item...",
    searchPlaceholder = "Search...",
    emptyText = "No item found.",
    creatable = false,
    onCreate,
    className,
    displayValue, // New prop to force display text
}) {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [openGroups, setOpenGroups] = React.useState(new Set())


    // Determine the label to display
    // 1. If explicit displayValue provided, use it.
    // 2. If value matches an item, use that item's label.
    // 3. If creatable (or value exists but not in list), use value.
    const selectedItem = items.find((item) => item.value === value)
    const displayLabel = displayValue || (selectedItem ? selectedItem.label : (value ? value : placeholder))


    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
                >
                    {displayLabel}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder={searchPlaceholder}
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandList>
                        <CommandEmpty>
                            {creatable && searchQuery ? (
                                <div
                                    className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent rounded-sm"
                                    onClick={() => {
                                        if (onCreate) {
                                            onCreate(searchQuery)
                                        } else {
                                            onChange(searchQuery)
                                        }
                                        setOpen(false)
                                        setSearchQuery("")
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                    Create "{searchQuery}"
                                </div>
                            ) : (
                                emptyText
                            )}
                        </CommandEmpty>
                        <CommandGroup>
                            {items.map((item) => {
                                // If item has children, render as expandable group
                                if (item.children && item.children.length > 0) {
                                    const isExpanded = searchQuery ? true : openGroups.has(item.label); // Auto-expand on search

                                    return (
                                        <React.Fragment key={item.value}>
                                            <CommandItem
                                                value={item.label}
                                                onSelect={() => {
                                                    // Toggle expansion
                                                    setOpenGroups(prev => {
                                                        const next = new Set(prev);
                                                        if (next.has(item.label)) next.delete(item.label);
                                                        else next.add(item.label);
                                                        return next;
                                                    });
                                                }}
                                                className="font-medium"
                                            >
                                                {item.label}
                                                <ChevronDown className={`ml-auto h-3 w-3 opacity-50 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                            </CommandItem>
                                            {isExpanded && item.children.map(child => (
                                                <CommandItem
                                                    key={child.value}
                                                    value={child.value} // Value must be unique-ish
                                                    onSelect={() => {
                                                        onChange(child.value === value ? "" : child.value)
                                                        setOpen(false)
                                                        setSearchQuery("")
                                                    }}
                                                    className="pl-5 text-sm py-2"
                                                >
                                                    <span className="flex items-center gap-2">
                                                        <span className={cn(
                                                            "text-xl leading-none",
                                                            value === child.value ? "text-green-600 opacity-100" : "text-gray-400 opacity-60"
                                                        )}>•</span>
                                                        {child.label}
                                                    </span>
                                                </CommandItem>
                                            ))}
                                        </React.Fragment>
                                    );
                                }

                                // Standard item
                                return (
                                    <CommandItem
                                        key={item.value}
                                        value={item.label}
                                        onSelect={() => {
                                            onChange(item.value === value ? "" : item.value)
                                            setOpen(false)
                                            setSearchQuery("")
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === item.value ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {item.label}
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
