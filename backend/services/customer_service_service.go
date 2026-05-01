package services

import (
	"errors"
	"fmt"
	"mime/multipart"
	// "os"
	"strconv"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"
	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/helper/dto"
	"gitlab.com/zyrex1/landing-page/helper/utils"
	"gitlab.com/zyrex1/landing-page/models"
	"gitlab.com/zyrex1/landing-page/repo"
)

type CustomerServiceService interface {
	CreateServiceForm(service models.CustomerService) (models.CustomerService, error)
	GetServiceForm(id uint) (*dto.FormsWithParts, error)
	GetAllServiceForms(limit, page int, status *models.FormStatus, query string, branchID string, agent string, city []string, serviceType string, sortParam string) ([]*dto.FormsWithParts, error)
	GetServiceFormByTicketID(ticketID string) (*models.CustomerService, error)
	UpdateServiceStatus(ticketID string, status models.FormStatus) (string, string, error)
	UpdateServiceForm(id uint, payload dto.UpdateServicePayload) error
	ImportServiceForm(file *multipart.FileHeader) error
	ExportServiceForms() (*excelize.File, error)
	GetDropdownRange(dropdownType string, q string) ([]dto.DropdownRange, error)
	AddDropdownRange(input dto.DropdownRange) error
	GetAllCity() ([]string, error)
	GetCustomerInfo(name string) ([]*dto.CustomerInfo, error)
	DeleteServiceForms(id uint) error
	AutoClosePendingServices() (int64, error)
}

type customerServiceService struct {
	repo repo.CustomerServiceRepository
}

func NewCustomerServiceService(repo repo.CustomerServiceRepository) CustomerServiceService {
	return &customerServiceService{repo: repo}
}

func (s *customerServiceService) CreateServiceForm(service models.CustomerService) (models.CustomerService, error) {
	existingForm, err := s.repo.GetServiceFormsBySN(*service.ProductSN)

	if err != nil {
		if !errors.Is(err, apperrors.ErrNotFound) {
			return models.CustomerService{}, err
		}
	}

	if existingForm != nil && existingForm.ServiceStatus != models.Closed {
		return models.CustomerService{}, fmt.Errorf("%w: product %s still has an active service form", apperrors.ErrTicketAlreadyExists, *service.ProductSN)
	}

	createdService, err := s.repo.CreateServiceForm(service)
	if err != nil {
		return models.CustomerService{}, err
	}

	// config := SMTPConfig{
	// 	Host: os.Getenv("SMTP_HOST"),
	// 	Port: os.Getenv("SMTP_PORT"),
	// 	//Username:      os.Getenv("SMTP_USERNAME"),
	// 	//Password:      os.Getenv("SMTP_PASSWORD"),
	// 	From: os.Getenv("SMTP_FROM"),
	// 	//SkipTLSVerify: true,
	// 	//NoTLS:         true,
	// }

	// notifier := NewEmailNotifier(config)
	// recipients := []string{
	// 	// "Gamalielisaac.Gan@zyrex.com",
	// 	os.Getenv("SMTP_RECIPIENTS"),
	// }

	// request := dto.EmailServiceRequest{
	// 	TicketID:  service.TicketID,
	// 	Complains: *service.Complaints,
	// 	Date:      service.ServiceDate,
	// }

	// if err := notifier.PushEmailNotification(recipients, request); err != nil {
	// 	fmt.Println("Email notification failed.")
	// 	// return models.CustomerService{}, err
	// }

	return createdService, nil
}

func (s *customerServiceService) GetServiceForm(id uint) (*dto.FormsWithParts, error) {
	return s.repo.GetServiceForm(id)
}

func (s *customerServiceService) GetServiceFormByTicketID(ticketID string) (*models.CustomerService, error) {
	return s.repo.GetServiceFormByTicketID(ticketID)
}

func (s *customerServiceService) GetAllServiceForms(limit, page int, status *models.FormStatus, query, branchID, agent string, city []string, serviceType string, sortParam string) ([]*dto.FormsWithParts, error) {
	return s.repo.GetAllServiceForms(limit, page, status, query, branchID, agent, city, serviceType, sortParam)
}

func (s *customerServiceService) GetAllCity() ([]string, error) {
	return s.repo.GetAllCity()
}

