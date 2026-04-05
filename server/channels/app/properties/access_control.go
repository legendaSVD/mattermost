package properties
import (
	"encoding/json"
	"fmt"
	"maps"
	"github.com/mattermost/mattermost/server/public/model"
)
const (
	propertyAccessPaginationPageSize = 100
	propertyAccessMaxPaginationIterations = 10
)
type PluginChecker func(pluginID string) bool
type PropertyAccessService struct {
	propertyService *PropertyService
	pluginChecker   PluginChecker
}
func NewPropertyAccessService(ps *PropertyService, pluginChecker PluginChecker) *PropertyAccessService {
	return &PropertyAccessService{
		propertyService: ps,
		pluginChecker:   pluginChecker,
	}
}
func (pas *PropertyAccessService) setPluginCheckerForTests(pluginChecker PluginChecker) {
	pas.pluginChecker = pluginChecker
}
func (pas *PropertyAccessService) isCallerPlugin(callerID string) bool {
	return callerID != "" && pas.pluginChecker != nil && pas.pluginChecker(callerID)
}
func (pas *PropertyAccessService) CreatePropertyField(callerID string, field *model.PropertyField) (*model.PropertyField, error) {
	if pas.isCallerPlugin(callerID) {
		if field.Attrs == nil {
			field.Attrs = make(model.StringInterface)
		}
		field.Attrs[model.PropertyAttrsSourcePluginID] = callerID
	} else {
		if pas.getSourcePluginID(field) != "" {
			return nil, fmt.Errorf("CreatePropertyField: source_plugin_id can only be set by a plugin")
		}
		if model.IsPropertyFieldProtected(field) {
			return nil, fmt.Errorf("CreatePropertyField: protected can only be set by a plugin")
		}
	}
	if err := model.ValidatePropertyFieldAccessMode(field); err != nil {
		return nil, fmt.Errorf("CreatePropertyField: %w", err)
	}
	result, err := pas.propertyService.createPropertyField(field)
	if err != nil {
		return nil, fmt.Errorf("CreatePropertyField: %w", err)
	}
	return result, nil
}
func (pas *PropertyAccessService) GetPropertyField(callerID string, groupID, id string) (*model.PropertyField, error) {
	field, err := pas.propertyService.getPropertyField(groupID, id)
	if err != nil {
		return nil, fmt.Errorf("GetPropertyField: %w", err)
	}
	return pas.applyFieldReadAccessControl(field, callerID), nil
}
func (pas *PropertyAccessService) GetPropertyFields(callerID string, groupID string, ids []string) ([]*model.PropertyField, error) {
	fields, err := pas.propertyService.getPropertyFields(groupID, ids)
	if err != nil {
		return nil, fmt.Errorf("GetPropertyFields: %w", err)
	}
	return pas.applyFieldReadAccessControlToList(fields, callerID), nil
}
func (pas *PropertyAccessService) GetPropertyFieldByName(callerID string, groupID, targetID, name string) (*model.PropertyField, error) {
	field, err := pas.propertyService.getPropertyFieldByName(groupID, targetID, name)
	if err != nil {
		return nil, fmt.Errorf("GetPropertyFieldByName: %w", err)
	}
	return pas.applyFieldReadAccessControl(field, callerID), nil
}
func (pas *PropertyAccessService) CountActivePropertyFieldsForGroup(groupID string) (int64, error) {
	return pas.propertyService.countActivePropertyFieldsForGroup(groupID)
}
func (pas *PropertyAccessService) CountAllPropertyFieldsForGroup(groupID string) (int64, error) {
	return pas.propertyService.countAllPropertyFieldsForGroup(groupID)
}
func (pas *PropertyAccessService) CountActivePropertyFieldsForTarget(groupID, targetType, targetID string) (int64, error) {
	return pas.propertyService.countActivePropertyFieldsForTarget(groupID, targetType, targetID)
}
func (pas *PropertyAccessService) CountAllPropertyFieldsForTarget(groupID, targetType, targetID string) (int64, error) {
	return pas.propertyService.countAllPropertyFieldsForTarget(groupID, targetType, targetID)
}
func (pas *PropertyAccessService) SearchPropertyFields(callerID string, groupID string, opts model.PropertyFieldSearchOpts) ([]*model.PropertyField, error) {
	fields, err := pas.propertyService.searchPropertyFields(groupID, opts)
	if err != nil {
		return nil, fmt.Errorf("SearchPropertyFields: %w", err)
	}
	return pas.applyFieldReadAccessControlToList(fields, callerID), nil
}
func (pas *PropertyAccessService) UpdatePropertyField(callerID string, groupID string, field *model.PropertyField) (*model.PropertyField, error) {
	existingField, existsErr := pas.propertyService.getPropertyField(groupID, field.ID)
	if existsErr != nil {
		return nil, fmt.Errorf("UpdatePropertyField: %w", existsErr)
	}
	if err := pas.checkFieldWriteAccess(existingField, callerID); err != nil {
		return nil, fmt.Errorf("UpdatePropertyField: %w", err)
	}
	if err := pas.ensureSourcePluginIDUnchanged(existingField, field); err != nil {
		return nil, fmt.Errorf("UpdatePropertyField: %w", err)
	}
	if err := pas.validateProtectedFieldUpdate(field, callerID); err != nil {
		return nil, fmt.Errorf("UpdatePropertyField: %w", err)
	}
	if err := model.ValidatePropertyFieldAccessMode(field); err != nil {
		return nil, fmt.Errorf("UpdatePropertyField: %w", err)
	}
	result, err := pas.propertyService.updatePropertyField(groupID, field)
	if err != nil {
		return nil, fmt.Errorf("UpdatePropertyField: %w", err)
	}
	return result, nil
}
func (pas *PropertyAccessService) UpdatePropertyFields(callerID string, groupID string, fields []*model.PropertyField) ([]*model.PropertyField, error) {
	if len(fields) == 0 {
		return fields, nil
	}
	fieldIDs := make([]string, len(fields))
	for i, field := range fields {
		fieldIDs[i] = field.ID
	}
	existingFields, existsErr := pas.propertyService.getPropertyFields(groupID, fieldIDs)
	if existsErr != nil {
		return nil, fmt.Errorf("UpdatePropertyFields: %w", existsErr)
	}
	existingFieldMap := make(map[string]*model.PropertyField, len(existingFields))
	for _, field := range existingFields {
		existingFieldMap[field.ID] = field
	}
	for _, field := range fields {
		existingField, exists := existingFieldMap[field.ID]
		if !exists {
			return nil, fmt.Errorf("field %s not found", field.ID)
		}
		if err := pas.checkFieldWriteAccess(existingField, callerID); err != nil {
			return nil, fmt.Errorf("UpdatePropertyFields: field %s: %w", field.ID, err)
		}
		if err := pas.ensureSourcePluginIDUnchanged(existingField, field); err != nil {
			return nil, fmt.Errorf("UpdatePropertyFields: field %s: %w", field.ID, err)
		}
		if err := pas.validateProtectedFieldUpdate(field, callerID); err != nil {
			return nil, fmt.Errorf("UpdatePropertyFields: field %s: %w", field.ID, err)
		}
		if err := model.ValidatePropertyFieldAccessMode(field); err != nil {
			return nil, fmt.Errorf("UpdatePropertyFields: field %s: %w", field.ID, err)
		}
	}
	result, err := pas.propertyService.updatePropertyFields(groupID, fields)
	if err != nil {
		return nil, fmt.Errorf("UpdatePropertyFields: %w", err)
	}
	return result, nil
}
func (pas *PropertyAccessService) DeletePropertyField(callerID string, groupID, id string) error {
	existingField, err := pas.propertyService.getPropertyField(groupID, id)
	if err != nil {
		return fmt.Errorf("DeletePropertyField: %w", err)
	}
	if err := pas.checkFieldDeleteAccess(existingField, callerID); err != nil {
		return fmt.Errorf("DeletePropertyField: %w", err)
	}
	if err := pas.propertyService.deletePropertyField(groupID, id); err != nil {
		return fmt.Errorf("DeletePropertyField: %w", err)
	}
	return nil
}
func (pas *PropertyAccessService) CreatePropertyValue(callerID string, value *model.PropertyValue) (*model.PropertyValue, error) {
	field, err := pas.propertyService.getPropertyField(value.GroupID, value.FieldID)
	if err != nil {
		return nil, fmt.Errorf("CreatePropertyValue: %w", err)
	}
	if err = pas.checkFieldWriteAccess(field, callerID); err != nil {
		return nil, fmt.Errorf("CreatePropertyValue: %w", err)
	}
	result, err := pas.propertyService.createPropertyValue(value)
	if err != nil {
		return nil, fmt.Errorf("CreatePropertyValue: %w", err)
	}
	return result, nil
}
func (pas *PropertyAccessService) CreatePropertyValues(callerID string, values []*model.PropertyValue) ([]*model.PropertyValue, error) {
	fieldMap, err := pas.getFieldsForValues(values)
	if err != nil {
		return nil, fmt.Errorf("CreatePropertyValues: %w", err)
	}
	for _, value := range values {
		field, exists := fieldMap[value.FieldID]
		if !exists {
			return nil, fmt.Errorf("CreatePropertyValues: field %s not found", value.FieldID)
		}
		if err = pas.checkFieldWriteAccess(field, callerID); err != nil {
			return nil, fmt.Errorf("CreatePropertyValues: field %s: %w", value.FieldID, err)
		}
	}
	result, err := pas.propertyService.createPropertyValues(values)
	if err != nil {
		return nil, fmt.Errorf("CreatePropertyValues: %w", err)
	}
	return result, nil
}
func (pas *PropertyAccessService) GetPropertyValue(callerID string, groupID, id string) (*model.PropertyValue, error) {
	value, err := pas.propertyService.getPropertyValue(groupID, id)
	if err != nil {
		return nil, fmt.Errorf("GetPropertyValue: %w", err)
	}
	filtered, err := pas.applyValueReadAccessControl([]*model.PropertyValue{value}, callerID)
	if err != nil {
		return nil, fmt.Errorf("GetPropertyValue: %w", err)
	}
	if len(filtered) == 0 {
		return nil, nil
	}
	return filtered[0], nil
}
func (pas *PropertyAccessService) GetPropertyValues(callerID string, groupID string, ids []string) ([]*model.PropertyValue, error) {
	values, err := pas.propertyService.getPropertyValues(groupID, ids)
	if err != nil {
		return nil, fmt.Errorf("GetPropertyValues: %w", err)
	}
	filtered, err := pas.applyValueReadAccessControl(values, callerID)
	if err != nil {
		return nil, fmt.Errorf("GetPropertyValues: %w", err)
	}
	return filtered, nil
}
func (pas *PropertyAccessService) SearchPropertyValues(callerID string, groupID string, opts model.PropertyValueSearchOpts) ([]*model.PropertyValue, error) {
	values, err := pas.propertyService.searchPropertyValues(groupID, opts)
	if err != nil {
		return nil, fmt.Errorf("SearchPropertyValues: %w", err)
	}
	filtered, err := pas.applyValueReadAccessControl(values, callerID)
	if err != nil {
		return nil, fmt.Errorf("SearchPropertyValues: %w", err)
	}
	return filtered, nil
}
func (pas *PropertyAccessService) UpdatePropertyValue(callerID string, groupID string, value *model.PropertyValue) (*model.PropertyValue, error) {
	field, err := pas.propertyService.getPropertyField(groupID, value.FieldID)
	if err != nil {
		return nil, fmt.Errorf("UpdatePropertyValue: %w", err)
	}
	if err = pas.checkFieldWriteAccess(field, callerID); err != nil {
		return nil, fmt.Errorf("UpdatePropertyValue: %w", err)
	}
	result, err := pas.propertyService.updatePropertyValue(groupID, value)
	if err != nil {
		return nil, fmt.Errorf("UpdatePropertyValue: %w", err)
	}
	return result, nil
}
func (pas *PropertyAccessService) UpdatePropertyValues(callerID string, groupID string, values []*model.PropertyValue) ([]*model.PropertyValue, error) {
	if len(values) == 0 {
		return values, nil
	}
	fieldMap, err := pas.getFieldsForValues(values)
	if err != nil {
		return nil, fmt.Errorf("UpdatePropertyValues: %w", err)
	}
	for _, value := range values {
		field, exists := fieldMap[value.FieldID]
		if !exists {
			return nil, fmt.Errorf("UpdatePropertyValues: field %s not found", value.FieldID)
		}
		if err = pas.checkFieldWriteAccess(field, callerID); err != nil {
			return nil, fmt.Errorf("UpdatePropertyValues: field %s: %w", value.FieldID, err)
		}
	}
	result, err := pas.propertyService.updatePropertyValues(groupID, values)
	if err != nil {
		return nil, fmt.Errorf("UpdatePropertyValues: %w", err)
	}
	return result, nil
}
func (pas *PropertyAccessService) UpsertPropertyValue(callerID string, value *model.PropertyValue) (*model.PropertyValue, error) {
	field, err := pas.propertyService.getPropertyField(value.GroupID, value.FieldID)
	if err != nil {
		return nil, fmt.Errorf("UpsertPropertyValue: %w", err)
	}
	if err = pas.checkFieldWriteAccess(field, callerID); err != nil {
		return nil, fmt.Errorf("UpsertPropertyValue: %w", err)
	}
	result, err := pas.propertyService.upsertPropertyValue(value)
	if err != nil {
		return nil, fmt.Errorf("UpsertPropertyValue: %w", err)
	}
	return result, nil
}
func (pas *PropertyAccessService) UpsertPropertyValues(callerID string, values []*model.PropertyValue) ([]*model.PropertyValue, error) {
	if len(values) == 0 {
		return values, nil
	}
	fieldMap, err := pas.getFieldsForValues(values)
	if err != nil {
		return nil, fmt.Errorf("UpsertPropertyValues: %w", err)
	}
	for _, value := range values {
		field, exists := fieldMap[value.FieldID]
		if !exists {
			return nil, fmt.Errorf("UpsertPropertyValues: field %s not found", value.FieldID)
		}
		if err = pas.checkFieldWriteAccess(field, callerID); err != nil {
			return nil, fmt.Errorf("UpsertPropertyValues: field %s: %w", value.FieldID, err)
		}
	}
	result, err := pas.propertyService.upsertPropertyValues(values)
	if err != nil {
		return nil, fmt.Errorf("UpsertPropertyValues: %w", err)
	}
	return result, nil
}
func (pas *PropertyAccessService) DeletePropertyValue(callerID string, groupID, id string) error {
	value, err := pas.propertyService.getPropertyValue(groupID, id)
	if err != nil {
		return nil
	}
	field, err := pas.propertyService.getPropertyField(groupID, value.FieldID)
	if err != nil {
		return fmt.Errorf("DeletePropertyValue: %w", err)
	}
	if err := pas.checkFieldWriteAccess(field, callerID); err != nil {
		return fmt.Errorf("DeletePropertyValue: %w", err)
	}
	if err := pas.propertyService.deletePropertyValue(groupID, id); err != nil {
		return fmt.Errorf("DeletePropertyValue: %w", err)
	}
	return nil
}
func (pas *PropertyAccessService) DeletePropertyValuesForTarget(callerID string, groupID string, targetType string, targetID string) error {
	fieldIDs := make(map[string]struct{})
	var cursor model.PropertyValueSearchCursor
	iterations := 0
	for {
		iterations++
		if iterations > propertyAccessMaxPaginationIterations {
			return fmt.Errorf("DeletePropertyValuesForTarget: exceeded maximum pagination iterations (%d)", propertyAccessMaxPaginationIterations)
		}
		opts := model.PropertyValueSearchOpts{
			TargetType: targetType,
			TargetIDs:  []string{targetID},
			PerPage:    propertyAccessPaginationPageSize,
		}
		if !cursor.IsEmpty() {
			opts.Cursor = cursor
		}
		values, err := pas.propertyService.searchPropertyValues(groupID, opts)
		if err != nil {
			return fmt.Errorf("DeletePropertyValuesForTarget: %w", err)
		}
		for _, value := range values {
			fieldIDs[value.FieldID] = struct{}{}
		}
		if len(values) < propertyAccessPaginationPageSize {
			break
		}
		lastValue := values[len(values)-1]
		cursor = model.PropertyValueSearchCursor{
			PropertyValueID: lastValue.ID,
			CreateAt:        lastValue.CreateAt,
		}
	}
	if len(fieldIDs) == 0 {
		return nil
	}
	fieldIDSlice := make([]string, 0, len(fieldIDs))
	for fieldID := range fieldIDs {
		fieldIDSlice = append(fieldIDSlice, fieldID)
	}
	fields, err := pas.propertyService.getPropertyFields(groupID, fieldIDSlice)
	if err != nil {
		return fmt.Errorf("DeletePropertyValuesForTarget: %w", err)
	}
	for _, field := range fields {
		if err := pas.checkFieldWriteAccess(field, callerID); err != nil {
			return fmt.Errorf("DeletePropertyValuesForTarget: field %s: %w", field.ID, err)
		}
	}
	if err := pas.propertyService.deletePropertyValuesForTarget(groupID, targetType, targetID); err != nil {
		return fmt.Errorf("DeletePropertyValuesForTarget: %w", err)
	}
	return nil
}
func (pas *PropertyAccessService) DeletePropertyValuesForField(callerID string, groupID, fieldID string) error {
	field, err := pas.propertyService.getPropertyField(groupID, fieldID)
	if err != nil {
		return nil
	}
	if err := pas.checkFieldWriteAccess(field, callerID); err != nil {
		return fmt.Errorf("DeletePropertyValuesForField: %w", err)
	}
	if err := pas.propertyService.deletePropertyValuesForField(groupID, fieldID); err != nil {
		return fmt.Errorf("DeletePropertyValuesForField: %w", err)
	}
	return nil
}
func (pas *PropertyAccessService) getSourcePluginID(field *model.PropertyField) string {
	if field.Attrs == nil {
		return ""
	}
	sourcePluginID, _ := field.Attrs[model.PropertyAttrsSourcePluginID].(string)
	return sourcePluginID
}
func (pas *PropertyAccessService) getAccessMode(field *model.PropertyField) string {
	if field.Attrs == nil {
		return model.PropertyAccessModePublic
	}
	accessMode, ok := field.Attrs[model.PropertyAttrsAccessMode].(string)
	if !ok {
		return model.PropertyAccessModePublic
	}
	return accessMode
}
func (pas *PropertyAccessService) hasUnrestrictedFieldReadAccess(field *model.PropertyField, callerID string) bool {
	accessMode := pas.getAccessMode(field)
	if accessMode == model.PropertyAccessModePublic {
		return true
	}
	sourcePluginID := pas.getSourcePluginID(field)
	if sourcePluginID != "" && sourcePluginID == callerID {
		return true
	}
	return false
}
func (pas *PropertyAccessService) ensureSourcePluginIDUnchanged(existingField, updatedField *model.PropertyField) error {
	existingSourcePluginID := pas.getSourcePluginID(existingField)
	updatedSourcePluginID := pas.getSourcePluginID(updatedField)
	if existingSourcePluginID != updatedSourcePluginID {
		return fmt.Errorf("source_plugin_id is immutable and cannot be changed from '%s' to '%s'", existingSourcePluginID, updatedSourcePluginID)
	}
	return nil
}
func (pas *PropertyAccessService) validateProtectedFieldUpdate(updatedField *model.PropertyField, callerID string) error {
	if !model.IsPropertyFieldProtected(updatedField) {
		return nil
	}
	sourcePluginID := pas.getSourcePluginID(updatedField)
	if sourcePluginID == "" {
		return fmt.Errorf("cannot set protected=true on a field without a source_plugin_id")
	}
	if sourcePluginID != callerID {
		return fmt.Errorf("cannot set protected=true: only source plugin '%s' can modify this field", sourcePluginID)
	}
	return nil
}
func (pas *PropertyAccessService) checkFieldWriteAccess(field *model.PropertyField, callerID string) error {
	if !model.IsPropertyFieldProtected(field) {
		return nil
	}
	sourcePluginID := pas.getSourcePluginID(field)
	if sourcePluginID == "" {
		return fmt.Errorf("field %s is protected, but has no associated source plugin", field.ID)
	}
	if sourcePluginID != callerID {
		return fmt.Errorf("field %s is protected and can only be modified by source plugin '%s'", field.ID, sourcePluginID)
	}
	return nil
}
func (pas *PropertyAccessService) checkFieldDeleteAccess(field *model.PropertyField, callerID string) error {
	if !model.IsPropertyFieldProtected(field) {
		return nil
	}
	sourcePluginID := pas.getSourcePluginID(field)
	if sourcePluginID == "" {
		return nil
	}
	if pas.pluginChecker != nil && !pas.pluginChecker(sourcePluginID) {
		return nil
	}
	if sourcePluginID != callerID {
		return fmt.Errorf("field %s is protected and can only be modified by source plugin '%s'", field.ID, sourcePluginID)
	}
	return nil
}
func (pas *PropertyAccessService) getCallerValuesForField(groupID, fieldID, callerID string) ([]*model.PropertyValue, error) {
	if callerID == "" {
		return []*model.PropertyValue{}, nil
	}
	allValues := []*model.PropertyValue{}
	var cursor model.PropertyValueSearchCursor
	iterations := 0
	for {
		iterations++
		if iterations > propertyAccessMaxPaginationIterations {
			return nil, fmt.Errorf("getCallerValuesForField: exceeded maximum pagination iterations (%d)", propertyAccessMaxPaginationIterations)
		}
		opts := model.PropertyValueSearchOpts{
			FieldID:   fieldID,
			TargetIDs: []string{callerID},
			PerPage:   propertyAccessPaginationPageSize,
		}
		if !cursor.IsEmpty() {
			opts.Cursor = cursor
		}
		values, err := pas.propertyService.searchPropertyValues(groupID, opts)
		if err != nil {
			return nil, fmt.Errorf("failed to get caller values for field: %w", err)
		}
		allValues = append(allValues, values...)
		if len(values) < propertyAccessPaginationPageSize {
			break
		}
		lastValue := values[len(values)-1]
		cursor = model.PropertyValueSearchCursor{
			PropertyValueID: lastValue.ID,
			CreateAt:        lastValue.CreateAt,
		}
	}
	return allValues, nil
}
func (pas *PropertyAccessService) extractOptionIDsFromValue(fieldType model.PropertyFieldType, value []byte) (map[string]struct{}, error) {
	if len(value) == 0 {
		return nil, nil
	}
	optionIDs := make(map[string]struct{})
	switch fieldType {
	case model.PropertyFieldTypeSelect:
		var optionID string
		if err := json.Unmarshal(value, &optionID); err != nil {
			return nil, err
		}
		if optionID != "" {
			optionIDs[optionID] = struct{}{}
		}
	case model.PropertyFieldTypeMultiselect:
		var ids []string
		if err := json.Unmarshal(value, &ids); err != nil {
			return nil, err
		}
		for _, id := range ids {
			if id != "" {
				optionIDs[id] = struct{}{}
			}
		}
	default:
		return nil, fmt.Errorf("extractOptionIDsFromValue only supports select and multiselect field types, got: %s", fieldType)
	}
	return optionIDs, nil
}
func (pas *PropertyAccessService) copyPropertyField(field *model.PropertyField) *model.PropertyField {
	copied := *field
	copied.Attrs = make(model.StringInterface)
	if field.Attrs != nil {
		maps.Copy(copied.Attrs, field.Attrs)
	}
	return &copied
}
func (pas *PropertyAccessService) getCallerOptionIDsForField(groupID, fieldID, callerID string, fieldType model.PropertyFieldType) (map[string]struct{}, error) {
	callerValues, err := pas.getCallerValuesForField(groupID, fieldID, callerID)
	if err != nil {
		return make(map[string]struct{}), err
	}
	if len(callerValues) == 0 {
		return make(map[string]struct{}), nil
	}
	callerOptionIDs := make(map[string]struct{})
	for _, val := range callerValues {
		optionIDs, err := pas.extractOptionIDsFromValue(fieldType, val.Value)
		if err == nil && optionIDs != nil {
			for optionID := range optionIDs {
				callerOptionIDs[optionID] = struct{}{}
			}
		}
	}
	return callerOptionIDs, nil
}
func (pas *PropertyAccessService) filterSharedOnlyFieldOptions(field *model.PropertyField, callerID string) *model.PropertyField {
	if field.Type != model.PropertyFieldTypeSelect && field.Type != model.PropertyFieldTypeMultiselect {
		return field
	}
	callerOptionIDs, err := pas.getCallerOptionIDsForField(field.GroupID, field.ID, callerID, field.Type)
	if err != nil || len(callerOptionIDs) == 0 {
		filteredField := pas.copyPropertyField(field)
		filteredField.Attrs[model.PropertyFieldAttributeOptions] = []any{}
		return filteredField
	}
	if field.Attrs == nil {
		return field
	}
	optionsArr, ok := field.Attrs[model.PropertyFieldAttributeOptions]
	if !ok {
		return field
	}
	optionsSlice, ok := optionsArr.([]any)
	if !ok {
		return field
	}
	filteredOptions := []any{}
	for _, opt := range optionsSlice {
		optMap, ok := opt.(map[string]any)
		if !ok {
			continue
		}
		optID, ok := optMap["id"].(string)
		if !ok {
			continue
		}
		if _, exists := callerOptionIDs[optID]; exists {
			filteredOptions = append(filteredOptions, opt)
		}
	}
	filteredField := pas.copyPropertyField(field)
	filteredField.Attrs[model.PropertyFieldAttributeOptions] = filteredOptions
	return filteredField
}
func (pas *PropertyAccessService) filterSharedOnlyValue(field *model.PropertyField, value *model.PropertyValue, callerID string) *model.PropertyValue {
	if field.Type != model.PropertyFieldTypeSelect && field.Type != model.PropertyFieldTypeMultiselect {
		return value
	}
	callerOptionIDs, err := pas.getCallerOptionIDsForField(field.GroupID, field.ID, callerID, field.Type)
	if err != nil || len(callerOptionIDs) == 0 {
		return nil
	}
	targetOptionIDs, err := pas.extractOptionIDsFromValue(field.Type, value.Value)
	if err != nil || targetOptionIDs == nil || len(targetOptionIDs) == 0 {
		return nil
	}
	intersection := []string{}
	for targetID := range targetOptionIDs {
		if _, exists := callerOptionIDs[targetID]; exists {
			intersection = append(intersection, targetID)
		}
	}
	if len(intersection) == 0 {
		return nil
	}
	filteredValue := *value
	switch field.Type {
	case model.PropertyFieldTypeSelect:
		jsonValue, err := json.Marshal(intersection[0])
		if err != nil {
			return nil
		}
		filteredValue.Value = jsonValue
		return &filteredValue
	case model.PropertyFieldTypeMultiselect:
		jsonValue, err := json.Marshal(intersection)
		if err != nil {
			return nil
		}
		filteredValue.Value = jsonValue
		return &filteredValue
	default:
		return nil
	}
}
func (pas *PropertyAccessService) applyFieldReadAccessControl(field *model.PropertyField, callerID string) *model.PropertyField {
	if pas.hasUnrestrictedFieldReadAccess(field, callerID) {
		return field
	}
	accessMode := pas.getAccessMode(field)
	if accessMode == model.PropertyAccessModeSharedOnly {
		return pas.filterSharedOnlyFieldOptions(field, callerID)
	}
	filteredField := pas.copyPropertyField(field)
	if field.Type == model.PropertyFieldTypeSelect || field.Type == model.PropertyFieldTypeMultiselect {
		filteredField.Attrs[model.PropertyFieldAttributeOptions] = []any{}
	}
	return filteredField
}
func (pas *PropertyAccessService) applyFieldReadAccessControlToList(fields []*model.PropertyField, callerID string) []*model.PropertyField {
	if len(fields) == 0 {
		return fields
	}
	filtered := make([]*model.PropertyField, 0, len(fields))
	for _, field := range fields {
		filtered = append(filtered, pas.applyFieldReadAccessControl(field, callerID))
	}
	return filtered
}
func (pas *PropertyAccessService) getFieldsForValues(values []*model.PropertyValue) (map[string]*model.PropertyField, error) {
	if len(values) == 0 {
		return make(map[string]*model.PropertyField), nil
	}
	groupAndFieldIDs := make(map[string]map[string]struct{})
	for _, value := range values {
		if groupAndFieldIDs[value.GroupID] == nil {
			groupAndFieldIDs[value.GroupID] = make(map[string]struct{})
		}
		groupAndFieldIDs[value.GroupID][value.FieldID] = struct{}{}
	}
	fieldMap := make(map[string]*model.PropertyField)
	for groupID, fieldIDs := range groupAndFieldIDs {
		fieldIDSlice := make([]string, 0, len(fieldIDs))
		for fieldID := range fieldIDs {
			fieldIDSlice = append(fieldIDSlice, fieldID)
		}
		fields, err := pas.propertyService.getPropertyFields(groupID, fieldIDSlice)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch fields for values: %w", err)
		}
		for _, field := range fields {
			fieldMap[field.ID] = field
		}
	}
	return fieldMap, nil
}
func (pas *PropertyAccessService) applyValueReadAccessControl(values []*model.PropertyValue, callerID string) ([]*model.PropertyValue, error) {
	if len(values) == 0 {
		return values, nil
	}
	fieldMap, err := pas.getFieldsForValues(values)
	if err != nil {
		return nil, fmt.Errorf("applyValueReadAccessControl: %w", err)
	}
	filtered := make([]*model.PropertyValue, 0, len(values))
	for _, value := range values {
		field, exists := fieldMap[value.FieldID]
		if !exists {
			return nil, fmt.Errorf("applyValueReadAccessControl: field not found for value %s", value.ID)
		}
		accessMode := pas.getAccessMode(field)
		if pas.hasUnrestrictedFieldReadAccess(field, callerID) {
			filtered = append(filtered, value)
		} else if accessMode == model.PropertyAccessModeSharedOnly {
			filteredValue := pas.filterSharedOnlyValue(field, value, callerID)
			if filteredValue != nil {
				filtered = append(filtered, filteredValue)
			}
		}
	}
	return filtered, nil
}