package pluginapi
import (
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)
type PropertyService struct {
	api plugin.API
}
func (p *PropertyService) CreatePropertyField(field *model.PropertyField) (*model.PropertyField, error) {
	return p.api.CreatePropertyField(field)
}
func (p *PropertyService) GetPropertyField(groupID, fieldID string) (*model.PropertyField, error) {
	return p.api.GetPropertyField(groupID, fieldID)
}
func (p *PropertyService) GetPropertyFields(groupID string, ids []string) ([]*model.PropertyField, error) {
	return p.api.GetPropertyFields(groupID, ids)
}
func (p *PropertyService) UpdatePropertyField(groupID string, field *model.PropertyField) (*model.PropertyField, error) {
	return p.api.UpdatePropertyField(groupID, field)
}
func (p *PropertyService) DeletePropertyField(groupID, fieldID string) error {
	return p.api.DeletePropertyField(groupID, fieldID)
}
func (p *PropertyService) SearchPropertyFields(groupID string, opts model.PropertyFieldSearchOpts) ([]*model.PropertyField, error) {
	return p.api.SearchPropertyFields(groupID, opts)
}
func (p *PropertyService) CountPropertyFields(groupID string, includeDeleted bool) (int64, error) {
	return p.api.CountPropertyFields(groupID, includeDeleted)
}
func (p *PropertyService) CountPropertyFieldsForTarget(groupID, targetType, targetID string, includeDeleted bool) (int64, error) {
	return p.api.CountPropertyFieldsForTarget(groupID, targetType, targetID, includeDeleted)
}
func (p *PropertyService) CreatePropertyValue(value *model.PropertyValue) (*model.PropertyValue, error) {
	return p.api.CreatePropertyValue(value)
}
func (p *PropertyService) GetPropertyValue(groupID, valueID string) (*model.PropertyValue, error) {
	return p.api.GetPropertyValue(groupID, valueID)
}
func (p *PropertyService) GetPropertyValues(groupID string, ids []string) ([]*model.PropertyValue, error) {
	return p.api.GetPropertyValues(groupID, ids)
}
func (p *PropertyService) UpdatePropertyValue(groupID string, value *model.PropertyValue) (*model.PropertyValue, error) {
	return p.api.UpdatePropertyValue(groupID, value)
}
func (p *PropertyService) UpsertPropertyValue(value *model.PropertyValue) (*model.PropertyValue, error) {
	return p.api.UpsertPropertyValue(value)
}
func (p *PropertyService) DeletePropertyValue(groupID, valueID string) error {
	return p.api.DeletePropertyValue(groupID, valueID)
}
func (p *PropertyService) SearchPropertyValues(groupID string, opts model.PropertyValueSearchOpts) ([]*model.PropertyValue, error) {
	return p.api.SearchPropertyValues(groupID, opts)
}
func (p *PropertyService) RegisterPropertyGroup(name string) (*model.PropertyGroup, error) {
	return p.api.RegisterPropertyGroup(name)
}
func (p *PropertyService) GetPropertyGroup(name string) (*model.PropertyGroup, error) {
	return p.api.GetPropertyGroup(name)
}
func (p *PropertyService) GetPropertyFieldByName(groupID, targetID, name string) (*model.PropertyField, error) {
	return p.api.GetPropertyFieldByName(groupID, targetID, name)
}
func (p *PropertyService) UpdatePropertyFields(groupID string, fields []*model.PropertyField) ([]*model.PropertyField, error) {
	return p.api.UpdatePropertyFields(groupID, fields)
}
func (p *PropertyService) UpdatePropertyValues(groupID string, values []*model.PropertyValue) ([]*model.PropertyValue, error) {
	return p.api.UpdatePropertyValues(groupID, values)
}
func (p *PropertyService) UpsertPropertyValues(values []*model.PropertyValue) ([]*model.PropertyValue, error) {
	return p.api.UpsertPropertyValues(values)
}
func (p *PropertyService) DeletePropertyValuesForTarget(groupID, targetType, targetID string) error {
	return p.api.DeletePropertyValuesForTarget(groupID, targetType, targetID)
}
func (p *PropertyService) DeletePropertyValuesForField(groupID, fieldID string) error {
	return p.api.DeletePropertyValuesForField(groupID, fieldID)
}