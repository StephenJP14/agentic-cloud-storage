package handlers

import (
	"net/http"
	"os"
	"strconv"

	"github.com/gin-gonic/gin"
	"gitlab.com/zyrex1/landing-page/helper/dto"
	"gitlab.com/zyrex1/landing-page/services"
)

type UserHandler struct {
	service services.UserService
}

func NewUserHandler(service services.UserService) *UserHandler {
	return &UserHandler{service: service}
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	var errorResponse dto.GlobalResponseError

	var input services.CreateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusBadRequest,
			Message:    err.Error(),
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	user, err := h.service.CreateUser(&input)
	if err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusInternalServerError,
			Message:    err.Error(),
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusCreated,
		Data:       user,
		Message:    "User created successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *UserHandler) Login(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	var errorResponse dto.GlobalResponseError

	var input services.LoginInput

	if err := c.ShouldBindJSON(&input); err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusBadRequest,
			Message:    err.Error(),
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	token, user, err := h.service.Login(&input)
	if err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusUnauthorized,
			Message:    err.Error(),
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	env := os.Getenv("ENV") // "production", "staging", "local"

	isProd := env == "prod"

	// default config
	secure := isProd // secure cookie hanya pada HTTPS
	sameSite := http.SameSiteLaxMode
	domain := ""

	if isProd {
		// cookie untuk domain utama
		domain = ".zyrex.com"
		sameSite = http.SameSiteNoneMode
		secure = true
	}

	// STAGING pakai IP → tidak pakai domain
	// token akan menjadi host-only cookie
	http.SetCookie(c.Writer, &http.Cookie{
		Name:     "token",
		Value:    token,
		Path:     "/",
		MaxAge:   3600 * 24 * 365, // 1 Tahun
		Domain:   domain,          // kosong untuk IP
		Secure:   secure,
		HttpOnly: true,
		SameSite: sameSite,
	})

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       gin.H{"token": token, "user": user},
		Message:    "Login successful!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *UserHandler) GetUsers(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	var errorResponse dto.GlobalResponseError

	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusBadRequest,
			Message:    "failed to parse limit as integer",
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	pageStr := c.DefaultQuery("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusBadRequest,
			Message:    "failed to parse page as integer",
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	users, err := h.service.GetAllUsers(limit, page)
	if err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusInternalServerError,
			Message:    err.Error(),
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}
	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       users,
		Message:    "Users retrieved successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *UserHandler) GetUserByID(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	var errorResponse dto.GlobalResponseError
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusBadRequest,
			Message:    "Invalid user ID",
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	user, err := h.service.GetUserByID(uint(id))
	if err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusNotFound,
			Message:    err.Error(),
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       user,
		Message:    "User retrieved successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *UserHandler) UpdateUser(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	var errorResponse dto.GlobalResponseError
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusBadRequest,
			Message:    "Invalid user ID",
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	var input services.UpdateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusBadRequest,
			Message:    err.Error(),
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	user, err := h.service.UpdateUser(uint(id), &input)
	if err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusInternalServerError,
			Message:    err.Error(),
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       user,
		Message:    "User updated successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *UserHandler) DeleteUser(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	var errorResponse dto.GlobalResponseError

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusBadRequest,
			Message:    "Invalid user ID",
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	err = h.service.DeleteUser(uint(id))
	if err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusNotFound,
			Message:    err.Error(),
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Message:    "User deleted successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *UserHandler) GetAllUsers(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	var errorResponse dto.GlobalResponseError

	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusBadRequest,
			Message:    "failed to parse limit as integer",
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	pageStr := c.DefaultQuery("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusBadRequest,
			Message:    "failed to parse page as integer",
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	users, err := h.service.GetAllUsers(limit, page)
	if err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusInternalServerError,
			Message:    err.Error(),
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       users,
		Message:    "Users retrieved successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *UserHandler) VerifyUser(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	var errorResponse dto.GlobalResponseError

	username := c.GetString("username")
	if username == "" {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusUnauthorized,
			Message:    "Unauthorized: username not found in context",
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	user, err := h.service.VerifyUser(username)
	if err != nil {
		errorResponse = dto.GlobalResponseError{
			Success:    false,
			StatusCode: http.StatusInternalServerError,
			Message:    "User not found",
			Data:       nil,
		}
		c.JSON(errorResponse.StatusCode, errorResponse)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       user,
		Message:    "User verified successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *UserHandler) Logout(c *gin.Context) {
	c.SetCookie("token", "", -1, "/", "", false, true)
	c.JSON(http.StatusOK, "Cookie has been deleted")
}
