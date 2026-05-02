package dto

type CreateOrderRequest struct {
	Items    []CreateOrderItem
	Customer CreateOrderCustomer
}

type CreateOrderItem struct {
	Code     string
	Name     string
	Price    int64
	Quantity int
}

type CreateOrderCustomer struct {
	FirstName string
	LastName  string
	Email     string
	Phone     string
}

type CreateOrderResponse struct {
	OrderCode   string
	SnapToken   string
	RedirectURL string
}
