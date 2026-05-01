package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/helper/dto"
	"gitlab.com/zyrex1/landing-page/helper/utils"
	"gitlab.com/zyrex1/landing-page/models"
	"gitlab.com/zyrex1/landing-page/services"
)

type ServiceCenterHandler struct {
	serviceCenter services.ServiceCenterService
}

func NewServiceCenterHandler(serviceCenter services.ServiceCenterService) *ServiceCenterHandler {
	return &ServiceCenterHandler{serviceCenter: serviceCenter}
}

func (h *ServiceCenterHandler) GetServiceCenter(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	searchQuery := c.Query("q")

	serviceCenter, err := h.serviceCenter.GetServiceCenter(searchQuery)
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       serviceCenter,
		Message:    "Service Center retrieved successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *ServiceCenterHandler) CreateServiceCenter(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	var serviceCenter models.ServiceCenter

	if err := c.ShouldBindJSON(&serviceCenter); err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	serviceCenter.BranchID = utils.GenerateBranchID(7)

	if serviceCenter.Name == "" || serviceCenter.Address == "" || serviceCenter.City == "" {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	if err := h.serviceCenter.CreateServiceCenter(&serviceCenter); err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusCreated,
		Data:       serviceCenter,
		Message:    "Service Center created successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *ServiceCenterHandler) ExportServiceCenter(c *gin.Context) {
	file, err := h.serviceCenter.ExportServiceCentersToExcel()
	if err != nil {
		_ = c.Error(err)
		return
	}

	fileName := "Service_Centers_Export.xlsx"
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", fileName))
	c.Header("Content-Transfer-Encoding", "binary")

	if err := file.Write(c.Writer); err != nil {
		_ = c.Error(err)
		return
	}
}

func (h *ServiceCenterHandler) ImportServiceCenter(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	if err := h.serviceCenter.ImportServiceCenter(file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusCreated,
		Data:       nil,
		Message:    "Service Center created successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *ServiceCenterHandler) UpdateByExcel(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file uploaded"})
		return
	}

	summary, err := h.serviceCenter.UpdateServiceCenterByExcel(file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusCreated,
		Data:       summary,
		Message:    fmt.Sprintf("Process finished: %d updated, %d created", summary["updated"], summary["created"]),
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *ServiceCenterHandler) DeleteServiceCenter(c *gin.Context) {
	id := c.Param("id")

	if err := h.serviceCenter.DeleteServiceCenter(id); err != nil {
		_ = c.Error(err)
		return
	}

	successResponse := dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       nil,
		Message:    "Service Center deleted successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *ServiceCenterHandler) UpdateServiceCenter(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	var serviceCenter models.ServiceCenter

	// Bind JSON langsung ke struct model
	if err := c.ShouldBindJSON(&serviceCenter); err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	// Validasi ID (GORM butuh ID untuk Save/Update)
	if serviceCenter.ID == 0 {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	// Validasi field wajib (Opsional)
	if serviceCenter.BranchID == "" || serviceCenter.Name == "" {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	if err := h.serviceCenter.UpdateServiceCenter(&serviceCenter); err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       nil,
		Message:    "Service Center updated successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}
