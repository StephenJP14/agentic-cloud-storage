package utils

import (
	"fmt"

	"gitlab.com/zyrex1/landing-page/apperrors"
	"gitlab.com/zyrex1/landing-page/models"
)

func ParseFormStatus(s string) (models.FormStatus, error) {
	switch models.FormStatus(s) {
	case models.Pending, models.Contacted, models.Responded, models.Ongoing, models.Completed, models.Closed:
		return models.FormStatus(s), nil
	default:
		return "", fmt.Errorf("%w: %s", apperrors.ErrInvalidStatus, s)
	}
}

func ParseProductSegment(s string) (models.ProductSegment, error) {
	switch models.ProductSegment(s) {
	case models.B2B, models.B2C, models.B2G:
		return models.ProductSegment(s), nil
	default:
		return "", fmt.Errorf("%w: %s", apperrors.ErrInvalidStatus, s)
	}
}
func IsValidProductSegment(ps models.ProductSegment) bool {
	switch ps {
	case models.B2B, models.B2C, models.B2G:
		return true
	default:
		return false
	}
}
