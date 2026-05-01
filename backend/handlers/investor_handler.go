package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gitlab.com/zyrex1/landing-page/helper/dto"
	"gitlab.com/zyrex1/landing-page/models"
	"gitlab.com/zyrex1/landing-page/services"
)

type InvestorHandler struct {
	service services.InvestorService
}

func NewInvestorHandler(service services.InvestorService) *InvestorHandler {
	return &InvestorHandler{service: service}
}

func (h *InvestorHandler) InsertInvestorRelations(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	var data models.InvestorRelations
	if err := c.ShouldBindJSON(&data); err != nil {
		_ = c.Error(err)
		return
	}
	if err := h.service.InsertInvestorRelations(data); err != nil {
		_ = c.Error(err)
		return
	}
	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       nil,
		Message:    "Investor relations data inserted/updated successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}

func (h *InvestorHandler) GetAllInvestorFiles(c *gin.Context) {
	reportType := c.DefaultQuery("type", "")

	var successResponse dto.GlobalResponseSuccess
	investorFiles, err := h.service.GetAllInvestorFiles(reportType)
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       investorFiles,
		Message:    "Investor files retrieved successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}
