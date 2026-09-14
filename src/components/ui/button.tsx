"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive cursor-pointer duration-150 hover:scale-[0.97] active:scale-[1]",
	{
		variants: {
			variant: {
				// Figma "Normal"/"Action Centered Buttons" sets (node 104-8117 /
				// 104-8134) — default=Property 1=Default, light=Variant3,
				// dark=Variant4, navy=Variant5, secondary=Variant6 (purple).
				default:
					"bg-primary text-primary-foreground hover:bg-blue-normal-hover active:bg-blue-normal-active",
				light: "bg-blue-light text-grey-dark hover:bg-blue-light-hover active:bg-blue-light-active",
				dark: "bg-grey-normal text-grey-light hover:bg-grey-darker active:bg-grey-darker",
				navy: "bg-blue-darker text-blue-light hover:opacity-90 active:opacity-80",
				destructive:
					"bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20",
				outline: "border border-grey-dark bg-transparent hover:bg-accent hover:text-accent-foreground",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-purple-normal-hover active:bg-purple-normal-active",
				ghost: "bg-transparent hover:bg-accent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-10 px-4 py-2 has-[>svg]:px-3 text-sm",
				sm: "h-9 px-3 text-sm has-[>svg]:px-2.5",
				lg: "h-12 px-6 has-[>svg]:px-4",
				xl: "h-15 px-8 has-[>svg]:px-6 text-base",
				icon: "size-9",
				"icon-sm": "size-8",
				"icon-lg": "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

type BaseButtonProps = VariantProps<typeof buttonVariants> & {
	className?: string;
	children: React.ReactNode;
	isLoading?: boolean;
};

type ButtonAsButton = BaseButtonProps &
	React.ButtonHTMLAttributes<HTMLButtonElement> & {
		href?: never;
	};

type ButtonAsLink = BaseButtonProps &
	React.AnchorHTMLAttributes<HTMLAnchorElement> & {
		href: string;
	};

type ButtonProps = ButtonAsButton | ButtonAsLink;

// Supports both a real <button> and an <a> (pass `href`) from one component
// so call sites don't have to pick between Button and a separate Link
// variant — same variants/sizes/loading state either way.
function Button(props: ButtonProps) {
	const { className, variant, size, isLoading = false, children, ...rest } = props;

	const classes = cn(
		buttonVariants({ variant, size, className }),
		isLoading && "opacity-90 cursor-not-allowed",
	);

	if ("href" in props && props.href) {
		const { href, ...linkProps } = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>;

		return (
			<a
				data-slot="button"
				href={href}
				className={classes}
				aria-disabled={isLoading}
				onClick={(e) => {
					if (isLoading) {
						e.preventDefault();
						return;
					}
					linkProps.onClick?.(e);
				}}
				{...linkProps}
			>
				{isLoading ? <Loader2 className="animate-spin" /> : children}
			</a>
		);
	}

	const buttonProps = rest as React.ButtonHTMLAttributes<HTMLButtonElement>;

	return (
		<button
			data-slot="button"
			type={buttonProps.type ?? "button"}
			className={classes}
			disabled={isLoading || buttonProps.disabled}
			{...buttonProps}
		>
			{isLoading ? <Loader2 className="animate-spin" /> : children}
		</button>
	);
}

export { Button, buttonVariants };
