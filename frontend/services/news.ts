import apiClient from "@/services/api";
import { GlobalResponse } from "@/services/type/responses";

export type NewsCategory = 'artikel' | 'audiensi' | 'csr' | 'news' | 'uncategorized' | '';

export type CreateNewsDTO = {
    title: string
    author: string
    content: string
    category: string
    date: string
    image?: File
}

export type NewsType = {
    ID: number
    title: string
    author: string
    content: string
    category: string
    date: string
    image: File
}

export const getNews = async () => {
    return apiClient.get<GlobalResponse<NewsType[]>>(`/api/news/`)
}

export const getNewsByID = async (id: number) => {
    return apiClient.get<GlobalResponse<NewsType>>(`/api/news/${id}`)
}

export const deleteNews = async (id: number) => {
    return apiClient.delete<GlobalResponse<NewsType>>(`/api/news/${id}`)
}

export const updateNews = async (id: number, formData: FormData) => {
    return apiClient.put<GlobalResponse<NewsType[]>>(`/api/news/${id}`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    })
}

export const GetNewsByCategory = async (category: string) => {
    return apiClient.get<GlobalResponse<NewsType[]>>(`/api/news/?category=${category}`)
}

export const AddNews = async (formData: FormData) => {
    return apiClient.post(`/api/news/`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
};
