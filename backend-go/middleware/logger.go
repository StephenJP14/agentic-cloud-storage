package middleware

// import (
// 	"log"
// 	"os"
// 	"time"

// 	"github.com/gin-gonic/gin"
// )

// func GinLogger(logFilePath string) gin.HandlerFunc {
// 	file, err := os.OpenFile(
// 		logFilePath,
// 		os.O_APPEND|os.O_CREATE|os.O_WRONLY,
// 		0644,
// 	)
// 	if err != nil {
// 		panic("failed to open log file: " + err.Error())
// 	}

// 	logger := log.New(file, "", log.LstdFlags)

// 	return func(c *gin.Context) {
// 		start := time.Now()

// 		// process request
// 		c.Next()

// 		latency := time.Since(start)

// 		statusCode := c.Writer.Status()
// 		method := c.Request.Method
// 		path := c.FullPath()
// 		if path == "" {
// 			path = c.Request.URL.Path // fallback
// 		}

// 		clientIP := c.ClientIP()

// 		logger.Printf(
// 			"%s | %s | %d | %v | %s",
// 			method,
// 			path,
// 			statusCode,
// 			latency,
// 			clientIP,
// 		)
// 	}
// }
