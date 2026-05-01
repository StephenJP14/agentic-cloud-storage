import apiClient from "@/services/api";
import { GlobalResponse } from "@/services/type/responses";

export type WarrantyStatus = "inactive" | "active" | "expired"

export type Warranty = {
    ID: number;
    product_sn: string;
    product_type: string;
    product_model: string;
    activation_date: string;
    expiry_date: string;
    do_date: string;
    warranty_length: number;
    warranty_status: string;
    name: string;
    email: string;
    phone_number: string;
    province: string;
    city: string;
}

export type CheckWarrantyResult = {
    product_sn: string;
    product_type: string;
    product_model: string;
    activation_date: string;
    expiry_date: string;
    warranty_length: string;
    status: string;
    remaining_days: number;
    name: string;
}

export type ActivateWarrantyResult = {
    expiry_date: string;
    remaining_days: string;
    product_sn: string;
    status: string;
}

export type ActivateWarrantyDTO = {
    name: string
    email: string
    phone_number: string
    province: string
    city: string
    product_sn: string
}

export type WarrantyParams = {
    limit: number;
    page: number;
    q: string;
}

export const getAllWarranties = async (searchParams: WarrantyParams) => {
    return apiClient.get<GlobalResponse<Warranty[]>>(`/api/warranties/`, { params: searchParams })
}

export const CheckProductWarranty = async (productSN: string) => {
    return apiClient.get<GlobalResponse<CheckWarrantyResult>>(
        `/api/warranties/${productSN}`
    )
}

export const ActivateWarranty = async (payload: ActivateWarrantyDTO) => {
    return apiClient.post<GlobalResponse<ActivateWarrantyResult>>(
        `/api/warranties/${payload.product_sn}`, payload
    )
}

export const importWarranty = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient.post<GlobalResponse<any>>(`/api/warranties/import`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
};