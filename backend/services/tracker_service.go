package services

import (
	"gitlab.com/zyrex1/landing-page/models"
	"gitlab.com/zyrex1/landing-page/repo"
)

type TrackerService interface {
	CreateTracker(tracker *models.Tracker) error
	GetTrackerByID(id uint) (*models.Tracker, error)
	GetAllTrackers(limit, page int, filters map[string]interface{}) ([]models.Tracker, error)
	UpdateTrackerStatus(id uint, status models.ServiceStatus) error
	GetTrackerByTicketID(ticketID string) (*models.Tracker, error)
}

type trackerService struct {
	trackerRepo repo.TrackerRepo
}

func NewTrackerService(trackerRepo repo.TrackerRepo) TrackerService {
	return &trackerService{trackerRepo: trackerRepo}
}

func (s *trackerService) CreateTracker(tracker *models.Tracker) error {
	return s.trackerRepo.CreateTracker(tracker)
}

func (s *trackerService) GetTrackerByID(id uint) (*models.Tracker, error) {
	return s.trackerRepo.GetTrackerByID(id)
}

func (s *trackerService) GetTrackerByTicketID(ticketID string) (*models.Tracker, error) {
	return s.trackerRepo.GetTrackerByTicketID(ticketID)
} 

func (s *trackerService) GetAllTrackers(limit, page int, filters map[string]interface{}) ([]models.Tracker, error) {
	return s.trackerRepo.GetAllTrackers(limit, page, filters)
}

func (s *trackerService) UpdateTrackerStatus(id uint, status models.ServiceStatus) error {
	return s.trackerRepo.UpdateTrackerStatus(id, status)
}