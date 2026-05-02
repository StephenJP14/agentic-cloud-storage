package models

import (
	"gorm.io/gorm"
)

type ServiceCenter struct {
	gorm.Model
	BranchID         string `gorm:"uniqueIndex" json:"branch_id"`
	Name             string `gorm:"not null" json:"name"`
	BranchType       string `json:"branch_type"`
	Address          string `json:"address"`
	City             string `json:"city"`
	ProvinceID       string `json:"province_id"`
	Province         string `json:"province"`
	OperationalHours string `json:"operational_hours"`
	Phone            string `json:"phone"`
	PIC              string `json:"pic"`
	MapURL           string `json:"map_url"`
}
