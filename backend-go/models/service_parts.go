package models

import "gorm.io/gorm"

type ServicePart struct {
	gorm.Model
	PartName string  `gorm:"not null" json:"part_name"`
	TicketID string  `gorm:"not null;index" json:"ticket_id"`
	Remarks  *string `json:"remarks"`
	Quantity int     `gorm:"default:1" json:"quantity"`
}
