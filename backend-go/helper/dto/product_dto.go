package dto

import "gitlab.com/zyrex1/landing-page/models"

type AddProductDTO struct {
	Headline       string                `json:"headline"`
	Subheadline    string                `json:"subheadline"`
	ProductType    string                `json:"product_type"`
	ProductName    string                `json:"product_name"`
	ProductSegment models.ProductSegment `json:"product_segment"`
	Specifications string                `json:"specifications"`
	WarrantyLength int                   `json:"warranty_length"`
	Price          int                   `json:"price"`
	ProductCode    string                `json:"product_code"`
	DisplayImage   []byte                `json:"display_image"`
}

type UpdateProductDTO struct {
	ID             uint                  `json:"id"`
	Headline       string                `json:"headline"`
	Subheadline    string                `json:"subheadline"`
	ProductType    string                `json:"product_type"`
	ProductName    string                `json:"product_name"`
	ProductSegment models.ProductSegment `json:"product_segment"`
	Specifications string                `json:"specifications"`
	WarrantyLength int                   `json:"warranty_length"`
	Price          int                   `json:"price"`
	ProductCode    string                `json:"product_code"`
	DisplayImage   []byte                `json:"display_image"`
}

type GetProductDTO struct {
	NameSort    string   `json:"name_sort"`
	PriceSort   string   `json:"price_sort"`
	ProductType []string `json:"product_type"`
}
