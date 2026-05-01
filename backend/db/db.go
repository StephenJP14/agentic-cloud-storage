package db

import (
	"fmt"
	"log"
	"os"

	_ "time/tzdata"

	"github.com/joho/godotenv"
	"gitlab.com/zyrex1/landing-page/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	_ = godotenv.Load()

	dbHost := os.Getenv("DB_HOST")
	dbUser := os.Getenv("DB_USER")
	dbPort := os.Getenv("DB_PORT")
	dbPw := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable", dbHost, dbUser, dbPw, dbName, dbPort)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	DB.Exec("SET TIME ZONE 'Asia/Jakarta'")
	fmt.Println("Database connection established successfully.")

	err = DB.AutoMigrate(
		&models.User{},
		//warranties and services
		&models.Warranty{},
		&models.CustomerService{},
		&models.ServicePart{},
		//products
		&models.Product{},
		//news
		&models.News{},
		&models.ServiceCenter{},
		//tracker
		&models.Tracker{},
		&models.DropdownRange{},
		&models.InvestorRelations{},
	)

	if err != nil {
		log.Fatalf("Failed to auto-migrate database: %v", err)
	}

	fmt.Println("Database migrated successfully.")
}
