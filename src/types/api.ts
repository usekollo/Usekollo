// Shared envelope types for every API response. Adjust these to match your
// backend's actual response shape once it's wired up — these mirror a
// common Nest-style { statusCode, message, data } envelope as a starting
// point.

export interface ApiSuccessResponse<T = unknown> {
	statusCode: number;
	message: string;
	timestamp: string;
	data: T;
}

export interface ApiErrorResponse {
	statusCode: number;
	// Validation errors commonly come back as an array of per-field messages
	// (e.g. ["email must be a valid email"]) while other errors return a
	// single string — handle both in getApiErrorMessage (lib/utils).
	message: string | string[];
	timestamp: string;
	error?: string;
}

export interface AuthTokensData {
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
}

export interface PaginationMeta {
	totalCount: number;
	currentCount: number;
	page: number;
	totalPages: number;
	hasNext: boolean;
	hasPrevious: boolean;
}

export interface PaginatedData<T> {
	data: T[];
	meta: PaginationMeta;
}

export interface PaginationParams {
	page?: number;
	take?: number;
	sortOrder?: "asc" | "desc";
	sortBy?: string;
	search?: string;
}
