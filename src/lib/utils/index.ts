import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { isAxiosError } from "axios";
import { ApiErrorResponse } from "@/types/api";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// The one place money gets formatted — comma-grouped, always 2 decimals
// (e.g. 2480 -> "2,480.00"). Every amount shown anywhere in the dashboard
// should go through this instead of a local toLocaleString/toFixed call.
export function formatMoney(value: number | string) {
	const numeric = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(numeric)) return "0.00";
	return numeric.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// "2026-12-31" -> "DEC 2026" — used wherever a goal's target date is shown
// as a due date rather than a full date.
export function formatMonthYear(value: string) {
	if (!value) return "--";
	const date = new Date(`${value}T00:00:00`);
	if (Number.isNaN(date.getTime())) return "--";
	return date.toLocaleDateString("en-US", { month: "short", year: "numeric" }).toUpperCase();
}

export function getApiErrorMessage(
	error: unknown,
	fallback = "Something went wrong. Please try again.",
) {
	if (isAxiosError<ApiErrorResponse>(error)) {
		const message = error.response?.data?.message;

		if (Array.isArray(message)) {
			return message.length > 0 ? message.join(" ") : fallback;
		}

		return message ?? fallback;
	}

	return fallback;
}
