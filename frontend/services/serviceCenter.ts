import apiClient from "@/services/api";
import { GlobalResponse } from "@/services/type/responses";

export type ServiceCenter = {
  ID?: string;
  branch_id: string;
  name: string;
  branch_type: string;
  address: string;
  city: string;
  province_id: string;
  province: string;
  operational_hours: string;
  phone: string;
  pic: string;
  map_url: string;
};

export const getServiceCenters = async (q?: string) => {
  const safeQuery = q ? encodeURIComponent(q.trim()) : '';
  return apiClient.get<GlobalResponse<ServiceCenter[]>>(`/api/service-center/?q=${safeQuery}`);
};

export const addServiceCenter = async (payload: ServiceCenter) => {
  return apiClient.post<GlobalResponse<any>>(`/api/service-center/`, payload);
};

export const updateServiceCenter = async(payload: ServiceCenter) => {
  return apiClient.put<GlobalResponse<any>>(`/api/service-center/`, payload)
}

export const exportServiceCenter = async () => {
  return apiClient.get('/api/service-center/export', {
    responseType: 'blob',
  });
}

export const importServiceCenter = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient.post(`/api/service-center/import`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const updateBulkServiceCenter = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return apiClient.put(`/api/service-center/update/bulk`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const deleteServiceCenter = async (id: number) => {
  return apiClient.delete(`/api/service-center/${id}`);
};