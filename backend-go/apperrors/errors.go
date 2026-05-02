package apperrors

import "errors"

var (
	ErrNotFound            = errors.New("resource not found")
	ErrConflict            = errors.New("resource conflict")
	ErrAlreadyExists       = errors.New("resource already exists")
	ErrTicketAlreadyExists = errors.New("Ticket already exists")
	ErrInvalidInput        = errors.New("invalid input")
	ErrUnauthorized        = errors.New("unauthorized")
	ErrForbidden           = errors.New("forbidden")
	ErrInternal            = errors.New("internal server error")
	ErrInvalidStatus       = errors.New("invalid status")
	ErrInvalidDateFormat   = errors.New("invalid date format")
	ErrInvalidCredentials  = errors.New("invalid credentials")
	ErrTokenExpired        = errors.New("token expired")
)

// warranty errors
var (
	ErrInvalidWarrantyStatus = errors.New("invalid warranty status")
	ErrWarrantyExpired       = errors.New("warranty expired")
	ErrWarrantyActivated     = errors.New("warranty activated")
	ErrWarrantyNotActive     = errors.New("warranty not active")
	ErrDuplicateSN           = errors.New("duplicate product serial number")
)

// transaction errors
var (
	ErrFailedCreateSnapTransaction = errors.New("failed to create snap transaction")
	ErrFailedCreateOrder           = errors.New("failed to create order")
)

var (
	ErrorPushNotification = errors.New("failed to push email notification")
)

type AppError struct {
	Code    string
	Message string
	Err     error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return e.Message + ": " + e.Err.Error()
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}
