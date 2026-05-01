import axios from 'axios';
import { signout } from './auth';

const IS_SERVER = typeof window === 'undefined';
const baseURL = IS_SERVER
    ? (process.env.API_URL || "http://backend:8080")
    : (process.env.NEXT_PUBLIC_API_URL || "https://localhost:3000");

const apiClient = axios.create({
    baseURL: baseURL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        "X-API-KEY": process.env.NEXT_PUBLIC_API_KEY || process.env.API_KEY || "",
    },
});

apiClient.interceptors.response.use(
    res => res,
    async error => {
        if (error.response?.status === 401) {
            await signout();
            if (!IS_SERVER) {
                window.location.href = '/dashboard/login';
            }
            return Promise.reject(error);
        }

        const data = error.response?.data;

        if (data instanceof Blob) {
            const text = await data.text();
            try {
                const json = JSON.parse(text);
                return Promise.reject(json);
            } catch {
                return Promise.reject({
                    message: text || "Export failed",
                });
            }
        }
        return Promise.reject(error);
    }
);

export default apiClient;