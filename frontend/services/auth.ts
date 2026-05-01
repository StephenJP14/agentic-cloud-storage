import apiClient from "@/services/api";
import { GlobalResponse } from "@/services/type/responses";
import { User } from "./user";

export type LoginPayload = {
    username: string;
    password: string;
}

export const login = async (payload: LoginPayload) => {
    return apiClient.post<GlobalResponse<any>>(`/api/auth/login`, payload)
}

export const signout = async () => {
    return apiClient.post<GlobalResponse<null>>(`/api/auth/logout`)
}
