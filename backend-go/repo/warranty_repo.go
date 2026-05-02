package repo

import (
	"errors"
	"fmt"
	"time"

	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/models"
	"gorm.io/gorm"
	"strings"
)

type WarrantyRepository interface {
	FindWarrantyStatusByProductSN(productSN string) (*models.Warranty, int, error)
	ActivateProductWarranty(warranty models.Warranty) error
	FindWarrantyLength(productSN string) (int, error)
	InsertWarrantyData(warranty models.Warranty) error
	GetAllWarranties(limit int, page int, q string) ([]models.Warranty, error)
}

type warrantyRepository struct {
	db          *gorm.DB
	productRepo ProductRepository
}

func NewWarrantyRepository(db *gorm.DB, productRepo ProductRepository) WarrantyRepository {
	return &warrantyRepository{db: db, productRepo: productRepo}
}

func (r *warrantyRepository) GetAllWarranties(limit int, page int, q string) ([]models.Warranty, error) {
	var warranties []models.Warranty

	offset := (page - 1) * limit

	tx := r.db.Model(&models.Warranty{})

	if q != "" {
		query := "%" + q + "%"

		columns := []string{
			"product_sn",
			"name",
			"email",
			"product_model",
			"product_type",
			"phone_number",
			"province",
			"city",
			"CAST(warranty_status AS TEXT)",
		}

		searchQuery := strings.Join(func() []string {
			res := make([]string, len(columns))
			for i, col := range columns {
				res[i] = col + " ILIKE ?"
			}
			return res
		}(), " OR ")

		args := make([]interface{}, len(columns))
		for i := range args {
			args[i] = query
		}

		tx = tx.Where(searchQuery, args...)
	}

	err := tx.Limit(limit).Offset(offset).Order("created_at DESC").Find(&warranties).Error

	if err != nil {
		return nil, fmt.Errorf("failed to fetch warranties: %w", err)
	}

	return warranties, nil
}

func (r *warrantyRepository) FindWarrantyStatusByProductSN(productSN string) (*models.Warranty, int, error) {
	var warranty models.Warranty
	if err := r.db.Where("product_sn = ?", productSN).First(&warranty).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, fmt.Errorf("%w for product SN: %s, %v", apperrors.ErrNotFound, productSN, err)
		}
		return nil, 0, fmt.Errorf("%w finding warranty for product SN: %s, %v", apperrors.ErrInternal, productSN, err)
	}

	remainingDays := int(time.Until(*warranty.ExpiryDate).Hours() / 24) //in days

	return &warranty, remainingDays, nil
}

func (r *warrantyRepository) ActivateProductWarranty(warranty models.Warranty) error {
	if err := r.db.Model(&warranty).Where("product_sn = ?", warranty.ProductSN).Updates(map[string]interface{}{
		"name":            warranty.Name,
		"email":           warranty.Email,
		"phone_number":    warranty.PhoneNumber,
		"province":        warranty.Province,
		"city":            warranty.City,
		"activation_date": warranty.ActivationDate,
		"warranty_status": warranty.WarrantyStatus,
		"expiry_date":     warranty.ExpiryDate,
	}).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("%w for product SN: %s", apperrors.ErrNotFound, warranty.ProductSN)
		}
		return fmt.Errorf("%w for activating product warranty: %v", apperrors.ErrInternal, err)
	}
	return nil
}

func (r *warrantyRepository) FindWarrantyLength(productSN string) (int, error) {
	var product models.Product
	if err := r.db.Where("product_sn = ?", productSN).First(&product).Error; err != nil {
		return 0, err
	}
	return product.WarrantyLength, nil
}

func (r *warrantyRepository) InsertWarrantyData(warranty models.Warranty) error {
	if err := r.db.Create(&warranty).Error; err != nil {
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return fmt.Errorf("%w for product SN: %s", apperrors.ErrDuplicateSN, warranty.ProductSN)
		}

		errStr := err.Error()
		if strings.Contains(errStr, "duplicate key") || strings.Contains(errStr, "23505") {
			return fmt.Errorf("%w for product SN: %s", apperrors.ErrDuplicateSN, warranty.ProductSN)
		}

		return fmt.Errorf("%w inserting warranty data: %v", apperrors.ErrInternal, err)
	}
	return nil
}
