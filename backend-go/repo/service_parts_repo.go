package repo

import (
	"fmt"

	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/models"
	"gorm.io/gorm"
)

type ServicePartRepository interface {
	UpsertServicePart(part []models.ServicePart) error
	DeleteServicePart(id uint) error
}

type servicePartRepository struct {
	db *gorm.DB
}

func NewServicePartRepository(db *gorm.DB) ServicePartRepository {
	return &servicePartRepository{db: db}
}

func (r *servicePartRepository) UpsertServicePart(parts []models.ServicePart) error {
	if len(parts) == 0 {
		return nil
	}

	for _, part := range parts {
		if part.ID == 0 || part.TicketID == "" {
			if err := r.db.Create(&part).Error; err != nil {
				return fmt.Errorf("%w creating service part: %w", apperrors.ErrInternal, err)
			}
		} else {
			if err := r.db.Model(&models.ServicePart{}).Where("id = ?", part.ID).Updates(map[string]interface{}{
				"part_name": part.PartName,
				"ticket_id": part.TicketID,
				"remarks":   part.Remarks,
				"quantity":  part.Quantity,
			}).Error; err != nil {
				return fmt.Errorf("%w updating service part for ID: %d, %w", apperrors.ErrInternal, part.ID, err)
			}
		}
	}

	return nil
}

func (r *servicePartRepository) DeleteServicePart(id uint) error {
	if err := r.db.Where("id = ?", id).Delete(&models.ServicePart{}).Error; err != nil {
		return fmt.Errorf("%w deleting service part for ID: %d, %w", apperrors.ErrInternal, id, err)
	}
	return nil
}
