package model
import (
	"fmt"
)
const (
	PropertyAttrsProtected      = "protected"
	PropertyAttrsSourcePluginID = "source_plugin_id"
	PropertyAttrsAccessMode     = "access_mode"
	PropertyAccessModePublic     = ""
	PropertyAccessModeSourceOnly = "source_only"
	PropertyAccessModeSharedOnly = "shared_only"
)
func IsKnownPropertyAccessMode(accessMode string) bool {
	switch accessMode {
	case PropertyAccessModePublic,
		PropertyAccessModeSourceOnly,
		PropertyAccessModeSharedOnly:
		return true
	}
	return false
}
func IsPropertyFieldProtected(field *PropertyField) bool {
	if field.Attrs == nil {
		return false
	}
	protected, ok := field.Attrs[PropertyAttrsProtected].(bool)
	return ok && protected
}
func ValidatePropertyFieldAccessMode(field *PropertyField) error {
	if field.Attrs == nil {
		return nil
	}
	accessMode, ok := field.Attrs[PropertyAttrsAccessMode].(string)
	if !ok {
		return nil
	}
	if !IsKnownPropertyAccessMode(accessMode) {
		return fmt.Errorf("invalid access mode '%s'", accessMode)
	}
	if accessMode == PropertyAccessModeSharedOnly {
		if field.Type != PropertyFieldTypeSelect && field.Type != PropertyFieldTypeMultiselect {
			return fmt.Errorf("access mode 'shared_only' can only be used with select or multiselect field types, got '%s'", field.Type)
		}
	}
	if accessMode == PropertyAccessModeSourceOnly || accessMode == PropertyAccessModeSharedOnly {
		if !IsPropertyFieldProtected(field) {
			return fmt.Errorf("access mode '%s' requires the field to be protected", accessMode)
		}
	}
	return nil
}