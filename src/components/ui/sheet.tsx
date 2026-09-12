"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// A bottom sheet, distinct from Dialog (ui/dialog.tsx): same Radix Dialog
// primitive (portal, focus trap, ESC/overlay dismiss), but anchored to the
// bottom edge and sliding up instead of a centered pop-in.
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 duration-300 data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out" />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] border-t border-border bg-surface p-6 pb-8 shadow-xl",
        // Full-width, edge-to-edge on mobile. From md: up, cap it to the
        // app's usual content width and float it centered above the bottom
        // edge instead of stretching across a wide viewport. Centered
        // between left-20 and the right edge (not left-1/2), matching the
        // app shell's own md:pl-20 (the left nav rail's width) -- otherwise
        // this would center on the full window and sit visibly left of the
        // actual content column next to the rail.
        "md:inset-x-auto md:left-20 md:right-0 md:bottom-6 md:mx-auto md:w-full md:max-w-md md:rounded-[28px] md:border",
        "duration-300 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
        className,
      )}
      {...props}
    >
      <div className="mx-auto mb-5 h-1.5 w-10 rounded-full bg-border" />
      {children}
      <DialogPrimitive.Close className="absolute right-5 top-5 rounded-full p-1 text-muted hover:bg-surface-2">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("font-display text-lg font-semibold", className)} {...props} />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted", className)} {...props} />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;

export { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription };
