package model
const (
	AuditKeyActor     = "actor"
	AuditKeyAPIPath   = "api_path"
	AuditKeyEvent     = "event"
	AuditKeyEventData = "event_data"
	AuditKeyEventName = "event_name"
	AuditKeyMeta      = "meta"
	AuditKeyError     = "error"
	AuditKeyStatus    = "status"
	AuditKeyUserID    = "user_id"
	AuditKeySessionID = "session_id"
	AuditKeyClient    = "client"
	AuditKeyIPAddress = "ip_address"
	AuditKeyClusterID = "cluster_id"
	AuditStatusSuccess = "success"
	AuditStatusAttempt = "attempt"
	AuditStatusFail    = "fail"
)
type AuditRecord struct {
	EventName string          `json:"event_name"`
	Status    string          `json:"status"`
	EventData AuditEventData  `json:"event"`
	Actor     AuditEventActor `json:"actor"`
	Meta      map[string]any  `json:"meta"`
	Error     AuditEventError `json:"error"`
}
type AuditEventData struct {
	Parameters  map[string]any `json:"parameters"`
	PriorState  map[string]any `json:"prior_state"`
	ResultState map[string]any `json:"resulting_state"`
	ObjectType  string         `json:"object_type"`
}
type AuditEventActor struct {
	UserId        string `json:"user_id"`
	SessionId     string `json:"session_id"`
	Client        string `json:"client"`
	IpAddress     string `json:"ip_address"`
	XForwardedFor string `json:"x_forwarded_for"`
}
type EventMeta struct {
	ApiPath   string `json:"api_path"`
	ClusterId string `json:"cluster_id"`
}
type AuditEventError struct {
	Description string `json:"description,omitempty"`
	Code        int    `json:"status_code,omitempty"`
}
type Auditable interface {
	Auditable() map[string]any
}
func (rec *AuditRecord) Success() {
	rec.Status = AuditStatusSuccess
}
func (rec *AuditRecord) Fail() {
	rec.Status = AuditStatusFail
}
func AddEventParameterToAuditRec[T string | bool | int | int64 | []string | map[string]string](rec *AuditRecord, key string, val T) {
	if rec.EventData.Parameters == nil {
		rec.EventData.Parameters = make(map[string]any)
	}
	rec.EventData.Parameters[key] = val
}
func AddEventParameterAuditableToAuditRec(rec *AuditRecord, key string, val Auditable) {
	if rec.EventData.Parameters == nil {
		rec.EventData.Parameters = make(map[string]any)
	}
	rec.EventData.Parameters[key] = val.Auditable()
}
func AddEventParameterAuditableArrayToAuditRec[T Auditable](rec *AuditRecord, key string, val []T) {
	if rec.EventData.Parameters == nil {
		rec.EventData.Parameters = make(map[string]any)
	}
	processedAuditables := make([]map[string]any, 0, len(val))
	for _, auditableVal := range val {
		processedAuditables = append(processedAuditables, auditableVal.Auditable())
	}
	rec.EventData.Parameters[key] = processedAuditables
}
func (rec *AuditRecord) AddEventPriorState(object Auditable) {
	rec.EventData.PriorState = object.Auditable()
}
func (rec *AuditRecord) AddEventResultState(object Auditable) {
	rec.EventData.ResultState = object.Auditable()
}
func (rec *AuditRecord) AddEventObjectType(objectType string) {
	rec.EventData.ObjectType = objectType
}
func (rec *AuditRecord) AddMeta(name string, val any) {
	rec.Meta[name] = val
}
func (rec *AuditRecord) AddErrorCode(code int) {
	rec.Error.Code = code
}
func (rec *AuditRecord) AddErrorDesc(description string) {
	rec.Error.Description = description
}
func (rec *AuditRecord) AddAppError(err *AppError) {
	rec.AddErrorCode(err.StatusCode)
	rec.AddErrorDesc(err.Error())
}