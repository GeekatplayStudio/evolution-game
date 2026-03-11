import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70",
          variant === "default" &&
            "bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 hover:from-cyan-300 hover:to-sky-400",
          variant === "outline" &&
            "border border-slate-500/80 bg-slate-900/50 text-slate-100 hover:border-cyan-500/70 hover:bg-slate-800/80",
          variant === "ghost" && "text-slate-200 hover:bg-slate-800/70",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
