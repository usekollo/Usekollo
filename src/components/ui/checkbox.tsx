"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

// 16x16 box, grey-light-active border by default — Figma "Remember for 30
// days" checkbox on the Sign In screen (node 207-12268). No dedicated
// component set for it in the docs sheet, so styled to match that one
// instance rather than a fetched spec.
function Checkbox({
	className,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			className={cn(
				"peer size-4 shrink-0 rounded-[3px] border border-grey-light-active outline-none transition-colors",
				"data-[checked]:border-primary data-[checked]:bg-primary",
				"focus-visible:ring-ring/50 focus-visible:ring-[3px]",
				"disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator className="flex items-center justify-center text-primary-foreground">
				<Check className="size-3" />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	);
}

export { Checkbox };
