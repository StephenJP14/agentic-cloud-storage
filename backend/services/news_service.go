package services

import (
	"gitlab.com/zyrex1/landing-page/models"
	"gitlab.com/zyrex1/landing-page/repo"
)

type NewsService interface {
	GetNewsByCategory(category string) ([]models.News, error)
	CreateNews(news *models.News) error
	UpdateNews(news *models.News, id uint) error
	DeleteNews(id uint) error
	GetNewsByID(id uint) (*models.News, error)
}

type newsService struct {
	repo repo.NewsRepository
}

func NewNewsService(repo repo.NewsRepository) NewsService {
	return &newsService{repo: repo}
}

func (s *newsService) GetNewsByCategory(category string) ([]models.News, error) {
	return s.repo.GetNewsByCategory(category)
}

func (s *newsService) CreateNews(news *models.News) error {
	return s.repo.CreateNews(news)
}

func (s *newsService) UpdateNews(news *models.News, id uint) error {
	return s.repo.UpdateNews(news, id)
}

func (s *newsService) DeleteNews(id uint) error {
	return s.repo.DeleteNews(id)
}

func (s *newsService) GetNewsByID(id uint) (*models.News, error) {
	return s.repo.GetNewsByID(id)
}
