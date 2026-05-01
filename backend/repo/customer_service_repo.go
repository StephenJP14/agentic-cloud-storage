package repo

import (
	"errors"
	"fmt"
	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/helper/dto"
	"gitlab.com/zyrex1/landing-page/models"
	"gorm.io/gorm"
	"strings"
	"time"
)

type CustomerServiceRepository interface {
	CreateServiceForm(service models.CustomerService) (models.CustomerService, error)
	GetServiceForm(id uint) (*dto.FormsWithParts, error)
	GetAllServiceForms(limit, page int, status *models.FormStatus, query, branchID, agent string, city []string, serviceType string, sortParam string) ([]*dto.FormsWithParts, error)
	GetServiceFormByTicketID(ticketID string) (*models.CustomerService, error)
	UpdateServiceStatus(ticketId string, status models.FormStatus) (string, string, models.CustomerService, error)
	UpdateServiceForm(id uint, payload dto.UpdateServicePayload) error
	BulkCreateServiceForms(services []models.CustomerService) error
	BulkCreateServiceParts(parts []models.ServicePart) error
	ExportServiceForms() ([]*dto.FormsWithParts, error)
	GetDropdownRange(dorpdownType string, q string) ([]dto.DropdownRange, error)
	CreateDropdownRange(input models.DropdownRange) error
	GetAllCity() ([]string, error)
	GetCustomerInfo(name string) ([]*dto.CustomerInfo, error)
	DeleteServiceForms(id uint) error
	GetServiceFormsBySN(productSN string) (*models.CustomerService, error)
	AutoClosePendingServices() (int64, error)
}

type customerServiceRepository struct {
	db *gorm.DB
}

func NewCustomerServiceRepository(db *gorm.DB) CustomerServiceRepository {
	return &customerServiceRepository{db: db}
}

func (r *customerServiceRepository) CreateServiceForm(service models.CustomerService) (models.CustomerService, error) {
	if err := r.db.Create(&service).Error; err != nil {
		return models.CustomerService{}, fmt.Errorf("%w creating service form: %w", apperrors.ErrInternal, err)
	}

	return service, nil
}

func (r *customerServiceRepository) GetServiceForm(id uint) (*dto.FormsWithParts, error) {
	var service models.CustomerService
	if err := r.db.First(&service, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("%w for ID: %d, %w", apperrors.ErrNotFound, id, err)
		}
		return nil, fmt.Errorf("%w finding service form for ID: %d, %w", apperrors.ErrInternal, id, err)
	}
	var parts []models.ServicePart
	if err := r.db.Where("ticket_id = ?", service.TicketID).Find(&parts).Error; err != nil {
		return nil, fmt.Errorf("%w finding service parts for TicketID: %s, %w", apperrors.ErrInternal, service.TicketID, err)
	}

	return &dto.FormsWithParts{
		CustomerService: service,
		ServiceParts:    parts,
	}, nil
}

func (r *customerServiceRepository) GetServiceFormByTicketID(ticketID string) (*models.CustomerService, error) {
	var service models.CustomerService
	if err := r.db.Where("ticket_id = ?", ticketID).First(&service).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("%w for TicketID: %s, %w", apperrors.ErrNotFound, ticketID, err)
		}
		return nil, fmt.Errorf("%w finding service form for TicketID: %s, %w", apperrors.ErrInternal, ticketID, err)
	}
	return &service, nil
}

func (r *customerServiceRepository) GetServiceFormsBySN(productSN string) (*models.CustomerService, error) {
	var service models.CustomerService
	if err := r.db.Where("product_sn = ?", productSN).First(&service).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("%w for ProductSN: %s, %w", apperrors.ErrNotFound, productSN, err)
		}
		return nil, fmt.Errorf("%w finding service form for ProductSN: %s, %w", apperrors.ErrInternal, productSN, err)
	}
	return &service, nil
}

func (r *customerServiceRepository) GetAllCity() ([]string, error) {
	var cities []string

	sqlQuery := `
		SELECT DISTINCT city 
		FROM customer_services 
		WHERE city IS NOT NULL AND city != ''
		ORDER BY city ASC
	`

	err := r.db.Raw(sqlQuery).Scan(&cities).Error
	if err != nil {
		return nil, fmt.Errorf("%w fetching cities: %v", apperrors.ErrInternal, err)
	}

	return cities, nil
}

