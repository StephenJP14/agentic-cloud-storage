package repo

import (
	"errors"
	"fmt"

	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/models"
	"gorm.io/gorm"
)

type NewsRepository interface {
	GetNewsByCategory(category string) ([]models.News, error)
	CreateNews(news *models.News) error
	UpdateNews(news *models.News, id uint) error
	DeleteNews(id uint) error
	GetNewsByID(id uint) (*models.News, error)
}

type newsRepository struct {
	db *gorm.DB
}

func NewNewsRepository(db *gorm.DB) NewsRepository {
	return &newsRepository{db: db}
}

func (r *newsRepository) GetNewsByCategory(category string) ([]models.News, error) {
	var news []models.News
	tx := r.db

	if category != "" {
		tx = tx.Where("category = ?", category)
	}
	err := tx.Order("date DESC").Limit(10).Find(&news).Error
	return news, err
}

func (r *newsRepository) CreateNews(news *models.News) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(news).Error; err != nil {
			return fmt.Errorf("%w: creating news: %w", apperrors.ErrInternal, err)
		}
		return nil
	})
}

func (r *newsRepository) UpdateNews(news *models.News, id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		switch news.Image {
		case nil:
			if err := tx.Exec("UPDATE news SET title = ?, author = ?, content = ?, category = ?, date = ? WHERE id = ?",
				news.Title, news.Author, news.Content, news.Category, news.Date, id).Error; err != nil {
				return fmt.Errorf("%w: updating news: %w", apperrors.ErrInternal, err)
			}
		default:
			if err := tx.Exec("UPDATE news SET title = ?, author = ?, content = ?, category = ?, date = ?, image = ? WHERE id = ?",
				news.Title, news.Author, news.Content, news.Category, news.Date, news.Image, id).Error; err != nil {
				return fmt.Errorf("%w: updating news: %w", apperrors.ErrInternal, err)
			}
		}
		return nil
	})
}

func (r *newsRepository) DeleteNews(id uint) error {
	var news models.News
	if err := r.db.Where("id = ?", id).First(&news).Error; err != nil {
		return fmt.Errorf("%w: news with ID %d not found", apperrors.ErrNotFound, id)
	}

	err := r.db.Unscoped().Delete(&news).Error
	if err != nil {
		return fmt.Errorf("%w: deleting news: %w", apperrors.ErrInternal, err)
	}
	return nil

}

func (r *newsRepository) GetNewsByID(id uint) (*models.News, error) {
	var news models.News
	if err := r.db.Where("id = ?", id).First(&news).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("%w: news with ID %d not found", apperrors.ErrNotFound, id)
		}
		return nil, fmt.Errorf("%w: getting news: %w", apperrors.ErrInternal, err)
	}
	return &news, nil
}
