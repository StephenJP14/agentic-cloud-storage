package models

import "gorm.io/gorm"

type User struct {
	gorm.Model
	Username   string `json:"username" gorm:"not null;uniqueIndex"`
	Password   string `json:"-" gorm:"not null"`
	Role       string `json:"role" gorm:"not null"`
	BranchID   string `json:"branch_id"`
	Department string `json:"department"`
}
