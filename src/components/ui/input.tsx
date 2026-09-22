import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";

import { cn } from "@/lib/utils";

// Pill-shaped field — Figma "Input Field = Text" (node 104-8213): grey-light-active
// border/placeholder by default, grey-normal once focused, destructive red on
// aria-invalid. No focus ring (Figma has none); the border color swap carries
// the focus state instead.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
	return (
		<InputPrimitive
			type={type}
			data-slot="input"
			className={cn(
				"h-12.5 w-full min-w-0 rounded-[90px] border border-grey-light-active bg-transparent px-5 text-base text-grey-normal shadow-xs transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-grey-light-active disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-grey-normal aria-invalid:border-destructive aria-invalid:text-destructive aria-invalid:placeholder:text-destructive md:text-sm",
				className,
			)}
			{...props}
		/>
	);
}

export { Input };
