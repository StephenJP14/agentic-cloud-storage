package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/helper/dto"
	"gitlab.com/zyrex1/landing-page/helper/utils"
	"gitlab.com/zyrex1/landing-page/models"
	"gitlab.com/zyrex1/landing-page/services"
)

type NewsHandler struct {
	service services.NewsService
}

func NewNewsHandler(service services.NewsService) *NewsHandler {
	return &NewsHandler{service: service}
}

func (h *NewsHandler) GetNewsByCategory(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	category := c.DefaultQuery("category", "")

	news, err := h.service.GetNewsByCategory(category)
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       news,
		Message:    "News retrieved successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *NewsHandler) GetNewsByID(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	ID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	news, err := h.service.GetNewsByID(uint(ID))
	if err != nil {
		_ = c.Error(err)
		c.Abort()
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       news,
		Message:    "News retrieved successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *NewsHandler) CreateNews(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	title := c.PostForm("title")
	author := c.PostForm("author")
	content := c.PostForm("content")
	category := c.PostForm("category")
	dateStr := c.PostForm("date")

	if title == "" || author == "" || content == "" || category == "" || dateStr == "" {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	date, err := utils.ParseDateString(dateStr)
	if err != nil {
		_ = c.Error(err)
		return
	}

	var imageBytes *[]byte
	file, err := c.FormFile("image")
	if err == nil {
		// File was uploaded
		openedFile, err := file.Open()
		if err != nil {
			_ = c.Error(apperrors.ErrInvalidInput)
			return
		}
		defer openedFile.Close()

		bytes := make([]byte, file.Size)
		_, err = openedFile.Read(bytes)
		if err != nil {
			_ = c.Error(apperrors.ErrInvalidInput)
			return
		}
		imageBytes = &bytes
	}

	news := models.News{
		Title:    title,
		Author:   author,
		Content:  content,
		Category: category,
		Date:     date,
		Image:    imageBytes,
	}

	if err := h.service.CreateNews(&news); err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusCreated,
		Data:       nil,
		Message:    "News created successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *NewsHandler) UpdateNews(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	ID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	// Parse form data
	title := c.PostForm("title")
	author := c.PostForm("author")
	content := c.PostForm("content")
	category := c.PostForm("category")
	dateStr := c.PostForm("date")

	// Validate required fields
	if title == "" || author == "" || content == "" || category == "" || dateStr == "" {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	// Parse date
	date, err := utils.ParseDateString(dateStr)
	if err != nil {
		_ = c.Error(err)
		return
	}

	// Handle image file upload
	var imageBytes *[]byte
	file, err := c.FormFile("image")
	if err == nil {
		// File was uploaded
		openedFile, err := file.Open()
		if err != nil {
			_ = c.Error(apperrors.ErrInvalidInput)
			return
		}
		defer openedFile.Close()

		// Read file contents into byte slice
		bytes := make([]byte, file.Size)
		_, err = openedFile.Read(bytes)
		if err != nil {
			_ = c.Error(apperrors.ErrInvalidInput)
			return
		}
		imageBytes = &bytes
	}
	// If no file uploaded, imageBytes remains nil

	news := models.News{
		Title:    title,
		Author:   author,
		Content:  content,
		Category: category,
		Date:     date,
		Image:    imageBytes,
	}

	if err := h.service.UpdateNews(&news, uint(ID)); err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       nil,
		Message:    "News updated successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *NewsHandler) DeleteNews(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	ID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	if err := h.service.DeleteNews(uint(ID)); err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       nil,
		Message:    "News deleted successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}