func (s *customerServiceService) UpdateServiceStatus(ticketID string, status models.FormStatus) (string, string, error) {
	newStatus, ticketId, serviceData, err := s.repo.UpdateServiceStatus(ticketID, status)
	if err != nil {
		return "", ticketId, err
	}
	fmt.Println(serviceData)
	// appEnv := os.Getenv("ENV")
	// if newStatus == string(models.Confirmed) && appEnv != "prod" {
	// 	qontakService := NewQontakService()
	// 	err = qontakService.SendMessage(serviceData, MessageTypeConfirmed)
	// 	if err != nil {
	// 		fmt.Printf("failed to send message: %v\n", err)
	// 	}
	// }

	return newStatus, ticketId, err
}

func (s *customerServiceService) UpdateServiceForm(id uint, payload dto.UpdateServicePayload) error {
	if payload.ServiceStatus != "closed" {
		return s.repo.UpdateServiceForm(id, payload)
	}

	now := time.Now()

	// set finished date if its closed and without finished date
	if payload.FinishedDate == nil || *payload.FinishedDate == "" {
		formatted := now.Format("2006-01-02 15:04:05")
		payload.FinishedDate = &formatted
	}

	// set sla if its closed and without sla
	if payload.SLA == nil || *payload.SLA == "" {
		existingForm, err := s.repo.GetServiceForm(id)
		if err != nil {
			return err
		}

		finishedDate, err := utils.ResolveFinishedDate(payload.FinishedDate, existingForm.FinishedDate, now)
		if err != nil {
			return err
		}

		days := utils.CountWorkingDays(existingForm.FormDate, finishedDate)
		slaStr := fmt.Sprintf("%d", days)
		payload.SLA = &slaStr
	}

	return s.repo.UpdateServiceForm(id, payload)
}

func (s *customerServiceService) GetDropdownRange(dropdownType string, q string) ([]dto.DropdownRange, error) {
	return s.repo.GetDropdownRange(dropdownType, q)
}

func (s *customerServiceService) AddDropdownRange(input dto.DropdownRange) error {
	data := models.DropdownRange{
		Type: input.Type,
		Text: input.Text,
	}

	return s.repo.CreateDropdownRange(data)
}

