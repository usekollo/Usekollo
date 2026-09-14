"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { isAxiosError } from "axios";

function makeQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 60 * 1000,
				refetchOnWindowFocus: false,
				// Only retry requests that never got a response at all (dropped
				// connection, timeout) — once the backend has actually answered
				// with an HTTP error, retrying blindly just repeats the same
				// failure and (see attachApiLogging in lib/config/axios.ts) doubles
				// up the console noise for it too.
				retry: (failureCount, error) =>
					isAxiosError(error) && error.response ? false : failureCount < 1,
			},
		},
	});
}

// One QueryClient per browser tab, but a fresh one per request on the
// server — sharing a module-level client across requests would leak cached
// data between users during SSR.
let browserQueryClient: QueryClient | undefined;

export function getQueryClient() {
	if (typeof window === "undefined") {
		return makeQueryClient();
	}

	if (!browserQueryClient) {
		browserQueryClient = makeQueryClient();
	}

	return browserQueryClient;
}

export default function ReactQueryProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const queryClient = getQueryClient();

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{process.env.NODE_ENV === "development" && (
				<ReactQueryDevtools initialIsOpen={false} />
			)}
		</QueryClientProvider>
	);
}
