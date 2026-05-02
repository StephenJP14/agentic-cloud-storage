package services

import (
	"gitlab.com/zyrex1/landing-page/models"
	"gitlab.com/zyrex1/landing-page/repo"
)

type ProductService interface {
	GetProducts(productTypes []string, sort string) ([]models.Product, error)
	GetProductsByTypes(productTypes []string, priceSort, nameSort string) ([]models.Product, error)
	AddProduct(product *models.Product) error
	UpdateProduct(product *models.Product, productID uint) error
	DeleteProduct(productID uint) error
	GetProductByID(ID uint) (*models.Product, error)
}

type productService struct {
	repo repo.ProductRepository
}

func NewProductService(repo repo.ProductRepository) ProductService {
	return &productService{repo: repo}
}

func (s *productService) GetProducts(productTypes []string, sort string) ([]models.Product, error) {
	return s.repo.GetProducts(productTypes, sort)
}

func (s *productService) GetProductsByTypes(productTypes []string, priceSort, nameSort string) ([]models.Product, error) {
	return s.repo.GetProductsByTypes(productTypes, priceSort, nameSort)
}

func (s *productService) AddProduct(product *models.Product) error {
	return s.repo.AddProduct(product)
}

func (s *productService) UpdateProduct(product *models.Product, productID uint) error {
	return s.repo.UpdateProduct(product, productID)
}

func (s *productService) DeleteProduct(productID uint) error {
	return s.repo.DeleteProduct(productID)
}

func (s *productService) GetProductByID(ID uint) (*models.Product, error) {
	return s.repo.GetProductByID(ID)
}
