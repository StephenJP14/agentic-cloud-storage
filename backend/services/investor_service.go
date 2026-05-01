package services

import (
	"gitlab.com/zyrex1/landing-page/models"
	"gitlab.com/zyrex1/landing-page/repo"
)

type InvestorService interface {
	InsertInvestorRelations(data models.InvestorRelations) error
	GetAllInvestorFiles(reportType string) ([]*models.InvestorRelations, error)
}

type investorService struct {
	repo repo.InvestorRepository
}

func NewInvestorService(repo repo.InvestorRepository) InvestorService {
	return &investorService{repo: repo}
}

func (s *investorService) InsertInvestorRelations(data models.InvestorRelations) error {
	return s.repo.InsertInvestorRelations(data)
}

func (s *investorService) GetAllInvestorFiles(reportType string) ([]*models.InvestorRelations, error) {
    return s.repo.GetAllInvestorFiles(reportType)
}
