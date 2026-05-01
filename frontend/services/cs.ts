import apiClient from "@/services/api";
import { GlobalResponse } from "@/services/type/responses";

export type BookingServiceDTO = {
    UpdatedAt?: string;
    ID: number;
    name: string;
    email: string;
    phone_number: string;
    product_sn: string;
    complaints: string;
    service_date: string;
    address: string;
    service_status: ServiceStatus;
    // AssignedTo: string;
    ticket_id: string;
    branch_id: string;

    form_date: string | null;
    finished_date: string | null; // or Date
    roid: string;
    agent?: string | null;
    service_type?: string | null;
    technician_name?: string | null;
    product_type?: string | null;
    warranty_status?: string | null;
    purchased_date?: string | null; // or Date
    solution?: string | null;
    solution_ro?: string | null;
    quantity?: number | null;
    h_nh?: string | null;
    service_remarks?: string | null;
    sla?: string | null;
    service_parts?: ServiceParts[];
    ro_support: string;
    mac_adr_new: string;
    mac_adr_old: string;
    city: string;
    partner: string;
    report_status: string;
    print_copy?: number;
};

export type WarrantyStatus = 'active' | 'expired' | 'unset';
export type ServiceStatus = 'pending' | 'confirmed' | 'contacted' | 'responded' | 'ongoing' | 'completed' | 'closed';

export type ServiceParts = {
    ID: number;
    ticket_id: string;
    part_name: string;
    quantity: number;
    remarks?: string;
};

export type CreateServicePayload = {
    ticket_id: string;
    branch_id: string;
    name: string;
    email: string;
    phone_number: string;
    address: string;
    product_sn: string;
    complaints: string;
    service_date: string;
    product_type?: string;
    partner?: string;
    agent?: string;
    service_type: string;
    technician_name?: string;
    city?: string;
};

export type UpdateServiceStatus = {
    status: ServiceStatus;
    ticket_id?: string;
};

export type ServiceSearchParams = {
    page: number;
    limit: number;
    status: ServiceStatus;
    q: string;
    branch_id: string;
    city: string[];
    service_type: string;
    sort_form_date: 'asc' | 'desc';
    agent: string;
};

export type DropdownRange = {
    type: string;
    text: string;
    h_nh?: string;
}

export const getDropdownRanges = async (type: string, q: string) => {
    return apiClient.get<GlobalResponse<DropdownRange[]>>(`/api/cs/dropdown`, {
        params: {
            dropdown_type: type,
            q: q
        },
    });
};

export const addNewDropdownValue = async (payload: DropdownRange) => {
    return apiClient.post<GlobalResponse<any>>(`/api/cs/dropdown`, payload);
};

export type Customer = {
    name: string;
    email: string;
    phone_number: string;
    address: string;
    city: string;
}

export const getCustomer = async (q: string) => {
    return apiClient.get<GlobalResponse<Customer[]>>(`/api/cs/dropdown/customer`, {
        params: {
            q: q
        }
    });
};

export const getProductType = async (q: string) => {
    return apiClient.get<GlobalResponse<string[]>>(`/api/cs/dropdown/product-type`, {
        params: {
            q: q
        }
    });
};

export const BookServiceAppointment = async (payload: CreateServicePayload) => {
    return apiClient.post<GlobalResponse<null>>(`/api/cs/`, payload);
};

export const deleteServiceRequest = async (id: number) => {
    return apiClient.delete<GlobalResponse<null>>(`/api/cs/${id}`);
};

export const getServices = async (searchParams?: ServiceSearchParams) => {
    const sanitizedParams = searchParams ? {
        ...searchParams,
        q: encodeURIComponent(searchParams.q.trim())
    } : undefined;

    return apiClient.get<GlobalResponse<BookingServiceDTO[]>>(`/api/cs/`, {
        params: sanitizedParams,
    });
};

export const getServiceById = async (id: string) => {
    return apiClient.get<GlobalResponse<BookingServiceDTO>>(`/api/cs/${id}`);
};

export const getCities = async () => {
    return apiClient.get<GlobalResponse<any>>(`/api/cs/dropdown/city`);
};

export const getServiceStatus = async (ticketId: string) => {
    return apiClient.get<GlobalResponse<BookingServiceDTO>>(
        `/api/cs/status/${encodeURIComponent(ticketId)}`,
    );
};

export const updateServiceStatus = async (payload: UpdateServiceStatus) => {
    return apiClient.put<GlobalResponse<any>>(`/api/cs/status`, payload);
};

export const updateService = async (payload: BookingServiceDTO) => {
    return apiClient.put<GlobalResponse<any>>(`/api/cs/update`, payload);
};

export const importServiceBookings = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.post(`/api/cs/import`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const exportServiceForms = async () => {
    return apiClient.get(`/api/cs/export`, {
        responseType: 'blob',
    });
};


export const upsertServiceParts = async (payload: ServiceParts[]) => {
    return apiClient.post<GlobalResponse<any>>(`/api/service-parts/upsert`, { service_parts: payload });
};