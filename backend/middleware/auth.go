package middleware

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("userRole")
		if !exists || role.(string) != "superadmin" {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			return
		}
		c.Next()
	}
}

func RequirePermissions(roles []string, dept []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		userRole := c.GetString("userRole")
		userDept := c.GetString("userDepartment")

		// Check roles (AND logic)
		if len(roles) > 0 {
			match := false
			for _, r := range roles {
				if userRole == r {
					match = true
					break
				}
			}
			if !match {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
					"error": "forbidden: insufficient role",
				})
				return
			}
		}

		// Check departments (AND logic)
		if len(dept) > 0 {
			match := false
			for _, d := range dept {
				if userDept == d {
					match = true
					break
				}
			}
			if !match {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
					"error": "forbidden: insufficient department",
				})
				return
			}
		}

		// Both checks passed → allow
		c.Next()
	}
}


func APIKeyMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := c.GetHeader("X-API-KEY")
		expectedAPIKey := os.Getenv("API_KEY")
		if apiKey != expectedAPIKey {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error": "invalid API key",
			})
			return
		}
		c.Next()
	}
}