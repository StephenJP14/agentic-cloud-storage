// pkg/apperrors/http.go
package apperrors

import (
	"errors"
	"net/http"
)

// MapErrorToHTTPStatus maps application errors to HTTP status codes
func MapErrorToHTTPStatus(err error) int {
	switch {
	case errors.Is(err, ErrNotFound):
		return http.StatusNotFound
	case errors.Is(err, ErrConflict):
		return http.StatusConflict
	case errors.Is(err, ErrAlreadyExists):
		return http.StatusConflict
	case errors.Is(err, ErrInvalidInput):
		return http.StatusBadRequest
	case errors.Is(err, ErrUnauthorized):
		return http.StatusUnauthorized
	case errors.Is(err, ErrForbidden):
		return http.StatusForbidden
	case errors.Is(err, ErrInvalidStatus):
		return http.StatusBadRequest
	case errors.Is(err, ErrInvalidDateFormat):
		return http.StatusBadRequest
	case errors.Is(err, ErrFailedCreateSnapTransaction):
		return http.StatusInternalServerError
	case errors.Is(err, ErrFailedCreateOrder):
		return http.StatusInternalServerError
	case errors.Is(err, ErrInvalidCredentials):
		return http.StatusUnauthorized
	case errors.Is(err, ErrDuplicateSN):
		return http.StatusConflict
	case errors.Is(err, ErrWarrantyExpired):
		return http.StatusConflict
	case errors.Is(err, ErrWarrantyActivated):
		return http.StatusConflict
	case errors.Is(err, ErrTokenExpired):
		return http.StatusUnauthorized
	default:
		return http.StatusInternalServerError
	}
}

func GetUserFriendlyMessage(err error) string {
	switch {
	case errors.Is(err, ErrNotFound):
		return "Resource not found"
	case errors.Is(err, ErrConflict):
		return "Resource conflict"
	case errors.Is(err, ErrAlreadyExists):
		return "Resource already exists"
	case errors.Is(err, ErrTicketAlreadyExists):
		return "Ticket already exists"
	case errors.Is(err, ErrInvalidInput):
		return "Invalid input provided"
	case errors.Is(err, ErrUnauthorized):
		return "Authentication required"
	case errors.Is(err, ErrForbidden):
		return "Access denied"
	case errors.Is(err, ErrInvalidWarrantyStatus):
		return "Invalid warranty status"
	case errors.Is(err, ErrInvalidStatus):
		return "Invalid status request"
	case errors.Is(err, ErrInvalidDateFormat):
		return "Invalid Date Format"
	case errors.Is(err, ErrFailedCreateSnapTransaction):
		return "Failed to create snap transaction"
	case errors.Is(err, ErrFailedCreateOrder):
		return "Failed to create order"
	case errors.Is(err, ErrInvalidCredentials):
		return "Invalid credentials"
	case errors.Is(err, ErrDuplicateSN):
		return "Duplicate product serial number"
	case errors.Is(err, ErrWarrantyExpired):
		return "Warranty has already expired"
	case errors.Is(err, ErrWarrantyActivated):
		return "Warranty has already been activated"
	case errors.Is(err, ErrTokenExpired):
		return "Authentication token has expired"
	case errors.Is(err, ErrorPushNotification):
		return "Failed to push email notification"
	default:
		return "An internal error occurred"
	}
}
