import apiClient from "@/services/api";
import { GlobalResponse } from "@/services/type/responses";

export type ServiceStatus = "pending" | "ongoing" | "completed" | "failed";

export type Tracker = {
  ID?: string;
  ticket_id: string;
  branch_id: string;
  service_status: string;
  admission_date: string;
  product_sn: string;
  customer_name: string;
  phone_number: string;
  email: string;
};

export type GetTrackerPayload = {
  limit: number;
  page: number;
  service_status?: ServiceStatus;
};

export const createTracker = async (payload: Tracker) => {
  return apiClient.post<GlobalResponse<any>>(`/api/tracker/`, { payload })
}

export const getTrackers = async (data: GetTrackerPayload) => {
  return apiClient.get<GlobalResponse<Tracker[]>>(`/api/tracker/`, {
    params: {
      ...data,
    },
  });
};

export const updateTrackerStatus = async (
  id: string,
  status: ServiceStatus,
) => {
  return apiClient.put<GlobalResponse<null>>(`/api/tracker/${id}/status`, {
    service_status: status,
  });
};
