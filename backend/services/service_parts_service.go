package services

import (
	"gitlab.com/zyrex1/landing-page/models"
	"gitlab.com/zyrex1/landing-page/repo"
)

type ServicePartService interface {
	UpsertServicePart(parts []models.ServicePart) error
	DeleteServicePart(id uint) error
}

type servicePartService struct {
	repo repo.ServicePartRepository
}

func NewServicePartService(repo repo.ServicePartRepository) ServicePartService {
	return &servicePartService{repo: repo}
}

func (s *servicePartService) UpsertServicePart(parts []models.ServicePart) error {
	return s.repo.UpsertServicePart(parts)
}

func (s *servicePartService) DeleteServicePart(id uint) error {
	return s.repo.DeleteServicePart(id)
}
