package models

import (
	"time"

	"gorm.io/gorm"
)

type News struct {
	gorm.Model
	Title    string    `gorm:"not null" json:"title"`
	Author   string    `gorm:"not null" json:"author"`
	Content  string    `gorm:"type:text" json:"content"`
	Category string    `gorm:"not null" json:"category"`
	Date     time.Time `gorm:"not null" json:"date"`
	Image    *[]byte   `gorm:"type:bytea" json:"image"`
}