func (r *customerServiceRepository) GetAllServiceForms(limit, page int, status *models.FormStatus, query, branchID, agent string, city []string, serviceType string, sortParam string) ([]*dto.FormsWithParts, error) {

	var services []models.CustomerService
	var (
		conditions []string
		args       []any
	)

	offset := (page - 1) * limit

	sqlQuery := `
		SELECT cs.*
		FROM customer_services cs
	`

	if status != nil {
		conditions = append(conditions, "cs.service_status = ?")
		args = append(args, *status)
	}

	if query != "" {
		conditions = append(conditions, `
			(
				cs.ticket_id = ?
				OR cs.branch_id ILIKE ?
				OR cs.product_sn ILIKE ?
				OR cs.name ILIKE ?
				OR cs.email ILIKE ?
				OR cs.partner ILIKE ?
				OR cs.ro_id ILIKE ?
				OR cs.service_remarks ILIKE ?
				OR cs.phone_number ILIKE ?
				OR cs.solution_ro ILIKE ?
				OR cs.service_type ILIKE ?
				OR cs.product_type ILIKE ?
				OR cs.ro_support ILIKE ?
				OR cs.address ILIKE ?
				OR cs.complaints ILIKE ?
				OR cs.location ILIKE ?
				OR cs.solution ILIKE ?
			)
		`)
		like := "%" + query + "%"
		args = append(args,
			query,
			like, like, like, like, like, like, like, like, like, like, like, like, like, like, like, like,
		)
	}

	if branchID != "" {
		conditions = append(conditions, "cs.branch_id = ?")
		args = append(args, branchID)
	}

	if agent != "" && agent != "Administrator" {
		conditions = append(conditions, "(cs.agent IN (?, '') OR cs.agent IS NULL)")
		args = append(args, agent)
	}

	if len(city) > 0 {
		tmp := make([]string, len(city))
		for i := range tmp {
			tmp[i] = "?"
		}

		conditions = append(
			conditions,
			fmt.Sprintf("cs.city IN (%s)", strings.Join(tmp, ",")),
		)

		for _, c := range city {
			args = append(args, c)
		}
	}

	if serviceType != "" {
		conditions = append(conditions, "cs.service_type = ?")
		args = append(args, serviceType)
	}

	if len(conditions) > 0 {
		sqlQuery += " WHERE " + strings.Join(conditions, " AND ")
	}

	sqlQuery += `
		ORDER BY CASE cs.service_status
			WHEN 'pending' THEN 1
			WHEN 'contacted' THEN 2
			WHEN 'responded' THEN 3
			WHEN 'ongoing' THEN 4
			WHEN 'completed' THEN 5
			WHEN 'closed' THEN 6
		END,
	`
	if strings.ToLower(sortParam) == "asc" {
		sqlQuery += `cs.form_date ASC`
	} else {
		sqlQuery += `cs.form_date DESC`
	}

	sqlQuery += ` LIMIT ? OFFSET ?`

	args = append(args, limit, offset)

	if err := r.db.Raw(sqlQuery, args...).Scan(&services).Error; err != nil {
		return nil, fmt.Errorf("%w finding service forms: %w", apperrors.ErrInternal, err)
	}

	if len(services) == 0 {
		return []*dto.FormsWithParts{}, nil
	}

	// ---- fetch parts ----

	ticketIDs := make([]string, 0, len(services))
	for _, s := range services {
		ticketIDs = append(ticketIDs, s.TicketID)
	}

	var parts []models.ServicePart
	partQuery := `
		SELECT *
		FROM service_parts
		WHERE ticket_id IN ?
	`

	if err := r.db.Raw(partQuery, ticketIDs).Scan(&parts).Error; err != nil {
		return nil, fmt.Errorf("%w fetching service parts: %w", apperrors.ErrInternal, err)
	}

	// index parts by ticket_id
	partsMap := make(map[string][]models.ServicePart, len(ticketIDs))
	for _, p := range parts {
		partsMap[p.TicketID] = append(partsMap[p.TicketID], p)
	}

	// ---- build response ----

	result := make([]*dto.FormsWithParts, 0, len(services))
	for _, s := range services {
		result = append(result, &dto.FormsWithParts{
			CustomerService: s,
			ServiceParts:    partsMap[s.TicketID],
		})
	}

	return result, nil
}

