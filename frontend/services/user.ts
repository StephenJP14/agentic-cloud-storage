import apiClient from "@/services/api";
import { GlobalResponse } from "@/services/type/responses";

export type User = {
    ID: number;
    username: string;
    department: string;
    branch_id: string;
    role: string;
}

export type RegisterUser = {
    username: string;
    password: string;
    department: string;
    branch_id: string;
    role: string;
}

export const getAllUsers = async () => {
    return apiClient.get<GlobalResponse<User[]>>(`/api/users/all-users`)
}

export const createUser = async (payload: RegisterUser) => {
    return apiClient.post<GlobalResponse<any>>(`/api/users/`, payload)
}