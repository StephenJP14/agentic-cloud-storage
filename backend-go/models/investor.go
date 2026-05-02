package models

import "gorm.io/gorm"

type InvestorType string

const (
	TypeRUPS               InvestorType = "rups"
	TypeAnnualReport       InvestorType = "annual-report"
	TypeProspectus         InvestorType = "prospectus"
	TypeFinancialStatement InvestorType = "financial-statement"
)

type InvestorRelations struct {
	gorm.Model
	Year    string       `json:"year" gorm:"type:varchar(4);not null"`
	Quartal string       `json:"quartal" gorm:"type:varchar(10)"`
	URL     string       `json:"url" gorm:"type:text;not null"`
	Type    InvestorType `json:"type" gorm:"type:text;"`
}
