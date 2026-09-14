import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { isAxiosError } from "axios";
import { ApiErrorResponse } from "@/types/api";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
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
