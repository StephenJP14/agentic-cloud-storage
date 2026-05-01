package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/helper/dto"
	"gitlab.com/zyrex1/landing-page/services"
)

type ServicePartHandler struct {
	service services.ServicePartService
}

func NewServicePartHandler(service services.ServicePartService) *ServicePartHandler {
	return &ServicePartHandler{service: service}
}

func (h *ServicePartHandler) UpsertServiceParts(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	var payload dto.UpsertServicePartsDTO

	if err := c.ShouldBindJSON(&payload); err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	if err := h.service.UpsertServicePart(payload.ServiceParts); err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Message:    "Service parts upserted successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *ServicePartHandler) DeleteServicePart(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	if err := h.service.DeleteServicePart(uint(id)); err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Message:    "Service part deleted successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}