func (r *customerServiceRepository) UpdateServiceStatus(ticketId string, status models.FormStatus) (string, string, models.CustomerService, error) {
	var service models.CustomerService

	if err := r.db.Where("ticket_id = ?", ticketId).First(&service).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", ticketId, service, fmt.Errorf("%w for ticket_id: %s", apperrors.ErrNotFound, ticketId)
		}
		return "", ticketId, service, fmt.Errorf("%w finding service for ticket_id: %s, %w", apperrors.ErrInternal, ticketId, err)
	}

	updates := make(map[string]interface{})

	if (service.ServiceStatus ==models.Ongoing) {
		status = models.Completed
	}
	
	// var nextStatus models.FormStatus
	// switch status {
	// case models.Pending:
	// 	nextStatus = models.Confirmed
	// case models.Confirmed:
	// 	nextStatus = models.Ongoing
	// case models.Ongoing:
	// 	nextStatus = models.Completed
	// default:
	// 	nextStatus = status
	// }

	updates["service_status"] = status

	if service.ServiceType != nil && *service.ServiceType == "BOOKING" && status == models.Ongoing {
		walkin := "WALKIN"
		updates["service_type"] = &walkin
	}

	if err := r.db.Model(&service).Updates(updates).Error; err != nil {
		return "", ticketId, service, fmt.Errorf("%w updating record for ticket_id: %s, %w", apperrors.ErrInternal, ticketId, err)
	}

	return string(status), ticketId, service, nil
}

func (r *customerServiceRepository) AutoClosePendingServices() (int64, error) {
	now := time.Now()

	result := r.db.Model(&models.CustomerService{}).
		Where("service_status = ? AND service_type = ? AND service_date < ?",
			"pending",
			"WALKIN",
			now,
		).
		Updates(map[string]interface{}{
			"service_status":  "closed",
			"service_remarks": "Closed by System: Past service date",
			"updated_at":      now,
		})

	if result.Error != nil {
		return 0, fmt.Errorf("%w: failed to auto close services: %v", apperrors.ErrInternal, result.Error)
	}

	return result.RowsAffected, nil
}

func (r *customerServiceRepository) UpdateServiceForm(id uint, payload dto.UpdateServicePayload) error {
	updates := map[string]interface{}{
		"name":            payload.Name,
		"email":           payload.Email,
		"phone_number":    payload.PhoneNumber,
		"address":         payload.Address,
		"partner":         payload.Partner,
		"city":            payload.City,
		"product_sn":      payload.ProductSN,
		"complaints":      payload.Complaints,
		"service_status":  payload.ServiceStatus,
		"ro_id":           payload.ROID,
		"agent":           payload.Agent,
		"service_type":    payload.ServiceType,
		"form_date":       payload.FormDate,
		"finished_date":   payload.FinishedDate,
		"service_date":    payload.ServiceDate,
		"technician_name": payload.TechnicianName,
		"product_type":    payload.ProductType,
		"warranty_status": payload.WarrantyStatus,
		"purchased_date":  payload.PurchasedDate,
		"solution":        payload.Solution,
		"solution_ro":     payload.SolutionRO,
		"hnh":             payload.HNH,
		"service_remarks": payload.ServiceRemarks,
		"report_status":   payload.ReportStatus,
		"ro_support":      payload.ROSupport,
		"mac_adr_new":     payload.MacAdrNew,
		"mac_adr_old":     payload.MacAdrOld,
		"sla":             payload.SLA,
		"print_copy":      payload.PrintCopy,
	}

	if err := r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.CustomerService{}).Where("id = ?", id).Updates(updates).Error; err != nil {
			return err
		}
		return nil
	}); err != nil {
		return fmt.Errorf("%w updating service form for ID: %d, %v", apperrors.ErrInternal, id, err)
	}

	return nil
}

func (r *customerServiceRepository) BulkCreateServiceForms(services []models.CustomerService) error {
	if len(services) == 0 {
		return nil
	}

	if err := r.db.CreateInBatches(services, 100).Error; err != nil {
		return fmt.Errorf("%w bulk creating service forms: %w", apperrors.ErrInternal, err)
	}
	return nil
}

