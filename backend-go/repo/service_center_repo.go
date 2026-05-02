package repo

import (
	"errors"
	"fmt"

	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/models"
	"gorm.io/gorm"
)

type ServiceCenterRepository interface {
	GetServiceCenter(q string) ([]models.ServiceCenter, error)
	CreateServiceCenter(serviceCenter *models.ServiceCenter) error
	ExportServiceCenters() ([]models.ServiceCenter, error)
	BulkCreateServiceCenter(data []models.ServiceCenter) error
	UpdateByBranchID(branchID string, data map[string]interface{}) error
	UpdateServiceCenter(serviceCenter *models.ServiceCenter) error
	FindByBranchID(branchID string, dest *models.ServiceCenter) error
	DeleteServiceCenter(id uint) error
}

type serviceCenterRepository struct {
	db *gorm.DB
}

func NewServiceCenterRepository(db *gorm.DB) ServiceCenterRepository {
	return &serviceCenterRepository{db: db}
}

func (r *serviceCenterRepository) GetServiceCenter(q string) ([]models.ServiceCenter, error) {
	var serviceCenters []models.ServiceCenter
	tx := r.db

	if q != "" {
		formattedQuery := "%" + q + "%"

		tx = tx.Where(
			"name ILIKE ? OR address ILIKE ? OR city ILIKE ? OR province ILIKE ? OR branch_id ILIKE ? OR pic ILIKE ? OR phone ILIKE ?",
			formattedQuery, formattedQuery, formattedQuery, formattedQuery, formattedQuery, formattedQuery, formattedQuery,
		)
	}

	err := tx.Find(&serviceCenters).Error
	return serviceCenters, err
}

func (r *serviceCenterRepository) FindByBranchID(branchID string, dest *models.ServiceCenter) error {
	if branchID == "" {
		return errors.New("empty branch id")
	}
	return r.db.Where("branch_id = ?", branchID).First(dest).Error
}

func (r *serviceCenterRepository) CreateServiceCenter(serviceCenter *models.ServiceCenter) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(serviceCenter).Error; err != nil {
			return fmt.Errorf("%w: creating serviceCenter: %w", apperrors.ErrInternal, err)
		}
		return nil
	})
}

func (r *serviceCenterRepository) ExportServiceCenters() ([]models.ServiceCenter, error) {
	var data []models.ServiceCenter
	if err := r.db.Find(&data).Error; err != nil {
		return nil, err
	}
	return data, nil
}

func (r *serviceCenterRepository) BulkCreateServiceCenter(data []models.ServiceCenter) error {
	return r.db.Create(&data).Error
}

func (r *serviceCenterRepository) UpdateByBranchID(branchID string, data map[string]interface{}) error {
	return r.db.Model(&models.ServiceCenter{}).
		Where("branch_id = ?", branchID).
		Updates(data).Error
}

func (r *serviceCenterRepository) DeleteServiceCenter(id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Cek apakah data ada
		var sc models.ServiceCenter
		if err := tx.First(&sc, id).Error; err != nil {
			return fmt.Errorf("service center not found: %w", err)
		}

		// Hapus data
		if err := tx.Delete(&sc).Error; err != nil {
			return fmt.Errorf("failed to delete service center: %w", err)
		}
		return nil
	})
}

func (r *serviceCenterRepository) UpdateServiceCenter(serviceCenter *models.ServiceCenter) error {
    return r.db.Transaction(func(tx *gorm.DB) error {
        var existing models.ServiceCenter
        if err := tx.First(&existing, serviceCenter.ID).Error; err != nil {
            return fmt.Errorf("service center not found: %w", err)
        }

        if err := tx.Save(serviceCenter).Error; err != nil {
            return fmt.Errorf("%w: updating serviceCenter: %w", apperrors.ErrInternal, err)
        }
        return nil
    })
}