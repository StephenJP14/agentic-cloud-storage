package models

import (
	"time"

	"gorm.io/gorm"
)

type ServiceStatus string

const (
	ServicePending   ServiceStatus = "pending"
	ServiceOngoing   ServiceStatus = "ongoing"
	ServiceCompleted ServiceStatus = "completed"
	ServiceFailed    ServiceStatus = "failed"
)

type Tracker struct {
	gorm.Model
	TicketID      string        `gorm:"uniqueIndex;not null" json:"ticket_id"`
	ServiceStatus ServiceStatus `gorm:"type:varchar(20);check:service_status IN ('pending','ongoing','completed','failed');default:'pending'" json:"service_status"`
	BranchID      string        `json:"branch_id" gorm:"not null"`
	AdmissionDate time.Time     `gorm:"not null" json:"admission_date"`
	Complains     string        `json:"complains"`
	ProductSN     string        `json:"product_sn"`
	CustomerName  string        `json:"customer_name"`
	PhoneNumber   string        `json:"phone_number"`
	Email         string        `json:"email"`
}
