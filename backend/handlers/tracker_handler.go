 package handlers

import (
	"github.com/gin-gonic/gin"
	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/helper/dto"
	"gitlab.com/zyrex1/landing-page/models"
	"gitlab.com/zyrex1/landing-page/services"
	"net/http"
	"strconv"
)

type TrackerHandler struct {
	trackerService services.TrackerService
}

func NewTrackerHandler(trackerService services.TrackerService) *TrackerHandler {
	return &TrackerHandler{trackerService: trackerService}
}

func (h *TrackerHandler) CreateTracker(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	var tracker models.Tracker
	if err := c.ShouldBindJSON(&tracker); err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	if err := h.trackerService.CreateTracker(&tracker); err != nil {
		_ = c.Error(err)
		return
	}
	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusCreated,
		Data:       tracker,
		Message:    "Tracker created successfully!",
	}

	c.JSON(http.StatusCreated, successResponse)
}

func (h *TrackerHandler) GetTrackerByID(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	tracker, err := h.trackerService.GetTrackerByID(uint(id))
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       tracker,
		Message:    "Tracker retrieved successfully!",
	}
	c.JSON(http.StatusOK, successResponse)
}

func (h *TrackerHandler) GetTrackerByTicketID(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess
	ticketID := c.Param("ticket_id")

	tracker, err := h.trackerService.GetTrackerByTicketID(ticketID)
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       tracker,
		Message:    "Tracker retrieved successfully!",
	}
	c.JSON(http.StatusOK, successResponse)
}

func (h *TrackerHandler) GetAllTrackers(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	limitParam := c.DefaultQuery("limit", "25")
	pageParam := c.DefaultQuery("page", "1")

	limit, err := strconv.Atoi(limitParam)
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	page, err := strconv.Atoi(pageParam)
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	filters := make(map[string]interface{})
	if status := c.Query("service_status"); status != "" {
		filters["service_status"] = status
	}

	trackers, err := h.trackerService.GetAllTrackers(limit, page, filters)
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:	true,
		StatusCode: http.StatusOK,
		Data:       trackers,
		Message:    "Trackers retrieved successfully!",
	}
	c.JSON(http.StatusOK, successResponse)
}



func (h *TrackerHandler) UpdateTrackerStatus(c *gin.Context) {
	var successResponse dto.GlobalResponseSuccess

	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)
	if err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}

	if err := c.ShouldBindJSON(&dto.StatusUpdateDTO); err != nil {
		_ = c.Error(apperrors.ErrInvalidInput)
		return
	}
	
	err = h.trackerService.UpdateTrackerStatus(uint(id), dto.StatusUpdateDTO.Status)
	if err != nil {
		_ = c.Error(err)
		return
	}

	successResponse = dto.GlobalResponseSuccess{
		Success:    true,
		StatusCode: http.StatusOK,
		Data:       nil,
		Message:    "Tracker status updated successfully!",
	}
	c.JSON(successResponse.StatusCode, successResponse)
}
