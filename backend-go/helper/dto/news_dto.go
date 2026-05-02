package dto

type CreateNewsDTO struct {
	ID       uint    `json:"id,omitempty"`
	Title    string  `json:"title"`
	Author   string  `json:"author"`
	Content  string  `json:"content"`
	Category string  `json:"category"`
	Date     string  `json:"date"`
	Image    *[]byte `json:"image"`
}
