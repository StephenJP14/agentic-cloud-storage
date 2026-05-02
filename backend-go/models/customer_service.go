package models

import (
	"time"

	"gorm.io/gorm"
)

type FormStatus string

const (
	Pending   FormStatus = "pending"
	Confirmed FormStatus = "confirmed"
	Contacted FormStatus = "contacted"
	Responded FormStatus = "responded"
	Ongoing   FormStatus = "ongoing"
	Completed FormStatus = "completed"
	Closed    FormStatus = "closed"
)

type CustomerService struct {
	gorm.Model
	//cust input + old struct
	TicketID      string     `gorm:"uniqueIndex;not null" json:"ticket_id"`
	Name          *string    `json:"name"`
	Email         *string    `json:"email"`
	PhoneNumber   *string    `json:"phone_number"`
	BranchID      *string    `json:"branch_id"`
	Address       *string    `json:"address"`
	City          *string    `json:"city"`
	ProductSN     *string    `json:"product_sn"`
	Complaints    *string    `gorm:"type:text" json:"complaints"`
	ServiceDate   time.Time  `json:"service_date"`
	ServiceStatus FormStatus `gorm:"type:varchar(20);not null;default:pending" json:"service_status"`
	//present data
	FormDate       time.Time  `gorm:"default:CURRENT_TIMESTAMP" json:"form_date"`
	Partner        *string    `json:"partner"`
	FinishedDate   *time.Time `json:"finished_date"`
	ROID           string     `json:"roid"`
	Agent          *string    `json:"agent"` //customer service agent
	ServiceType    *string    `json:"service_type"`
	TechnicianName *string    `json:"technician_name"`
	ProductType    *string    `json:"product_type"`
	WarrantyStatus *string    `json:"warranty_status"`
	PurchasedDate  *time.Time `json:"purchased_date"`
	Solution       *string    `gorm:"type:text" json:"solution"`
	SolutionRO     *string    `json:"solution_ro"`
	HNH            *string    `json:"h_nh"` //hardware or non-hardware
	MacAdrNew      *string    `json:"mac_adr_new"`
	MacAdrOld      *string    `json:"mac_adr_old"`
	ReportStatus   *string    `json:"report_status"`
	ROSupport      *string    `json:"ro_support"`
	//part 123
	ServiceRemarks *string `gorm:"type:text" json:"service_remarks"`
	SLA            *string `json:"sla"`
	PrintCopy      *int    `json:"print_copy" gorm:"default:0"`
}
