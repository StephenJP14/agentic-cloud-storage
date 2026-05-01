package dto

type ActivateWarrantyDTO struct {
	ProductSN   string `json:"product_sn"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	PhoneNumber string `json:"phone_number"`
	Province    string `json:"province"`
	City        string `json:"city"`
}
