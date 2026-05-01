package utils

import (
	"strconv"
	"strings"
	"time"

	"gitlab.com/zyrex1/landing-page/apperrors"
)

func ParseDateString(value string) (time.Time, error) {
	if value == "" {
		return time.Time{}, apperrors.ErrInvalidDateFormat
	}

	// Sanitize the value first
	value = strings.TrimSpace(value)

	if strings.HasPrefix(value, "-") || strings.HasPrefix(value, "/") {
		return time.Time{}, apperrors.ErrInvalidDateFormat
	}

	// 1. RFC3339 / ISO-8601 (Date(), DayJS, Moment)
	if t, err := time.Parse(time.RFC3339, value); err == nil {
		return t, nil
	}

	// 2. Date-only input (HTML <input type="date">)
	if t, err := time.Parse("2006-01-02", value); err == nil {
		return t, nil
	}

	// 2b. DateTime format (YYYY-MM-DD HH:MM:SS)
	if t, err := time.Parse("2006-01-02 15:04:05", value); err == nil {
		return t, nil
	}

	// 3. Common slash-separated formats (DD/MM/YYYY, DD/MM/YY, MM/YY)
	layouts := []string{
		"02/01/2006", // DD/MM/YYYY
		"2/1/2006",   // D/M/YYYY
		"02/01/06",   // DD/MM/YY
		"2/1/06",     // D/M/YY
		"01/2006",    // MM/YYYY
		"1/2006",     // M/YYYY
		"01/06",      // MM/YY
		"1/06",       // M/YY
	}
	for _, layout := range layouts {
		if t, err := time.Parse(layout, value); err == nil {
			return t, nil
		}
	}

	// 4. Handle partial dates like "09/25" (MM/YY format)
	// Try to parse as MM/YY and assume day 1
	if len(value) <= 5 && strings.Contains(value, "/") {
		parts := strings.Split(value, "/")
		if len(parts) == 2 {
			month, err1 := strconv.Atoi(parts[0])
			year, err2 := strconv.Atoi(parts[1])
			if err1 == nil && err2 == nil && month >= 1 && month <= 12 {
				// Assume 20XX for years 00-50, 19XX for 51-99
				if year < 100 {
					if year <= 50 {
						year += 2000
					} else {
						year += 1900
					}
				}
				return time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC), nil
			}
		}
	}

	// 5. Common human readable formats (e.g. "3 February 2023", "02 January 2006", "January 2, 2006")
	textLayouts := []string{
		"2 January 2006",
		"02 January 2006",
		"January 2, 2006",
		"2 Jan 2006",
	}
	for _, layout := range textLayouts {
		if t, err := time.Parse(layout, value); err == nil {
			return t, nil
		}
	}

	// 6. Unix timestamp (milliseconds or seconds)
	if unix, err := strconv.ParseInt(value, 10, 64); err == nil {
		// milliseconds (13 digits)
		if unix > 1e12 {
			return time.UnixMilli(unix), nil
		}
		// seconds (10 digits)
		if unix > 1e9 {
			return time.Unix(unix, 0), nil
		}
	}

	return time.Time{}, apperrors.ErrInvalidDateFormat
}

func ParseInt(value string) (int, error) {
	if value == "" {
		return 0, nil
	}
	i, err := strconv.Atoi(value)
	if err != nil {
		return 0, err
	}
	return i, nil
}

// SanitizeString cleans up string values from Excel imports
// Returns empty string if value is blank, "-", or other placeholder values
func SanitizeString(value string) string {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" || trimmed == "-" || trimmed == "N/A" || trimmed == "n/a" || trimmed == "NA" {
		return ""
	}
	// Check for invalid date patterns like "-/25", "/25", etc.
	if strings.HasPrefix(trimmed, "-/") || strings.HasPrefix(trimmed, "/") {
		return ""
	}
	return trimmed
}

// SanitizeStringPtr returns a pointer to sanitized string, or nil if empty
func SanitizeStringPtr(value string) *string {
	sanitized := SanitizeString(value)
	if sanitized == "" {
		return nil
	}
	return &sanitized
}