func (r *customerServiceRepository) BulkCreateServiceParts(parts []models.ServicePart) error {
	if len(parts) == 0 {
		return nil
	}

	if err := r.db.CreateInBatches(parts, 100).Error; err != nil {
		return fmt.Errorf("%w bulk creating service parts: %w", apperrors.ErrInternal, err)
	}
	return nil
}

func (r *customerServiceRepository) ExportServiceForms() ([]*dto.FormsWithParts, error) {
	var services []models.CustomerService

	// Fetch all service forms
	if err := r.db.Order("form_date DESC").Find(&services).Error; err != nil {
		return nil, fmt.Errorf("%w fetching service forms for export: %w", apperrors.ErrInternal, err)
	}

	if len(services) == 0 {
		return []*dto.FormsWithParts{}, nil
	}

	// Fetch all service parts
	ticketIDs := make([]string, 0, len(services))
	for _, s := range services {
		ticketIDs = append(ticketIDs, s.TicketID)
	}

	var parts []models.ServicePart
	partQuery := `
		SELECT *
		FROM service_parts
		WHERE ticket_id IN ?
	`

	if err := r.db.Raw(partQuery, ticketIDs).Scan(&parts).Error; err != nil {
		return nil, fmt.Errorf("%w fetching service parts: %w", apperrors.ErrInternal, err)
	}

	partsMap := make(map[string][]models.ServicePart, len(ticketIDs))
	for _, p := range parts {
		partsMap[p.TicketID] = append(partsMap[p.TicketID], p)
	}

	// Build response
	result := make([]*dto.FormsWithParts, 0, len(services))
	for _, s := range services {
		result = append(result, &dto.FormsWithParts{
			CustomerService: s,
			ServiceParts:    partsMap[s.TicketID],
		})
	}

	return result, nil
}

func (r *customerServiceRepository) GetDropdownRange(dropdownType string, q string) ([]dto.DropdownRange, error) {
	var values []models.DropdownRange
	var err error

	searchTerm := "%" + q + "%"

	if dropdownType == "" {
		query := `SELECT type, text, hnh FROM dropdown_ranges WHERE text ILIKE ?`
		err = r.db.Raw(query, searchTerm).Scan(&values).Error
	} else {
		query := `SELECT type, text, hnh FROM dropdown_ranges WHERE type = ? AND text ILIKE ?`
		err = r.db.Raw(query, dropdownType, searchTerm).Scan(&values).Error
	}

	if err != nil {
		return nil, fmt.Errorf("%w fetching dropdown range: %v", apperrors.ErrInternal, err)
	}

	var result []dto.DropdownRange
	for _, v := range values {
		result = append(result, dto.DropdownRange{
			Type: v.Type,
			Text: v.Text,
			HNH:  v.HNH,
		})
	}

	return result, nil
}

func (r *customerServiceRepository) CreateDropdownRange(input models.DropdownRange) error {
	query := `INSERT INTO dropdown_ranges (type, text) VALUES (?, ?)`
	err := r.db.Exec(query, input.Type, input.Text).Error
	if err != nil {
		return fmt.Errorf("%w creating dropdown range: %v", apperrors.ErrInternal, err)
	}
	return nil
}

func (r *customerServiceRepository) GetCustomerInfo(q string) ([]*dto.CustomerInfo, error) {
	var info []*dto.CustomerInfo

	searchTerm := "%" + q + "%"

	sqlQuery := `
        SELECT name, email, phone_number, address, city 
        FROM customer_services 
        WHERE (
            name ILIKE ? OR 
            city ILIKE ? OR 
            email ILIKE ? OR 
            phone_number ILIKE ? OR 
            address ILIKE ?
        )
        GROUP BY name, email, phone_number, address, city`

	// Masukkan searchTerm sebanyak 5 kali sesuai jumlah "?" di atas
	if err := r.db.Raw(sqlQuery, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm).Scan(&info).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("%w for query: %s, %w", apperrors.ErrNotFound, q, err)
		}
		return nil, fmt.Errorf("%w finding customer info for query: %s, %w", apperrors.ErrInternal, q, err)
	}

	return info, nil
}

func (r *customerServiceRepository) DeleteServiceForms(id uint) error {
	if err := r.db.Unscoped().Delete(&models.CustomerService{}, id).Error; err != nil {
		return fmt.Errorf("%w deleting service form for ID: %d, %w", apperrors.ErrInternal, id, err)
	}
	return nil
}
