import axios, {
	AxiosError,
	AxiosInstance,
	InternalAxiosRequestConfig,
} from "axios";
import { useAuthStore } from "../stores/userAuthStore";
import { apiRoutes } from "./apiRoutes";
import { pageRoutes } from "./routes";
import { ApiSuccessResponse, AuthTokensData } from "@/types/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// No auth header — for register/login/forgot-password/etc, and for the
// token refresh call itself (must not go through axiosAuth or a failed
// refresh loops).
export const axiosPublic = axios.create({
	baseURL: API_BASE_URL,
	headers: { "Content-Type": "application/json" },
});

// Attaches the bearer token and retries once with a refreshed token on 401.
export const axiosAuth = axios.create({
	baseURL: API_BASE_URL,
	headers: { "Content-Type": "application/json" },
});

// ---------------------------------------------------------------------
// Console logging for every API call, success or error — every request
// this app makes goes through axiosPublic/axiosAuth, so hooking logging
// in here is enough to cover the whole app.
// ---------------------------------------------------------------------
type TimedConfig = InternalAxiosRequestConfig & { __startedAt?: number };

const REDACTED_KEYS = [
	"password",
	"newPassword",
	"currentPassword",
	"confirmPassword",
];

// Don't print raw passwords to the console even though this is dev-facing
// logging.
const redact = (data: unknown) => {
	if (!data || typeof data !== "object") return data;
	if (typeof FormData !== "undefined" && data instanceof FormData) {
		return "[FormData]";
	}

	const clone = { ...(data as Record<string, unknown>) };
	for (const key of REDACTED_KEYS) {
		if (key in clone) clone[key] = "••••••";
	}
	return clone;
};

const attachApiLogging = (instance: AxiosInstance, label: string) => {
	instance.interceptors.request.use((config) => {
		(config as TimedConfig).__startedAt = Date.now();
		return config;
	});

	instance.interceptors.response.use(
		(response) => {
			const config = response.config as TimedConfig;
			const duration = config.__startedAt ? Date.now() - config.__startedAt : undefined;

			console.groupCollapsed(
				`%c[api:${label}] %c${response.status} %c${(config.method ?? "get").toUpperCase()} ${config.url}%c ${duration ?? "?"}ms`,
				"color:#9B9B9B",
				"color:#16a34a;font-weight:600",
				"color:inherit",
				"color:#9B9B9B",
			);
			if (config.data) console.log("request:", redact(config.data));
			if (config.params) console.log("params:", config.params);
			console.log("response:", response.data);
			console.groupEnd();

			return response;
		},
		(error: AxiosError) => {
			const config = error.config as TimedConfig | undefined;
			const duration = config?.__startedAt ? Date.now() - config.__startedAt : undefined;
			const status = error.response?.status;

			// 4xx are expected, user-facing failures (bad credentials, failed
			// validation, etc.) — log those as a warning so they don't trip
			// Next's dev-mode Console Error overlay on every wrong-password
			// attempt. Real bugs (5xx, network errors with no response at all)
			// still get the full console.error treatment.
			const isClientError = typeof status === "number" && status >= 400 && status < 500;
			const log = isClientError ? console.warn : console.error;

			console.groupCollapsed(
				`%c[api:${label}] %c${status ?? "ERR"} %c${(config?.method ?? "?").toUpperCase()} ${config?.url ?? "unknown"}%c ${duration ?? "?"}ms`,
				"color:#9B9B9B",
				isClientError ? "color:#d97706;font-weight:600" : "color:#dc2626;font-weight:600",
				"color:inherit",
				"color:#9B9B9B",
			);
			if (config?.data) console.log("request:", redact(config.data));
			if (config?.params) console.log("params:", config.params);
			log(
				`[api:${label}] ${status ?? "ERR"} ${(config?.method ?? "?").toUpperCase()} ${config?.url ?? "unknown"} — error response:`,
				error.response?.data ?? error.message,
			);
			console.groupEnd();

			return Promise.reject(error);
		},
	);
};

attachApiLogging(axiosPublic, "public");
attachApiLogging(axiosAuth, "auth");

axiosAuth.interceptors.request.use((config) => {
	const token = useAuthStore.getState().accessToken;

	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}

	return config;
});

// Shared across concurrent 401s so a burst of requests triggers one refresh
// call instead of one per request.
let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async () => {
	const refreshToken = useAuthStore.getState().refreshToken;

	if (!refreshToken) return null;

	try {
		const { data } = await axiosPublic.post<ApiSuccessResponse<AuthTokensData>>(
			apiRoutes.auth.REFRESH,
			{ refreshToken },
		);

		useAuthStore.getState().setTokens(data.data);
		return data.data.accessToken;
	} catch {
		useAuthStore.getState().logout();
		return null;
	}
};

axiosAuth.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		const originalRequest = error.config as
			| (InternalAxiosRequestConfig & { _retry?: boolean })
			| undefined;

		if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
			originalRequest._retry = true;

			refreshPromise ??= refreshAccessToken().finally(() => {
				refreshPromise = null;
			});

			const newToken = await refreshPromise;

			if (newToken) {
				originalRequest.headers.Authorization = `Bearer ${newToken}`;
				return axiosAuth(originalRequest);
			}

			if (typeof window !== "undefined") {
				window.location.href = pageRoutes.authRoutes.SIGN_IN;
			}
		}

		return Promise.reject(error);
	},
);
