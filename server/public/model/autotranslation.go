package model
import (
	"context"
	"encoding/json"
	"maps"
)
const (
	TranslationObjectTypePost = "post"
)
type TranslationType string
const (
	TranslationTypeString TranslationType = "string"
	TranslationTypeObject TranslationType = "object"
)
type TranslationState string
const (
	TranslationStateReady       TranslationState = "ready"
	TranslationStateSkipped     TranslationState = "skipped"
	TranslationStateProcessing  TranslationState = "processing"
	TranslationStateUnavailable TranslationState = "unavailable"
)
type Translation struct {
	ObjectID   string           `json:"object_id"`
	ObjectType string           `json:"object_type"`
	ChannelID  string           `json:"channel_id,omitempty"`
	Lang       string           `json:"lang"`
	Provider   string           `json:"provider"`
	Type       TranslationType  `json:"type"`
	Text       string           `json:"text"`
	ObjectJSON json.RawMessage  `json:"object_json,omitempty"`
	Confidence *float64         `json:"confidence,omitempty"`
	State      TranslationState `json:"state"`
	Meta       map[string]any   `json:"meta,omitempty"`
	NormHash   string           `json:"norm_hash,omitempty"`
	UpdateAt   int64            `json:"update_at,omitempty"`
}
func (t *Translation) Clone() *Translation {
	if t == nil {
		return nil
	}
	var confidence *float64
	if t.Confidence != nil {
		val := *t.Confidence
		confidence = &val
	}
	var meta map[string]any
	if t.Meta != nil {
		meta = make(map[string]any, len(t.Meta))
		maps.Copy(meta, t.Meta)
	}
	var objectJSON json.RawMessage
	if t.ObjectJSON != nil {
		objectJSON = make([]byte, len(t.ObjectJSON))
		copy(objectJSON, t.ObjectJSON)
	}
	return &Translation{
		ObjectID:   t.ObjectID,
		ObjectType: t.ObjectType,
		ChannelID:  t.ChannelID,
		Lang:       t.Lang,
		Provider:   t.Provider,
		Type:       t.Type,
		Text:       t.Text,
		ObjectJSON: objectJSON,
		Confidence: confidence,
		State:      t.State,
		Meta:       meta,
		NormHash:   t.NormHash,
		UpdateAt:   t.UpdateAt,
	}
}
func (t *Translation) ToPostTranslation() *PostTranslation {
	if t == nil {
		return nil
	}
	var sourceLang string
	if srcLang, ok := t.Meta["src_lang"].(string); ok {
		sourceLang = srcLang
	}
	pt := &PostTranslation{
		State:      string(t.State),
		SourceLang: sourceLang,
	}
	if t.Type == TranslationTypeObject {
		pt.Object = t.ObjectJSON
	} else {
		pt.Text = t.Text
	}
	return pt
}
func (t *Translation) IsValid() *AppError {
	if t == nil {
		return NewAppError("Translation.IsValid", "model.translation.is_valid.nil.app_error", nil, "", 400)
	}
	if t.ObjectID == "" || !IsValidId(t.ObjectID) {
		return NewAppError("Translation.IsValid", "model.translation.is_valid.object_id.app_error", nil, "invalid object id", 400)
	}
	if t.ObjectType == "" {
		return NewAppError("Translation.IsValid", "model.translation.is_valid.object_type.app_error", nil, "object type is empty", 400)
	}
	if t.Lang == "" {
		return NewAppError("Translation.IsValid", "model.translation.is_valid.lang.app_error", nil, "lang is empty", 400)
	}
	if t.State == TranslationStateReady {
		if t.Provider == "" {
			return NewAppError("Translation.IsValid", "model.translation.is_valid.provider.app_error", nil, "provider is empty for ready state", 400)
		}
		if t.Type == "" {
			return NewAppError("Translation.IsValid", "model.translation.is_valid.type.app_error", nil, "type is empty", 400)
		}
		if t.Type != TranslationTypeString && t.Type != TranslationTypeObject {
			return NewAppError("Translation.IsValid", "model.translation.is_valid.type_invalid.app_error", nil, "invalid type", 400)
		}
		if t.Type == TranslationTypeString && t.Text == "" {
			return NewAppError("Translation.IsValid", "model.translation.is_valid.text.app_error", nil, "text is empty", 400)
		}
		if t.Type == TranslationTypeObject && len(t.ObjectJSON) == 0 {
			return NewAppError("Translation.IsValid", "model.translation.is_valid.object_json.app_error", nil, "object json is empty", 400)
		}
	}
	if t.State == TranslationStateUnavailable && t.Provider == "" {
		return NewAppError("Translation.IsValid", "model.translation.is_valid.provider.app_error", nil, "provider is empty for unavailable state", 400)
	}
	return nil
}
type AutoTranslationContextKey string
const (
	ContextKeyAutoTranslationPath AutoTranslationContextKey = "autotranslation_path"
)
type ErrAutoTranslationNotAvailable struct {
	reason string
}
func (e *ErrAutoTranslationNotAvailable) Error() string {
	if e.reason != "" {
		return "auto-translation feature not available: " + e.reason
	}
	return "auto-translation feature not available"
}
func NewErrAutoTranslationNotAvailable(reason string) *ErrAutoTranslationNotAvailable {
	return &ErrAutoTranslationNotAvailable{reason: reason}
}
type AutoTranslationPath string
const (
	AutoTranslationPathCreate            AutoTranslationPath = "create"
	AutoTranslationPathEdit              AutoTranslationPath = "edit"
	AutoTranslationPathFetch             AutoTranslationPath = "fetch"
	AutoTranslationPathWebSocket         AutoTranslationPath = "websocket"
	AutoTranslationPathPushNotification  AutoTranslationPath = "push_notification"
	AutoTranslationPathEmailNotification AutoTranslationPath = "email_notification"
	AutoTranslationPathUnknown           AutoTranslationPath = "unknown"
)
func WithAutoTranslationPath(ctx context.Context, path AutoTranslationPath) context.Context {
	return context.WithValue(ctx, ContextKeyAutoTranslationPath, path)
}
func GetAutoTranslationPath(ctx context.Context) AutoTranslationPath {
	if path, ok := ctx.Value(ContextKeyAutoTranslationPath).(AutoTranslationPath); ok {
		return path
	}
	return AutoTranslationPathUnknown
}