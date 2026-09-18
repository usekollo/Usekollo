"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface InputFieldProps {
	name: string;
	label?: string;
	labelAction?: React.ReactNode;
	icon?: React.ReactNode;
	type?: string;
	placeholder?: string;
	value: string | number | undefined;
	readonly?: boolean;
	error?: string | null;
	onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
	min?: number;
	max?: number;
	autoComplete?: string;
	disabled?: boolean;
	description?: string;
	className?: string;
}

// Composes Label + Input + a password-visibility toggle into the one field
// shape every react-hook-form <FormField> render prop hands off to — see
// components/ui/form.tsx and features/auth/components for the wiring
// pattern. `labelAction` puts something (e.g. a "Forgot Password?" link) at
// the other end of the label row; `icon` renders a leading glyph inside the
// field — both from the Figma "Input Field = Password" component.
const InputField: React.FC<InputFieldProps> = ({
	placeholder,
	disabled,
	name,
	readonly,
	label,
	labelAction,
	icon,
	type = "text",
	value,
	onChange,
	onBlur,
	error,
	min,
	max,
	autoComplete,
	description,
	className,
}) => {
	const [view, setView] = useState(false);

	return (
		<div className="space-y-2">
			{(label || labelAction) && (
				<div className="flex items-center justify-between">
					{label && (
						<Label htmlFor={name} className="text-xs font-medium">
							{label}
						</Label>
					)}
					{labelAction}
				</div>
			)}

			{description && <p className="text-sm text-muted-foreground">{description}</p>}

			<div className="relative">
				{icon && (
					<span className="absolute left-5 top-1/2 -translate-y-1/2 text-grey-light-active">
						{icon}
					</span>
				)}

				<Input
					id={name}
					name={name}
					type={type === "password" && view ? "text" : type}
					placeholder={placeholder}
					value={value}
					onChange={onChange}
					onBlur={onBlur}
					disabled={disabled}
					readOnly={readonly}
					min={min}
					max={max}
					autoComplete={autoComplete}
					aria-invalid={!!error}
					className={cn(icon && "pl-11", type === "password" && "pr-10", className)}
				/>

				{type === "password" && (
					<button
						type="button"
						onClick={() => setView((prev) => !prev)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
						tabIndex={-1}
					>
						{view ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
					</button>
				)}
			</div>

			{error && <p className="text-xs text-destructive">{error}</p>}
		</div>
	);
};

export default InputField;
