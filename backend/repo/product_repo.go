package repo

import (
	"fmt"

	"github.com/lib/pq"
	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/models"
	"gorm.io/gorm"

	"strings"
)

type ProductRepository interface {
	GetProducts(productTypes []string, sort string) ([]models.Product, error)
	GetProductsByTypes(productTypes []string, priceSort, nameSort string) ([]models.Product, error)
	AddProduct(product *models.Product) error
	UpdateProduct(product *models.Product, productID uint) error
	DeleteProduct(productID uint) error
	GetProductByID(ID uint) (*models.Product, error)
}

type productRepository struct {
	db *gorm.DB
}

// NewProductRepository TODO: the flow is wrong, its not using product type
func NewProductRepository(db *gorm.DB) ProductRepository {
	return &productRepository{db: db}
}

func (r *productRepository) GetProducts(productTypes []string, sort string) ([]models.Product, error) {
	var products []models.Product
	var args []interface{}

	// Base Query
	sqlQuery := "SELECT * FROM products"

	// Filter Type
	if len(productTypes) > 0 {
		// Menggunakan ANY(?) untuk PostgreSQL
		sqlQuery += " WHERE product_type = ANY(?)"
		args = append(args, pq.Array(productTypes))
	}

	// Order By Segment (Prioritas Utama)
	sqlQuery += ` ORDER BY CASE product_segment
        WHEN 'B2C' THEN 1
        WHEN 'B2G' THEN 2
        WHEN 'B2B' THEN 3
        ELSE 4 
    END`

	// Dynamic Sort berdasarkan input URL
	switch sort {
	case "price_asc":
		sqlQuery += ", price ASC"
	case "price_desc":
		sqlQuery += ", price DESC"
	case "name_asc":
		sqlQuery += ", product_name ASC"
	case "name_desc":
		sqlQuery += ", product_name DESC"
	default:
		// Default sort jika tidak ada parameter atau tidak cocok
		sqlQuery += ", price ASC"
	}

	if err := r.db.Raw(sqlQuery, args...).Scan(&products).Error; err != nil {
		return nil, fmt.Errorf("%w: getting products: %w", apperrors.ErrInternal, err)
	}

	if len(products) == 0 {
		return nil, fmt.Errorf("%w: products not found", apperrors.ErrNotFound)
	}

	return products, nil
}

func (r *productRepository) GetProductsByTypes(productTypes []string, priceSort, nameSort string) ([]models.Product, error) {
	var products []models.Product
	var conditions []string
	var args []interface{}

	sqlQuery := "SELECT * FROM products"

	if len(productTypes) > 0 {
		conditions = append(conditions, "product_type = ANY(?)")
		args = append(args, pq.Array(productTypes))
	}

	if len(conditions) > 0 {
		sqlQuery += " WHERE " + strings.Join(conditions, " AND ")
	}

	sqlQuery += ` ORDER BY CASE product_segment
        WHEN 'B2C' THEN 1
        WHEN 'B2G' THEN 2
        WHEN 'B2B' THEN 3
        ELSE 4 
    END`

	if strings.EqualFold(priceSort, "desc") {
		sqlQuery += ", price DESC"
	} else {
		sqlQuery += ", price ASC"
	}

	if strings.EqualFold(nameSort, "desc") {
		sqlQuery += ", product_name DESC"
	} else {
		sqlQuery += ", product_name ASC"
	}

	fmt.Println("sqlQuery: " + sqlQuery)

	if err := r.db.Raw(sqlQuery, args...).Scan(&products).Error; err != nil {
		return nil, fmt.Errorf("%w: getting products: %w", apperrors.ErrInternal, err)
	}

	if len(products) == 0 {
		return nil, fmt.Errorf("%w: products not found", apperrors.ErrNotFound)
	}

	return products, nil
}
func (r *productRepository) AddProduct(product *models.Product) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(product).Error; err != nil {
			return fmt.Errorf("%w: creating product: %w", apperrors.ErrInternal, err)
		}
		return nil
	})
}
func (r *productRepository) UpdateProduct(product *models.Product, productID uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		switch product.DisplayImage {
		case nil:
			if err := tx.Exec("UPDATE products SET headline = ?, subheadline = ?, product_code = ?, product_type = ?, product_name = ?, product_segment = ?, specifications = ?, warranty_length = ?, e_commerce_url = ?, shopee_url = ?, tokopedia_url = ? WHERE id = ?",
				product.Headline, product.Subheadline, product.ProductCode, product.ProductType, product.ProductName, product.ProductSegment, product.Specifications, product.WarrantyLength, product.ECommerceURL, product.ShopeeURL, product.TokopediaURL, productID).
				Error; err != nil {
				return fmt.Errorf("%w: updating product: %w", apperrors.ErrInternal, err)
			}
		default:
			if err := tx.Exec("UPDATE products SET headline = ?, subheadline = ?, product_code = ?, product_type = ?, product_name = ?, product_segment = ?, specifications = ?, warranty_length = ?, e_commerce_url = ?, shopee_url = ?, tokopedia_url = ?, display_image = ? WHERE id = ?",
				product.Headline, product.Subheadline, product.ProductCode, product.ProductType, product.ProductName, product.ProductSegment, product.Specifications, product.WarrantyLength, product.ECommerceURL, product.ShopeeURL, product.TokopediaURL, product.DisplayImage, productID).
				Error; err != nil {
				return fmt.Errorf("%w: updating product: %w", apperrors.ErrInternal, err)
			}
		}
		return nil
	})
}

func (r *productRepository) DeleteProduct(productID uint) error {
	var product models.Product
	if err := r.db.Where("id = ?", productID).First(&product).Error; err != nil {
		return fmt.Errorf("%w: product with ID %s not found", apperrors.ErrNotFound, productID)
	}

	err := r.db.Unscoped().Delete(&product).Error
	if err != nil {
		return fmt.Errorf("%w: deleting product: %w", apperrors.ErrInternal, err)
	}
	return nil
}

func (r *productRepository) GetProductByID(ID uint) (*models.Product, error) {
	var product models.Product
	if err := r.db.Where("id = ?", ID).First(&product).Error; err != nil {
		return nil, fmt.Errorf("%w: product with ID %d not found", apperrors.ErrNotFound, ID)
	}
	return &product, nil
}
