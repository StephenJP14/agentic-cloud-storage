package middleware

import (
	"github.com/gin-gonic/gin"
	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/helper/dto"
)

func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) == 0 {
			return
		}

		err := c.Errors.Last().Err
		statusCode := apperrors.MapErrorToHTTPStatus(err)

		if c.Writer.Written() {
			return
		}

		c.JSON(statusCode, dto.GlobalResponseError{
			Success:    false,
			StatusCode: statusCode,
			Message:    apperrors.GetUserFriendlyMessage(err),
			Data:       nil,
		})
	}
}
