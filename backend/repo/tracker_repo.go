package repo

import (
	"errors"
	"fmt"

	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/models"
	"gorm.io/gorm"
)

type TrackerRepo interface {
	CreateTracker(tracker *models.Tracker) error
	GetTrackerByID(id uint) (*models.Tracker, error)
	GetAllTrackers(limit, page int, filters map[string]interface{}) ([]models.Tracker, error)
	UpdateTrackerStatus(id uint, status models.ServiceStatus) error
	GetTrackerByTicketID(ticketID string) (*models.Tracker, error)
}

type trackerRepo struct {
	db *gorm.DB
}

func NewTrackerRepo(db *gorm.DB) *trackerRepo {
	return &trackerRepo{db: db}
}

func (r *trackerRepo) CreateTracker(tracker *models.Tracker) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(tracker).Error; err != nil {
			return fmt.Errorf("%w: creating tracker: %w", apperrors.ErrInternal, err)
		}
		return nil
	})
}

func (r *trackerRepo) GetTrackerByID(id uint) (*models.Tracker, error) {
	var tracker models.Tracker
	if err := r.db.First(&tracker, id).Error; err != nil {
		return nil, fmt.Errorf("%w: fetching tracker: %w", apperrors.ErrInternal, err)
	}
	return &tracker, nil
}

func (r *trackerRepo) GetAllTrackers(limit, page int, filters map[string]interface{}) ([]models.Tracker, error) {
	var trackers []models.Tracker

	if limit <= 0 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	if page < 1 {
		page = 1
	}

	offset := (page - 1) * limit
	orderByCase := "CASE WHEN service_status = 'pending' THEN 1 WHEN service_status = 'ongoing' THEN 2 WHEN service_status = 'completed' THEN 3 WHEN service_status = 'failed' THEN 4 ELSE 5 END"

	allowed := map[string]bool{
		"service_status": true,
	}

	query := r.db.Model(&models.Tracker{})

	for key, value := range filters {
		if !allowed[key] {
			continue
		}
		query = query.Where(fmt.Sprintf("%s = ?", key), value)
	}

	if err := query.
		Limit(limit).
		Offset(offset).
		Find(&trackers).
		Order(orderByCase).
		Order("created_at DESC").Error; err != nil {

		return nil, fmt.Errorf("%w: fetching trackers: %w", apperrors.ErrInternal, err)
	}

	return trackers, nil
}



func (r *trackerRepo) UpdateTrackerStatus(id uint, status models.ServiceStatus) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("UPDATE trackers SET service_status = ? WHERE id = ?", status, id).Error; err != nil {
			return fmt.Errorf("%w: updating tracker status: %w", apperrors.ErrInternal, err)
		}
		return nil
	})
}

func (r *trackerRepo) GetTrackerByTicketID(ticketID string) (*models.Tracker, error) {
	var tracker models.Tracker
	if err := r.db.Where("ticket_id = ?", ticketID).First(&tracker).Error; err != nil {
		if errors.Is(gorm.ErrRecordNotFound, err) {
			return nil, apperrors.ErrNotFound
		}
		return nil, fmt.Errorf("%w: fetching tracker by ticket ID: %w", apperrors.ErrInternal, err)
	}
	return &tracker, nil
}