package middleware

import (
	"fmt"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gitlab.com/zyrex1/landing-page/apperrors"
)

func getJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET_KEY")

	return []byte(secret)
}

type JWTClaims struct {
	UserID     uint   `json:"user_id"`
	Username   string `json:"username"`
	Role       string `json:"role"`
	Department string `json:"department"`
	jwt.RegisteredClaims
}

// GenerateToken creates a new JWT token for a given user
func GenerateToken(userID uint, role string, username string, department string) (string, error) {
	claims := &JWTClaims{
		UserID:     userID,
		Username:   username,
		Role:       role,
		Department: department,

		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   fmt.Sprintf("%d", userID),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJWTSecret())
}

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr, err := c.Cookie("token")
		if err != nil || tokenStr == "" {
			_ = c.Error(apperrors.ErrUnauthorized)
			c.Abort()
			return
		}

		claims := &JWTClaims{}
		token, err := jwt.ParseWithClaims(
			tokenStr,
			claims,
			func(t *jwt.Token) (interface{}, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
				}
				return []byte(jwtSecret), nil
			},
		)

		if err != nil || !token.Valid {
			_ = c.Error(apperrors.ErrUnauthorized)
			c.Abort()
			return
		}

		c.Set("auth", claims)
		c.Next()
	}
}
