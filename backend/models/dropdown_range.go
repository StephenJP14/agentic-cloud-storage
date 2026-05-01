package models

type DropdownRange struct {
	Type string  `json:"type"`
	Text string  `json:"text"`
	HNH  *string `json:"h_nh,omitempty"`
}