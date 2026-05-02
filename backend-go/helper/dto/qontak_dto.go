package dto

type QontakWebhookPayload struct {
	DataEvent string `json:"data_event"`
	Text      string `json:"text"`
	ID        string `json:"id"`
	Status    string `json:"status"`
	Sender    struct {
		Name string `json:"name"`
	} `json:"sender"`
	Room struct {
		AccountUniqID string `json:"account_uniq_id"` // Ini nomor WA customer
	} `json:"room"`
	Reply *struct {
		Text string `json:"text"` // Pesan asli dari sistem yang dijawab user
	} `json:"reply"`
}
