package services

import (
	"bytes"
	"encoding/csv"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/helper/dto"
	"gitlab.com/zyrex1/landing-page/helper/utils"
	"gitlab.com/zyrex1/landing-page/models"
	"gitlab.com/zyrex1/landing-page/repo"
	"gorm.io/gorm"
)

type WarrantyService interface {
	ActivateProductWarranty(warranty dto.ActivateWarrantyDTO) (*time.Time, int, error)
	FindWarrantyStatusByProductSN(productSN string) (*models.Warranty, int, error)
	InsertWarrantyData(warranty models.Warranty) error
	ImportWarrantiesFromCSV(fileBytes []byte) (int, int, []string, error)
	GetAllWarranties(limit int, page int, q string) ([]models.Warranty, error)
}

type warrantyService struct {
	repo        repo.WarrantyRepository
	productRepo repo.ProductRepository
}

func NewWarrantyService(repo repo.WarrantyRepository) WarrantyService {
	return &warrantyService{repo: repo}
}

func (s *warrantyService) GetAllWarranties(limit int, page int, q string) ([]models.Warranty, error) {
	return s.repo.GetAllWarranties(limit, page, q)
}

func (s *warrantyService) ActivateProductWarranty(warranty dto.ActivateWarrantyDTO) (*time.Time, int, error) {
	var warr, _, err = s.repo.FindWarrantyStatusByProductSN(warranty.ProductSN)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) { //if there is no record of warranty for the product SN
			return nil, 0, fmt.Errorf("%w for product SN: %s, %v", apperrors.ErrNotFound, warranty.ProductSN, err)
		}
	}

	switch warr.WarrantyStatus {
	case models.WarrantyExpired:
		return nil, 0, fmt.Errorf("%w for product SN: %s, %v", apperrors.ErrWarrantyExpired, warranty.ProductSN, fmt.Errorf("SN %s is already %s", warranty.ProductSN, warr.WarrantyStatus))
	case models.WarrantyActive:
		return nil, 0, fmt.Errorf("%w for product SN: %s, %v", apperrors.ErrWarrantyActivated, warranty.ProductSN, fmt.Errorf("SN %s is already %s", warranty.ProductSN, warr.WarrantyStatus))
	}

	now := time.Now()
	expiry := now.AddDate(0, 0, warr.WarrantyLength)

	newWarrantyEntry := models.Warranty{
		ProductSN:      warranty.ProductSN,
		ActivationDate: &now,
		ExpiryDate:     &expiry,
		WarrantyStatus: models.WarrantyActive,
		Name:           warranty.Name,
		Email:          warranty.Email,
		PhoneNumber:    warranty.PhoneNumber,
		Province:       warranty.Province,
		City:           warranty.City,
	}
	err = s.repo.ActivateProductWarranty(newWarrantyEntry)
	if err != nil {
		return nil, 0, err
	}
	return &expiry, warr.WarrantyLength, nil
}

func (s *warrantyService) FindWarrantyStatusByProductSN(productSN string) (*models.Warranty, int, error) {
	return s.repo.FindWarrantyStatusByProductSN(productSN)
}

func (s *warrantyService) InsertWarrantyData(warranty models.Warranty) error {
	return s.repo.InsertWarrantyData(warranty)
}
func (s *warrantyService) ImportWarrantiesFromCSV(fileBytes []byte) (int, int, []string, error) {
	r := csv.NewReader(bytes.NewReader(fileBytes))
	r.FieldsPerRecord = -1
	records, err := r.ReadAll()
	if err != nil {
		return 0, 0, nil, fmt.Errorf("%w reading csv file: %v", apperrors.ErrInvalidInput, err)
	}

	if len(records) <= 1 {
		return 0, 0, nil, fmt.Errorf("%w: no data rows", apperrors.ErrInvalidInput)
	}

	// Map headers to indices
	headerMap := make(map[string]int)
	for i, name := range records[0] {
		headerMap[strings.TrimSpace(name)] = i
	}

	// Header Constants
	const (
		colCustName = "Customer Name"
		colPhone    = "Phone Number"
		colEmail    = "Email"
		colCity     = "City"
		colProvince = "Province"
		colType     = "Type"
		colModel    = "Model"
		colSN       = "Serial Number"
		colDODate   = "DO Date"
		colActDate  = "Activation Date"
		colWarranty = "Warranty"
		colStatus   = "Status"
	)

	var inserted, skipped int
	errorsList := make([]string, 0)
	now := time.Now()

	for idx, row := range records[1:] {
		rowNum := idx + 2

		getVal := func(headerName string) string {
			if i, ok := headerMap[headerName]; ok && i < len(row) {
				return strings.TrimSpace(row[i])
			}
			return ""
		}

		productSN := getVal(colSN)
		if productSN == "" {
			errorsList = append(errorsList, fmt.Sprintf("row %d: empty SN", rowNum))
			skipped++
			continue
		}

		statusStr := strings.ToLower(getVal(colStatus))
		var actDate *time.Time
		var DODate *time.Time
		dateStr := getVal(colActDate)
		if dateStr != "" {
			if t, err := utils.ParseDateString(dateStr); err == nil {
				actDate = &t
			}
		}

		doDateStr := getVal(colDODate)
		if doDateStr != "" {
			if t, err := utils.ParseDateString(doDateStr); err == nil {
				DODate = &t
			}
		}

		warrantyLengthDays := 0
		if years, err := strconv.Atoi(getVal(colWarranty)); err == nil {
			warrantyLengthDays = years * 365
		}

		// Compute expiry using Activation Date if present, else DO Date, else `now`.
		var expiry time.Time
		if actDate != nil {
			expiry = actDate.AddDate(0, 0, warrantyLengthDays)
		} else if DODate != nil {
			expiry = DODate.AddDate(0, 0, warrantyLengthDays)
		}

		var finalStatus models.WarrantyStatus
		if statusStr == "" {
			if now.After(expiry) {
				finalStatus = models.WarrantyExpired
			} else {
				finalStatus = models.WarrantyActive
			}
		} else {
			finalStatus = models.WarrantyStatus(statusStr)
		}

		w := models.Warranty{
			Name:        getVal(colCustName),
			PhoneNumber: getVal(colPhone),
			Email:       getVal(colEmail),
			City:        getVal(colCity),
			Province:    getVal(colProvince),

			// Product Info
			ProductSN:      productSN,
			ProductType:    getVal(colType),
			ProductModel:   getVal(colModel),
			ActivationDate: actDate,
			ExpiryDate:     &expiry,
			DODate:         DODate,
			WarrantyLength: warrantyLengthDays,
			WarrantyStatus: finalStatus,
		}

		if err := s.repo.InsertWarrantyData(w); err != nil {
			errorsList = append(errorsList, fmt.Sprintf("row %d: %v", rowNum, err))
			skipped++
			continue
		}
		inserted++
	}

	return inserted, skipped, errorsList, nil
}
