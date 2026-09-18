import { cn } from "@/lib/utils";

// Shimmer loading placeholder (see globals.css .skeleton-shimmer for the
// actual sweep animation) — give it a shape via className (h-4 w-32,
// rounded-full for a circle/avatar, etc.) wherever real content isn't
// ready yet.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="skeleton"
			aria-hidden="true"
			className={cn("skeleton-shimmer rounded-md", className)}
			{...props}
		/>
	);
}

export { Skeleton };
