package handlers

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/helper/dto"
	"gitlab.com/zyrex1/landing-page/services"
	"io"
	"net/http"
	"strconv"
)

type WarrantyHandler struct {
	service services.WarrantyService
}

func NewWarrantyHandler(service services.WarrantyService) *WarrantyHandler {
	return &WarrantyHandler{service: service}
}

func (h *WarrantyHandler) GetAllWarranties(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	pageStr := c.DefaultQuery("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	query := c.Query("q")

	warranties, err := h.service.GetAllWarranties(limit, page, query)
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       warranties,
		Message:    "Product warranty retrieved!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *WarrantyHandler) CheckWarrantyStatus(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	productSN := c.Param("productSN")
	if productSN == "" {
		_ = c.Error(apperrors.ErrInvalidInput)
		c.Abort()
		return
	}

	warr, remaining_days, err := h.service.FindWarrantyStatusByProductSN(productSN)
	if err != nil {
		_ = c.Error(err)
		c.Abort()
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Message:    "Successfully Obtained Warranty Status",
		Data: gin.H{
			"status":          warr.WarrantyStatus,
			"expiry_date":     warr.ExpiryDate,
			"remaining_days":  remaining_days,
			"warranty_length": warr.WarrantyLength,
			"product_sn":      productSN,
			"name":            warr.Name,
			"product_type":    warr.ProductType,
			"product_model":   warr.ProductModel,
		},
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *WarrantyHandler) ActivateProductWarrant(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	var payload dto.ActivateWarrantyDTO
	if err := c.ShouldBindJSON(&payload); err != nil {
		fmt.Println(payload)
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	expiredDate, remainingDays, err := h.service.ActivateProductWarranty(payload)
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data: gin.H{
			"expiry_date":    expiredDate,
			"remaining_days": remainingDays,
			"product_sn":     payload.ProductSN,
			"status":         "active",
		},
		Message: "Product warranty activated!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

// ImportWarranties handles uploading a CSV file and importing warranty rows.
// Expects a multipart/form-data request with field name `file`.
func (h *WarrantyHandler) ImportWarranties(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	file, err := c.FormFile("file")
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	openedFile, err := file.Open()
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}
	defer openedFile.Close()

	bytes, err := io.ReadAll(openedFile)
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	inserted, skipped, errorsList, err := h.service.ImportWarrantiesFromCSV(bytes)
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Message:    "Import completed",
		Data: gin.H{
			"inserted": inserted,
			"skipped":  skipped,
			"errors":   errorsList,
		},
	}
	c.JSON(successResponse.StatusCode, successResponse)
}