func (s *customerServiceService) ImportServiceForm(file *multipart.FileHeader) error {
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

	if len(rows) == 0 {
		return fmt.Errorf("empty spreadsheet")
	}

	// Build header map from first row
	headerMap := make(map[string]int)
	for i, header := range rows[0] {
		headerMap[strings.TrimSpace(header)] = i
	}

	// Helper function to get value by header name
	getByHeader := func(row []string, headerName string) string {
		if index, exists := headerMap[headerName]; exists && len(row) > index {
			return row[index]
		}
		return ""
	}

	var serviceForms []models.CustomerService
	var serviceParts []models.ServicePart

	for i, row := range rows {
		if i == 0 || len(row) < 5 {
			continue
		}

		// Validate that row has essential data (skip empty rows)
		roid := utils.SanitizeString(getByHeader(row, "Nmr RO"))
		name := utils.SanitizeString(getByHeader(row, "Customer"))
		productSN := utils.SanitizeString(getByHeader(row, "Serial Number"))

		if roid == "" && name == "" && productSN == "" {
			continue
		}

		// Parse dates
		formDate, _ := utils.ParseDateString(getByHeader(row, "Waktu Lapor/ Pembuatan RO"))
		var finishedDate *time.Time

		if sanitized := utils.SanitizeString(getByHeader(row, "Waktu Selesai")); sanitized != "" {
			if fd, err := utils.ParseDateString(sanitized); err == nil {
				finishedDate = &fd
			}
		}
		var purchasedDate *time.Time
		if sanitized := utils.SanitizeString(getByHeader(row, "Tanggal Pembelian")); sanitized != "" {
			if pd, err := utils.ParseDateString(sanitized); err == nil {
				purchasedDate = &pd
			}
		}

		// Parse status
		var st string
		switch sanitized := utils.SanitizeString(getByHeader(row, "Status Support")); sanitized {
		case strings.ToUpper("CLOSED"):
			st = "closed"
		case strings.ToUpper("OPEN"):
			st = "ongoing"
		case strings.ToUpper("COMPLETED"):
			st = "completed"
		case strings.ToUpper("SCHEDULE SUPPORT"):
			st = "ongoing"
		default:
			st = "pending"
		}
		status, _ := utils.ParseFormStatus(st)

		// Parse quantity
		var quantity int
		if sanitized := utils.SanitizeString(getByHeader(row, "QTY")); sanitized != "" {
			if qty, err := utils.ParseInt(sanitized); err == nil {
				quantity = qty
			}
		}

		// Parse HNH
		hnh := utils.SanitizeString(getByHeader(row, "N/NH"))
		if hnh != "" {
			hnh = strings.ToLower(hnh)
		}

		// Parse Warranty Status
		var warrantyStatus string
		switch sanitized := utils.SanitizeString(getByHeader(row, "W/OOW")); sanitized {
		case strings.ToUpper("W"):
			warrantyStatus = "active"
		case strings.ToUpper("OW"):
			warrantyStatus = "expired"
		default:
			warrantyStatus = "not set"
		}

		var sla string
		slaStr := utils.SanitizeString(getByHeader(row, "Resolution Time (Days)"))
		slaInt, _ := strconv.Atoi(slaStr)
		if slaInt < 0 {
			sla = "-"
		} else {
			sla = slaStr
		}
		// Create the service form
		service := models.CustomerService{
			TicketID:       utils.GenerateTicketID(),
			FormDate:       formDate,
			ROID:           roid, // Use already sanitized value
			FinishedDate:   finishedDate,
			Agent:          utils.SanitizeStringPtr(getByHeader(row, "Agent")),
			ServiceStatus:  status,
			ServiceType:    utils.SanitizeStringPtr(getByHeader(row, "Service")),
			TechnicianName: utils.SanitizeStringPtr(getByHeader(row, "Teknisi")),
			Name:           utils.SanitizeStringPtr(name), // Use already sanitized value
			PhoneNumber:    utils.SanitizeStringPtr(getByHeader(row, "Telepon")),
			Address:        utils.SanitizeStringPtr(getByHeader(row, "Alamat")),
			City:           utils.SanitizeStringPtr(getByHeader(row, "Kota")),
			Partner:        utils.SanitizeStringPtr(getByHeader(row, "PIC/Partner")),

			ProductType:    utils.SanitizeStringPtr(getByHeader(row, "Type")),
			ProductSN:      utils.SanitizeStringPtr(productSN), // Use already sanitized value
			Complaints:     utils.SanitizeStringPtr(getByHeader(row, "Problem")),
			WarrantyStatus: &warrantyStatus,
			PurchasedDate:  purchasedDate,
			SolutionRO:     utils.SanitizeStringPtr(getByHeader(row, "Solusi RO")),
			Solution:       utils.SanitizeStringPtr(getByHeader(row, "Solusi")),
			HNH:            utils.SanitizeStringPtr(hnh),
			MacAdrNew:      utils.SanitizeStringPtr(getByHeader(row, "Mac Address Baru")),
			MacAdrOld:      utils.SanitizeStringPtr(getByHeader(row, "Mac Address Lama")),
			ReportStatus:   utils.SanitizeStringPtr(getByHeader(row, "REPORT")),
			ROSupport:      utils.SanitizeStringPtr(getByHeader(row, "RO Support")),
			ServiceRemarks: utils.SanitizeStringPtr(getByHeader(row, "Keterangan")),
			SLA:            &sla,
		}

		serviceForms = append(serviceForms, service)

		if partName := utils.SanitizeString(getByHeader(row, "Part 1")); partName != "" {
			part := models.ServicePart{
				TicketID: service.TicketID,
				PartName: partName,
				Quantity: quantity,
			}
			if part.Quantity == 0 {
				part.Quantity = 1
			}
			serviceParts = append(serviceParts, part)
		}

		// Part 2
		if partName := utils.SanitizeString(getByHeader(row, "Part 2")); partName != "" {
			part := models.ServicePart{
				TicketID: service.TicketID,
				PartName: partName,
				Quantity: quantity,
			}
			if part.Quantity == 0 {
				part.Quantity = 1
			}
			serviceParts = append(serviceParts, part)
		}

		// Part 3
		if partName := utils.SanitizeString(getByHeader(row, "Part 3")); partName != "" {
			part := models.ServicePart{
				TicketID: service.TicketID,
				PartName: partName,
				Quantity: quantity,
			}
			if part.Quantity == 0 {
				part.Quantity = 1
			}
			serviceParts = append(serviceParts, part)
		}
	}

	if err := s.repo.BulkCreateServiceForms(serviceForms); err != nil {
		return err
	}

	if err := s.repo.BulkCreateServiceParts(serviceParts); err != nil {
		return err
	}

	return nil
}

