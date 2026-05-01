package models

import "gorm.io/gorm"

type ProductSegment string

const (
	B2B ProductSegment = "B2B"
	B2C ProductSegment = "B2C"
	B2G ProductSegment = "B2G"
)

type Product struct {
	gorm.Model
	Headline       string         `json:"headline"`
	Subheadline    string         `json:"subheadline"`
	ProductType    string         `gorm:"not null" json:"product_type"`
	ProductName    string         `gorm:"not null" json:"product_name"`
	ProductSegment ProductSegment `gorm:"not null" json:"product_segment"` //B2B, B2C
	WarrantyLength int            `gorm:"not null" json:"warranty_length"` // in days
	Stock          int            `gorm:"default:0" json:"stock"`
	Price          int            `gorm:"default:0" json:"price"`
	Specifications string         `gorm:"type:text" json:"specifications"`
	ProductCode    string         `json:"product_code"`
	DisplayImage   []byte         `gorm:"type:bytea" json:"display_image"`
	ECommerceURL   string         `json:"ecommerce_url"`
	ShopeeURL      string         `json:"shopee_url"`
	TokopediaURL   string         `json:"tokopedia_url"`
}
