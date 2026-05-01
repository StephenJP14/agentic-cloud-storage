package models

import (
	"time"

	"gorm.io/gorm"
)

type WarrantyStatus string

const (
	WarrantyActive   WarrantyStatus = "active"
	WarrantyExpired  WarrantyStatus = "expired"
	WarrantyInactive WarrantyStatus = "inactive"
)

type Warranty struct {
	gorm.Model
	ProductSN    string `gorm:"uniqueIndex" json:"product_sn"`
	ProductType  string `gorm:"not null" json:"product_type"`
	ProductModel string `gorm:"not null" json:"product_model"`

	ActivationDate *time.Time     `json:"activation_date"`
	ExpiryDate     *time.Time     `json:"expiry_date"`
	DODate         *time.Time     `json:"do_date"`
	WarrantyLength int            `gorm:"not null" json:"warranty_length"` // in days
	WarrantyStatus WarrantyStatus `gorm:"type:varchar(20);check:warranty_status IN ('active','expired','inactive');default:'inactive'" json:"warranty_status"`

	Name        string `json:"name"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
	Province    string `json:"province"`
	City        string `json:"city"`
}
