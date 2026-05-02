package repo

import (
	"fmt"

	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/models"
	"gorm.io/gorm"
)

type InvestorRepository interface {
	InsertInvestorRelations(data models.InvestorRelations) error
	GetAllInvestorFiles(reportType string) ([]*models.InvestorRelations, error)
}

type investorRepository struct {
	db *gorm.DB
}

func NewInvestorRepository(db *gorm.DB) InvestorRepository {
	return &investorRepository{db: db}
}

func (r *investorRepository) InsertInvestorRelations(data models.InvestorRelations) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var sqlQuery string
		var args []interface{}

		if data.Type == models.TypeRUPS {
			sqlQuery = `INSERT INTO investor_relations (year, quartal, url, type, created_at, updated_at) 
                VALUES (?, ?, ?, ?, NOW(), NOW())`
			args = []interface{}{data.Year, data.Quartal, data.URL, data.Type}
		} else {
			// Target conflict harus sesuai dengan nama kolom di constraint UNIQUE yang baru
			sqlQuery = `INSERT INTO investor_relations (year, quartal, url, type, created_at, updated_at) 
                VALUES (?, ?, ?, ?, NOW(), NOW()) 
                ON CONFLICT (year, quartal, type) 
                DO UPDATE SET url = EXCLUDED.url, updated_at = NOW()`
			args = []interface{}{data.Year, data.Quartal, data.URL, data.Type}
		}

		if err := tx.Exec(sqlQuery, args...).Error; err != nil {
			return fmt.Errorf("%w: inserting investor relations: %v", apperrors.ErrInternal, err)
		}
		return nil
	})
}

func (r *investorRepository) GetAllInvestorFiles(reportType string) ([]*models.InvestorRelations, error) {
	var investorRelations []*models.InvestorRelations

	query := r.db

	if reportType != "" {
		query = query.Where("type = ?", reportType)
	}

	err := query.Find(&investorRelations).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("%w: investor relations not found", apperrors.ErrNotFound)
		}
		return nil, fmt.Errorf("%w: finding documents: %v", apperrors.ErrInternal, err)
	}
	return investorRelations, nil
}
