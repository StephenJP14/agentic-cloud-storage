package dto

import "gitlab.com/zyrex1/landing-page/models"

var StatusUpdateDTO struct {
	Status models.ServiceStatus `json:"status"`
}