func (s *customerServiceService) ExportServiceForms() (*excelize.File, error) {
	formsWithParts, err := s.repo.ExportServiceForms()
	if err != nil {
		return nil, err
	}

	f := excelize.NewFile()
	sheetName := "Service Forms"
	index, err := f.NewSheet(sheetName)
	if err != nil {
		return nil, err
	}

	// Set headers
	headers := []string{
		"No", "Form Date", "Nomor RO", "Waktu Selesai", "Agent", "Status Support",
		"Jenis Service", "Nama Teknisi", "ID Cabang", "Nama Customer", "Email",
		"Alamat", "Nomor Telepon", "Jenis Produk", "SN Produk", "Keluhan",
		"Status Garansi", "Status Garansi", "Tanggal Pembelian", "Nomor RO Solusi", "Solusi",
		"Jumlah", "HNH", "Bagian 1", "Bagian 2", "Bagian 3", "ID Tiket", "Dibuat Pada", "SLA",
	}

	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheetName, cell, header)
	}

	// Helper function to get string pointer value
	getStrPtr := func(s *string) string {
		if s != nil {
			return *s
		}
		return ""
	}

	// Helper function to format date
	formatDate := func(t *time.Time) string {
		if t != nil {
			return t.Format("2006-01-02")
		}
		return ""
	}

	// Write data
	row := 2
	for i, formWithParts := range formsWithParts {
		service := formWithParts.CustomerService
		serviceParts := formWithParts.ServiceParts

		// Get part names
		part1, part2, part3 := "", "", ""
		quantity := 0
		if len(serviceParts) > 0 {
			part1 = serviceParts[0].PartName
			quantity = serviceParts[0].Quantity
		}
		if len(serviceParts) > 1 {
			part2 = serviceParts[1].PartName
		}
		if len(serviceParts) > 2 {
			part3 = serviceParts[2].PartName
		}

		// Set row data
		data := []interface{}{
			i + 1,                                 // No
			service.FormDate.Format("2006-01-02"), // Form Date
			service.ROID,                          // ROID
			formatDate(service.FinishedDate),      // Finished Date
			getStrPtr(service.Agent),              // Agent
			string(service.ServiceStatus),         // Status
			getStrPtr(service.ServiceType),        // Service Type
			getStrPtr(service.TechnicianName),     // Technician Name
			getStrPtr(service.BranchID),           // Branch ID
			getStrPtr(service.Name),               // Name
			getStrPtr(service.Email),              // Email
			getStrPtr(service.Address),            // Address
			getStrPtr(service.PhoneNumber),        // Phone Number
			getStrPtr(service.ProductType),        // Product Type
			getStrPtr(service.ProductSN),          // Product SN
			getStrPtr(service.Complaints),         // Complaints
			getStrPtr(service.WarrantyStatus),     // Warranty Status
			getStrPtr(service.WarrantyStatus),     // Warranty Status (duplicate column)
			formatDate(service.PurchasedDate),     // Purchased Date
			getStrPtr(service.SolutionRO),         // Solution RO
			getStrPtr(service.Solution),           // Solution
			quantity,                              // Quantity
			getStrPtr(service.HNH),                // HNH
			part1,                                 // Part 1
			part2,                                 // Part 2
			part3,                                 // Part 3
			service.TicketID,                      // Ticket ID
			getStrPtr(service.SLA),                // SLA
		}

		for col, value := range data {
			cell, _ := excelize.CoordinatesToCellName(col+1, row)
			err := f.SetCellValue(sheetName, cell, value)
			if err != nil {
				return nil, fmt.Errorf("failed to set cell value: %w", err)
			}
		}
		row++
	}

	f.SetActiveSheet(index)
	if defaultIndex, err := f.GetSheetIndex("Sheet1"); err == nil && defaultIndex != -1 {
		err := f.DeleteSheet("Sheet1")
		if err != nil {
			return nil, fmt.Errorf("failed to delete default sheet: %w", err)
		}
	}

	return f, nil
}

func (s *customerServiceService) GetCustomerInfo(name string) ([]*dto.CustomerInfo, error) {
	return s.repo.GetCustomerInfo(name)
}

func (s *customerServiceService) DeleteServiceForms(id uint) error {
	return s.repo.DeleteServiceForms(id)
}

func (s *customerServiceService) AutoClosePendingServices() (int64, error) {
	return s.repo.AutoClosePendingServices()
}
