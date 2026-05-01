package main

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gitlab.com/zyrex1/landing-page/db"
	"gitlab.com/zyrex1/landing-page/repo"
	"gitlab.com/zyrex1/landing-page/routes"
	"gitlab.com/zyrex1/landing-page/services"
	"log"
	"os"
)

func main() {
	r := gin.Default()
	// r.Use(gin.Recovery()) // <-- biar panic tetap ditangani

	r.RedirectTrailingSlash = false
	appEnv := os.Getenv("ENV")

	corsConfig := cors.Config{
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "X-API-KEY", "X-Requested-With"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}

	if appEnv == "prod" {
		corsConfig.AllowOrigins = []string{
			"https://zyrex.com",
			"https://www.zyrex.com",
		}
	} else {
		corsConfig.AllowOrigins = []string{
			"http://localhost:3000",
			"http://localhost:3001",
			"http://127.0.0.1:3000",
			"http://192.168.1.10:3000",
			"http://192.168.1.10:4000",
			"http://192.168.1.10:3001",
		}
	}

	r.Use(cors.New(corsConfig))

	r.OPTIONS("/*path", func(c *gin.Context) {
		c.AbortWithStatus(204)
	})

	db.InitDB()
	database := db.DB // Get the GORM DB instance
	userRepo := repo.NewUserRepository(database)
	userService := services.NewUserService(userRepo)

	if err := userService.CreateInitialAdmin(); err != nil {
		log.Fatalf("Fatal error: Could not create initial admin user. %v", err)
	}

	routes.SetupRoutes(r, database)

	if err := r.Run("0.0.0.0:8080"); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
	log.Println("Server running on :8080")
}
