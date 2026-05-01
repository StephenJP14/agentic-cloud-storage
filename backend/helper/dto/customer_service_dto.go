package dto

import (
	// "time"

	"time"

	"gitlab.com/zyrex1/landing-page/models"
)

type CreateServiceFormDTO struct {
	TicketID       string  `json:"ticket_id"`
	Name           string  `json:"name"`
	Partner        *string `json:"partner"`
	Agent          *string `json:"agent"`
	Email          string  `json:"email"`
	PhoneNumber    string  `json:"phone_number"`
	Address        *string `json:"address"`
	BranchID       string  `json:"branch_id"`
	ProductSN      string  `json:"product_sn"`
	ProductType    *string `json:"product_type"`
	Complaints     *string `json:"complaints"`
	ServiceDate    string  `json:"service_date"`
	ServiceType    *string `json:"service_type"`
	TechnicianName *string `json:"technician_name"`
}

type UpdateServiceStatusDTO struct {
	Status   string `json:"status"`
	TicketID string `json:"ticket_id"`
}

type UpdateServicePayload struct {
	ID             int     `json:"id"`
	Name           *string `json:"name"`
	Email          *string `json:"email"`
	PhoneNumber    *string `json:"phone_number"`
	Address        *string `json:"address"`
	City           *string `json:"city"`
	Partner        *string `json:"partner"`
	ProductSN      *string `json:"product_sn"`
	Complaints     *string `json:"complaints"`
	ServiceStatus  string  `json:"service_status"`
	ROID           string  `json:"roid"`
	Agent          *string `json:"agent"` //customer service agent
	ServiceType    *string `json:"service_type"`
	TechnicianName *string `json:"technician_name"`
	ProductType    *string `json:"product_type"`
	WarrantyStatus *string `json:"warranty_status"`
	PurchasedDate  *string `json:"purchased_date"`
	Solution       *string `json:"solution"`
	SolutionRO     *string `json:"solution_ro"`
	Quantity       *int    `json:"quantity"`
	HNH            *string `json:"h_nh"` //hardware or non-hardware
	ServiceRemarks *string `json:"service_remarks"`
	FormDate       *string `json:"form_date"`
	FinishedDate   *string `json:"finished_date"`
	ServiceDate    *string `json:"service_date"`
	MacAdrNew      *string `json:"mac_adr_new"`
	MacAdrOld      *string `json:"mac_adr_old"`
	ReportStatus   *string `json:"report_status"`
	ROSupport      *string `json:"ro_support"`
	SLA            *string `json:"sla"`
	PrintCopy      *int    `json:"print_copy"`
}

type FormsWithParts struct {
	models.CustomerService
	ServiceParts []models.ServicePart `json:"service_parts"`
}

type UpsertServicePartsDTO struct {
	ServiceParts []models.ServicePart `json:"service_parts" binding:"required"`
}

type DropdownRange struct {
	Type string  `json:"type"`
	Text string  `json:"text"`
	HNH  *string `json:"h_nh"`
}

type CustomerInfo struct {
	Name        string `json:"name"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
	Address     string `json:"address"`
	City        string `json:"city"`
}

type EmailServiceRequest struct {
	TicketID  string
	Complains string
	Date      time.Time
}
