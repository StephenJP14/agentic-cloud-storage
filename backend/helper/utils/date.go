package utils

import "time"

func ResolveFinishedDate(fromPayload *string, fromRecord *time.Time, fallback time.Time) (time.Time, error) {
	if fromPayload != nil && *fromPayload != "" {
		return ParseDateString(*fromPayload)
	}
	if fromRecord != nil {
		return *fromRecord, nil
	}
	return fallback, nil
}

func CountWorkingDays(start, end time.Time) int {
	if end.Before(start) {
		start, end = end, start
	}

	days := 0
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		if wd := d.Weekday(); wd != time.Saturday && wd != time.Sunday {
			days++
		}
	}
	return days
}
