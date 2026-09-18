"use client";

import { axiosAuth } from "@/lib/config/axios";

// Interceptors are registered once at module scope in lib/config/axios.ts —
// this hook just gives feature hooks the familiar `useAxiosAuth()` call site.
export const useAxiosAuth = () => axiosAuth;
