package handlers

import (
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/helper/dto"
	"gitlab.com/zyrex1/landing-page/helper/utils"
	"gitlab.com/zyrex1/landing-page/models"
	"gitlab.com/zyrex1/landing-page/services"
)

type CustomerServiceHandler struct {
	service services.CustomerServiceService
}

func NewCustomerServiceHandler(service services.CustomerServiceService) *CustomerServiceHandler {
	return &CustomerServiceHandler{service: service}
}

func (h *CustomerServiceHandler) CreateServiceForm(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	var payload dto.CreateServiceFormDTO
	if err := c.ShouldBindJSON(&payload); err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}
	// parse date
	newDate, err := utils.ParseDateString(payload.ServiceDate)
	if err != nil {
		_ = c.Error(err)
		return
	}

	service := models.CustomerService{
		TicketID:       payload.TicketID,
		Name:           &payload.Name,
		Partner:        payload.Partner,
		Agent:          payload.Agent,
		Email:          &payload.Email,
		PhoneNumber:    &payload.PhoneNumber,
		Address:        payload.Address,
		BranchID:       &payload.BranchID,
		ProductType:    payload.ProductType,
		ProductSN:      &payload.ProductSN,
		Complaints:     payload.Complaints,
		ServiceDate:    newDate,
		ServiceType:    payload.ServiceType,
		TechnicianName: payload.TechnicianName,
	}
	appEnv := os.Getenv("ENV")
	qontakService := services.NewQontakService()

	isValidPhoneNumber, err := qontakService.ValidatePhoneNumber(*service.PhoneNumber)

	if err != nil {
		_ = c.Error(err)
		return
	}

	if !isValidPhoneNumber {
		c.JSON(http.StatusBadRequest, gin.H{
			"status":  "error",
			"message": "Phone (WhatsApp) Invalid",
		})
		_ = c.Error(err)
		return
	}

	createdService, err := h.service.CreateServiceForm(service)
	if err != nil {
		_ = c.Error(err)
		return
	}

	if appEnv != "prod" {
		if err := qontakService.SendMessage(createdService, services.MessageTypeConfirmation); err != nil {
			_ = c.Error(err)
			return
		}
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusCreated,
		Message:    "Service Form Created Successfully",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *CustomerServiceHandler) GetServiceForm(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	form, err := h.service.GetServiceForm(uint(id))
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusCreated,
		Message:    "Service Form Retrieved Successfully",
		Data:       form,
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *CustomerServiceHandler) GetDropdownRange(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	dropdownType := c.DefaultQuery("dropdown_type", "")
	q := c.DefaultQuery("q", "")

	values, err := h.service.GetDropdownRange(dropdownType, q)
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusCreated,
		Message:    "Dropdown Range Retrieved Successfully",
		Data:       values,
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *CustomerServiceHandler) GetAllCity(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	values, err := h.service.GetAllCity()
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusCreated,
		Message:    "Dropdown City Retrieved Successfully",
		Data:       values,
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *CustomerServiceHandler) AddDropdownRange(c *gin.Context) {
	var input dto.DropdownRange
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if input.Type == "" || input.Text == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "type and text are required"})
		return
	}

	err := h.service.AddDropdownRange(input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to add dropdown item"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "successfully added new dropdown item"})
}

func (h *CustomerServiceHandler) GetServiceFormByTicketID(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	rawTicketID := c.Param("ticket_id")
	rawTicketID = strings.TrimPrefix(rawTicketID, "/")

	ticketID, err := url.PathUnescape(rawTicketID)
	if ticketID == "" {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	form, err := h.service.GetServiceFormByTicketID(ticketID)
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusCreated,
		Message:    "Service Form Retrieved Successfully",
		Data:       form,
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *CustomerServiceHandler) GetAllServiceForms(c *gin.Context) {
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

	statusParam := c.Query("status")
	branchParam := c.Query("branch_id")
	agentParam := c.Query("agent")
	cityParam := c.QueryArray("city[]")
	typeParam := c.Query("service_type")
	sortParam := c.DefaultQuery("sort_form_date", "asc")

	var status *models.FormStatus

	if statusParam != "" {
		s, err := utils.ParseFormStatus(statusParam)
		if err != nil {
			_ = c.Error(err)
			return
		}
		status = &s
	}

	query, err := url.QueryUnescape(c.Query("q"))
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	forms, err := h.service.GetAllServiceForms(limit, page, status, query, branchParam, agentParam, cityParam, typeParam, sortParam)
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusCreated,
		Message:    "Service Form Retrieved Successfully",
		Data:       forms,
	}
	c.JSON(successResponse.StatusCode, successResponse)

}

func (h *CustomerServiceHandler) UpdateServiceStatus(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	var payload dto.UpdateServiceStatusDTO

	if err := c.ShouldBindJSON(&payload); err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	newStatus, ticketID, err := h.service.UpdateServiceStatus(payload.TicketID, models.FormStatus(payload.Status))
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Message:    "Service status updated successfully!",
		Data: map[string]string{
			"ticket_id": ticketID,
			"status":    newStatus,
		},
	}

	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *CustomerServiceHandler) UpdateServiceForm(c *gin.Context) {
	var payload dto.UpdateServicePayload

	if err := c.ShouldBindJSON(&payload); err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	if err := h.service.UpdateServiceForm(uint(payload.ID), payload); err != nil {
		_ = c.Error(err)
		return
	}

	// 4. Response
	c.JSON(http.StatusOK, dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Message:    "Service form updated successfully!",
	})
}

func (h *CustomerServiceHandler) ImportServiceForm(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	file, err := c.FormFile("file")
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	if err := h.service.ImportServiceForm(file); err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusCreated,
		Message:    "Service forms imported successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *CustomerServiceHandler) ExportServiceForms(c *gin.Context) {

	file, err := h.service.ExportServiceForms()
	if err != nil {
		_ = c.Error(err)
		return
	}

	fileName := "Service_Forms_Export.xlsx"
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", fileName))
	c.Header("Content-Transfer-Encoding", "binary")

	if err := file.Write(c.Writer); err != nil {
		_ = c.Error(err)
		return
	}
}

func (h *CustomerServiceHandler) GetCustomerInfo(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	name := c.Query("q")

	info, err := h.service.GetCustomerInfo(name)
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusCreated,
		Message:    "Customer Info Retrieved Successfully",
		Data:       info,
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *CustomerServiceHandler) DeleteServiceForm(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	if err := h.service.DeleteServiceForms(uint(id)); err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Message:    "Service form deleted successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *CustomerServiceHandler) AutoClosePendingServices(c *gin.Context) {
	cronToken := c.GetHeader("X-Cron-Token")
	if cronToken != os.Getenv("CRON_SECRET") {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	rows, err := h.service.AutoClosePendingServices()
	if err != nil {
		_ = c.Error(err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":       true,
		"rows_affected": rows,
		"message":       fmt.Sprintf("Successfully closed %d expired service requests", rows),
	})
}
