package routes

import (
	"os"

	"github.com/gin-gonic/gin"
	"gitlab.com/zyrex1/landing-page/handlers"
	"gitlab.com/zyrex1/landing-page/middleware"
	"gitlab.com/zyrex1/landing-page/repo"
	"gitlab.com/zyrex1/landing-page/services"
	"gorm.io/gorm"
)

func SetupRoutes(router *gin.Engine, db *gorm.DB) {
	router.Use(middleware.ErrorHandler())
	// router.Use(middleware.GinLogger("logs/app.log"))

	userRepository := repo.NewUserRepository(db)
	userService := services.NewUserService(userRepository)
	userHandler := handlers.NewUserHandler(userService)

	productRepository := repo.NewProductRepository(db)
	productService := services.NewProductService(productRepository)
	productHandler := handlers.NewProductHandler(productService)

	warrantyRepository := repo.NewWarrantyRepository(db, productRepository)
	warrantyService := services.NewWarrantyService(warrantyRepository)
	warrantyHandler := handlers.NewWarrantyHandler(warrantyService)

	customerServiceRepository := repo.NewCustomerServiceRepository(db)
	customerServiceService := services.NewCustomerServiceService(customerServiceRepository)
	customerServiceHandler := handlers.NewCustomerServiceHandler(customerServiceService)

	servicePartRepository := repo.NewServicePartRepository(db)
	servicePartService := services.NewServicePartService(servicePartRepository)
	servicePartHandler := handlers.NewServicePartHandler(servicePartService)

	newsRepository := repo.NewNewsRepository(db)
	newsService := services.NewNewsService(newsRepository)
	newsHandler := handlers.NewNewsHandler(newsService)

	serviceCenterRepository := repo.NewServiceCenterRepository(db)
	serviceCenterService := services.NewServiceCenterService(serviceCenterRepository)
	serviceCenterHandler := handlers.NewServiceCenterHandler(serviceCenterService)

	trackerRepository := repo.NewTrackerRepo(db)
	trackerService := services.NewTrackerService(trackerRepository)
	trackerHandler := handlers.NewTrackerHandler(trackerService)

	investorRepository := repo.NewInvestorRepository(db)
	investorService := services.NewInvestorService(investorRepository)
	investorHandler := handlers.NewInvestorHandler(investorService)

	qontakService := services.NewQontakService()
	qontakHandler := handlers.NewQontakHandler(qontakService)

	api := router.Group("/api")

	//api.Use(middleware.AuthMiddleware())
	api.POST("/webhook/qontak", qontakHandler.QontakWebhook)

	userRoutes := api.Group("/users")
	{
		userRoutes.POST("/", userHandler.CreateUser)
		userRoutes.GET("/", userHandler.GetUsers)
		userRoutes.GET("/:id", userHandler.GetUserByID)
		userRoutes.PUT("/:id", userHandler.UpdateUser)
		userRoutes.DELETE("/:id", userHandler.DeleteUser)
		userRoutes.GET("/verify", userHandler.VerifyUser)
		userRoutes.GET("/all-users", userHandler.GetAllUsers)
	}
	authGroup := api.Group("/auth")
	{
		authGroup.POST("/login", userHandler.Login)
		authGroup.POST("/logout", userHandler.Logout)
	}

	productRoutes := api.Group("/products")
	{
		productRoutes.GET("/", productHandler.GetProducts)
		productRoutes.POST("/add", productHandler.AddProduct)
		productRoutes.PUT("/", productHandler.UpdateProduct)
		productRoutes.DELETE("/:productID", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), productHandler.DeleteProduct)
		productRoutes.GET("/:id", productHandler.GetProductByID)
	}

	warrantyRoutes := api.Group("/warranties")
	{
		warrantyRoutes.GET("/", warrantyHandler.GetAllWarranties)
		warrantyRoutes.GET("/:productSN", warrantyHandler.CheckWarrantyStatus)
		warrantyRoutes.POST("/:productSN", warrantyHandler.ActivateProductWarrant)
		warrantyRoutes.POST("/import", warrantyHandler.ImportWarranties)
	}

	customerServiceRoutes := api.Group("/cs")
	{
		customerServiceRoutes.POST("/", customerServiceHandler.CreateServiceForm)
		customerServiceRoutes.GET("/dropdown", customerServiceHandler.GetDropdownRange)
		customerServiceRoutes.GET("/dropdown/city", customerServiceHandler.GetAllCity)
		customerServiceRoutes.POST("/dropdown", customerServiceHandler.AddDropdownRange)
		// customerServiceRoutes.GET("/:id", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), customerServiceHandler.GetServiceForm)
		customerServiceRoutes.GET("/", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), customerServiceHandler.GetAllServiceForms)
		customerServiceRoutes.GET("/:id", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), customerServiceHandler.GetServiceForm)
		customerServiceRoutes.GET("/status/*ticket_id", customerServiceHandler.GetServiceFormByTicketID)
		customerServiceRoutes.PUT("/status", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), customerServiceHandler.UpdateServiceStatus)
		//customerServiceRoutes.PUT("/form", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), customerServiceHandler.UpdateServiceForm)
		customerServiceRoutes.PUT("/update", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), customerServiceHandler.UpdateServiceForm)
		customerServiceRoutes.POST("/import", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), customerServiceHandler.ImportServiceForm)
		customerServiceRoutes.GET("/export", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), customerServiceHandler.ExportServiceForms)
		customerServiceRoutes.GET("/dropdown/customer", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), customerServiceHandler.GetCustomerInfo)
		customerServiceRoutes.DELETE("/:id", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), customerServiceHandler.DeleteServiceForm)

		cronRoutes := customerServiceRoutes.Group("/tasks")
		{
			cronRoutes.POST("/auto-close", customerServiceHandler.AutoClosePendingServices)
		}
	}

	servicePartRoutes := api.Group("/service-parts")
	{
		servicePartRoutes.POST("/upsert", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), servicePartHandler.UpsertServiceParts)
		servicePartRoutes.DELETE("/:id", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), servicePartHandler.DeleteServicePart)
	}

	newsRoutes := api.Group("/news")
	{
		newsRoutes.GET("/", newsHandler.GetNewsByCategory)
		newsRoutes.GET("/:id", newsHandler.GetNewsByID)
		newsRoutes.POST("/", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), newsHandler.CreateNews)
		newsRoutes.PUT("/:id", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), newsHandler.UpdateNews)
		newsRoutes.DELETE("/:id", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), newsHandler.DeleteNews)
	}

	serviceCenterRoutes := api.Group("/service-center")
	{
		serviceCenterRoutes.GET("/", serviceCenterHandler.GetServiceCenter)
		serviceCenterRoutes.POST("/", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), serviceCenterHandler.CreateServiceCenter)
		serviceCenterRoutes.PUT("/", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), serviceCenterHandler.UpdateServiceCenter)
		serviceCenterRoutes.GET("/export", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), serviceCenterHandler.ExportServiceCenter)
		serviceCenterRoutes.POST("/import", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), serviceCenterHandler.ImportServiceCenter)
		serviceCenterRoutes.PUT("/update/bulk", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), serviceCenterHandler.UpdateByExcel)
		serviceCenterRoutes.DELETE("/:id", middleware.AuthMiddleware(os.Getenv("JWT_SECRET_KEY")), serviceCenterHandler.DeleteServiceCenter)
	}

	trackerRoutes := api.Group("/tracker")
	{
		trackerRoutes.POST("/", trackerHandler.CreateTracker)
		trackerRoutes.GET("/:id", trackerHandler.GetTrackerByID)
		trackerRoutes.GET("/", trackerHandler.GetAllTrackers)
		trackerRoutes.PUT("/:id/status", trackerHandler.UpdateTrackerStatus)
		trackerRoutes.GET("/ticket/:ticketID", trackerHandler.GetTrackerByTicketID)
	}

	investorRoutes := api.Group("/investor-relation")
	{
		investorRoutes.POST("/", investorHandler.InsertInvestorRelations)
		investorRoutes.GET("/", investorHandler.GetAllInvestorFiles)
	}
}
