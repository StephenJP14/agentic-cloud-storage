package services

import (
	"fmt"
	"mime/multipart"
	"strconv"

	"github.com/xuri/excelize/v2"
	"gitlab.com/zyrex1/landing-page/helper/utils"
	"gitlab.com/zyrex1/landing-page/models"
	"gitlab.com/zyrex1/landing-page/repo"
)

type ServiceCenterService interface {
	GetServiceCenter(q string) ([]models.ServiceCenter, error)
	CreateServiceCenter(serviceCenter *models.ServiceCenter) error
	ExportServiceCentersToExcel() (*excelize.File, error)
	ImportServiceCenter(file *multipart.FileHeader) error
	UpdateServiceCenterByExcel(file *multipart.FileHeader) (map[string]int, error)
	UpdateServiceCenter(serviceCenter *models.ServiceCenter) error
	DeleteServiceCenter(idStr string) error
}

type serviceCenterService struct {
	repo repo.ServiceCenterRepository
}

func NewServiceCenterService(repo repo.ServiceCenterRepository) ServiceCenterService {
	return &serviceCenterService{repo: repo}
}

func (s *serviceCenterService) DeleteServiceCenter(idStr string) error {
	// Konversi string ID ke uint
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		return fmt.Errorf("invalid ID format")
	}

	return s.repo.DeleteServiceCenter(uint(id))
}

func (s *serviceCenterService) GetServiceCenter(q string) ([]models.ServiceCenter, error) {
	return s.repo.GetServiceCenter(q)
}

func (s *serviceCenterService) CreateServiceCenter(serviceCenter *models.ServiceCenter) error {
	return s.repo.CreateServiceCenter(serviceCenter)
}

func (s *serviceCenterService) UpdateServiceCenter(serviceCenter *models.ServiceCenter) error {
	return s.repo.UpdateServiceCenter(serviceCenter)
}

func (s *serviceCenterService) ExportServiceCentersToExcel() (*excelize.File, error) {
	data, err := s.repo.GetServiceCenter("")
	if err != nil {
		return nil, err
	}

	f := excelize.NewFile()
	sheet := "Service Centers"
	f.SetSheetName("Sheet1", sheet)

	// Header
	headers := []string{"Branch ID", "Name", "Type", "Address", "City", "Province", "Operational Hours", "Phone", "PIC", "Google Maps URL"}
	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, header)
	}

	for i, sc := range data {
		row := i + 2
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), sc.BranchID)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), sc.Name)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), sc.BranchType)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), sc.Address)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), sc.City)
		f.SetCellValue(sheet, fmt.Sprintf("F%d", row), sc.Province)
		f.SetCellValue(sheet, fmt.Sprintf("G%d", row), sc.OperationalHours)
		f.SetCellValue(sheet, fmt.Sprintf("H%d", row), sc.Phone)
		f.SetCellValue(sheet, fmt.Sprintf("I%d", row), sc.PIC)
		f.SetCellValue(sheet, fmt.Sprintf("J%d", row), sc.MapURL)
	}

	return f, nil
}

func (s *serviceCenterService) ImportServiceCenter(file *multipart.FileHeader) error {
	src, err := file.Open()
	if err != nil {
		return err
	}
	defer src.Close()

	f, err := excelize.OpenReader(src)
	if err != nil {
		return err
	}

	rows, err := f.GetRows(f.GetSheetList()[0])
	if err != nil {
		return err
	}

	var serviceCenters []models.ServiceCenter

	for i, row := range rows {
		if i == 0 || len(row) < 5 {
			continue
		}

		serviceCenters = append(serviceCenters, models.ServiceCenter{
			BranchID:         utils.GenerateBranchID(7),
			Name:             row[0],
			BranchType:       row[1],
			Address:          row[2],
			City:             row[3],
			Province:         row[4],
			OperationalHours: row[5],
			Phone:            row[6],
			PIC:              row[7],
			MapURL:           row[8],
		})
	}

	return s.repo.BulkCreateServiceCenter(serviceCenters)
}

func (s *serviceCenterService) UpdateServiceCenterByExcel(file *multipart.FileHeader) (map[string]int, error) {
	src, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer src.Close()

	f, err := excelize.OpenReader(src)
	if err != nil {
		return nil, err
	}

	rows, err := f.GetRows(f.GetSheetList()[0])
	if err != nil {
		return nil, err
	}

	summary := map[string]int{
		"updated": 0,
		"created": 0,
	}

	for i, row := range rows {
		if i == 0 || len(row) == 0 {
			continue
		}

		branchID := getColValue(row, 0)

		dataMap := map[string]interface{}{
			"name":              getColValue(row, 1),
			"branch_type":       getColValue(row, 2),
			"address":           getColValue(row, 3),
			"city":              getColValue(row, 4),
			"province":          getColValue(row, 5),
			"operational_hours": getColValue(row, 6),
			"phone":             getColValue(row, 7),
			"pic":               getColValue(row, 8),
			"map_url":           getColValue(row, 9),
		}

		var existingBranch models.ServiceCenter
		err := s.repo.FindByBranchID(branchID, &existingBranch)

		if err != nil || branchID == "" {
			newBranch := models.ServiceCenter{
				BranchID:         utils.GenerateBranchID(7),
				Name:             fmt.Sprint(dataMap["name"]),
				BranchType:       fmt.Sprint(dataMap["branch_type"]),
				Address:          fmt.Sprint(dataMap["address"]),
				City:             fmt.Sprint(dataMap["city"]),
				Province:         fmt.Sprint(dataMap["province"]),
				OperationalHours: fmt.Sprint(dataMap["operational_hours"]),
				Phone:            fmt.Sprint(dataMap["phone"]),
				PIC:              fmt.Sprint(dataMap["pic"]),
				MapURL:           fmt.Sprint(dataMap["map_url"]),
			}
			if errCreate := s.repo.CreateServiceCenter(&newBranch); errCreate == nil {
				summary["created"]++
			}
		} else {
			if errUpdate := s.repo.UpdateByBranchID(branchID, dataMap); errUpdate == nil {
				summary["updated"]++
			}
		}
	}
	return summary, nil
}
func getColValue(row []string, index int) string {
	if index < len(row) {
		return row[index]
	}
	return ""
}
