import apiClient from "@/services/api";
import { GlobalResponse } from "@/services/type/responses";

export type InvestorRelationType = 'rups' | 'annual-report' | 'prospectus' | 'financial-statement'

export type InvestorRelationData = {
    ID?: number;
    year: string;
    quartal?: string;
    url: string;
    type: InvestorRelationType;
}

export const uploadInvestorRelationData = async (payload: InvestorRelationData) => {
    return apiClient.post<GlobalResponse<null>>(`/api/investor-relation/`, payload);
}

export const getInvestorRelationData = async (type?: string) => {
    return apiClient.get<GlobalResponse<InvestorRelationData[]>>(`/api/investor-relation/?type=${type ? type: ''}`);
}
