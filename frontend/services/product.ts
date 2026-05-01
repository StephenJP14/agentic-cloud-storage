import apiClient from "@/services/api";
import { GlobalResponse } from "@/services/type/responses";

export type Product = {
    ID?: number;

    product_type: string;
    product_name: string;
    product_segment: string;

    warranty_length: number;
    stock?: number;
    price: number;

    specifications: string; // masih raw string dari backend

    headline: string;
    subheadline: string;
    product_code: string;

    // For fetched products this can be a base64 string; for uploads this will be a File
    display_image: File | string | undefined;
    ecommerce_url: string;
    shopee_url: string;
    tokopedia_url: string;
};

export type ProductType = 'laptop' | 'desktop' | 'server' | 'display' | 'tv' | 'iot' | 'aio' | ''

export type ProductSegment = "B2C" | 'B2G' | 'B2B';

export type NewProduct = {
    ID?: number;
    product_type: string;
    product_name: string;
    product_segment: ProductSegment;
    specifications: string;
    warranty_length: number;
    stock?: number;
    price: number;
    headline: string;
    subheadline: string;
    // Can be a File (when uploading) or string (when fetched from backend)
    display_image?: File | string;
    ecommerce_url: string;
    shopee_url: string;
    tokopedia_url: string;
}

export const addProduct = async (payload: Product) => {
    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            formData.append(key, value instanceof File ? value : String(value));
        }
    });

    return apiClient.post(`/api/products/add`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
}

export const getProductByID = async (id?: number) => {
    return apiClient.get<GlobalResponse<Product>>(`/api/products/${id}`)
}

export type ProductFilter = {
    type: string;
    sort: 'price_asc' | 'price_desc' | 'name_asc' | 'name_desc' | '';
}

export const getProducts = async (params?: ProductFilter) => {
    return apiClient.get<GlobalResponse<Product[]>>(`/api/products/`, { params })
}

export const deleteProduct = async (productID: number) => {
    return apiClient.delete<GlobalResponse<null>>(`/api/products/${productID}`)
}

export const updateProduct = async (payload: Product) => {
    const formData = new FormData();

    Object.entries(payload).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            formData.append(key, value instanceof File ? value : String(value));
        }
    });

    return apiClient.put<GlobalResponse<null>>(`/api/products/`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
}