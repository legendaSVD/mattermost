package app
import (
	"encoding/json"
	"fmt"
	"net/http"
	"testing"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/stretchr/testify/require"
)
func TestGetCPAField(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	cpaID, cErr := th.App.CpaGroupID()
	require.Nil(t, cErr)
	rctx := th.emptyContextWithCallerID(anonymousCallerId)
	t.Run("should fail when getting a non-existent field", func(t *testing.T) {
		field, appErr := th.App.GetCPAField(rctx, model.NewId())
		require.NotNil(t, appErr)
		require.Equal(t, "app.custom_profile_attributes.property_field_not_found.app_error", appErr.Id)
		require.Empty(t, field)
	})
	t.Run("should fail when getting a field from a different group", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID: model.NewId(),
			Name:    model.NewId(),
			Type:    model.PropertyFieldTypeText,
		}
		createdField, err := th.App.CreatePropertyField(rctx, field)
		require.Nil(t, err)
		fetchedField, appErr := th.App.GetCPAField(rctx, createdField.ID)
		require.NotNil(t, appErr)
		require.Equal(t, "app.custom_profile_attributes.property_field_not_found.app_error", appErr.Id)
		require.Empty(t, fetchedField)
	})
	t.Run("should get an existing CPA field", func(t *testing.T) {
		field, err := model.NewCPAFieldFromPropertyField(&model.PropertyField{
			GroupID: cpaID,
			Name:    "Test Field",
			Type:    model.PropertyFieldTypeText,
			Attrs:   model.StringInterface{model.CustomProfileAttributesPropertyAttrsVisibility: model.CustomProfileAttributesVisibilityHidden},
		})
		require.NoError(t, err)
		createdField, appErr := th.App.CreateCPAField(rctx, field)
		require.Nil(t, appErr)
		require.NotEmpty(t, createdField.ID)
		fetchedField, appErr := th.App.GetCPAField(rctx, createdField.ID)
		require.Nil(t, appErr)
		require.Equal(t, createdField.ID, fetchedField.ID)
		require.Equal(t, "Test Field", fetchedField.Name)
		require.Equal(t, model.CustomProfileAttributesVisibilityHidden, fetchedField.Attrs.Visibility)
	})
	t.Run("should initialize default attrs when field has nil Attrs", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID: cpaID,
			Name:    "Field with nil attrs",
			Type:    model.PropertyFieldTypeText,
			Attrs:   nil,
		}
		createdField, err := th.App.CreatePropertyField(rctx, field)
		require.Nil(t, err)
		fetchedField, appErr := th.App.GetCPAField(rctx, createdField.ID)
		require.Nil(t, appErr)
		require.Equal(t, model.CustomProfileAttributesVisibilityDefault, fetchedField.Attrs.Visibility)
		require.Equal(t, float64(0), fetchedField.Attrs.SortOrder)
	})
	t.Run("should initialize default attrs when field has empty Attrs", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID: cpaID,
			Name:    "Field with empty attrs",
			Type:    model.PropertyFieldTypeText,
			Attrs:   model.StringInterface{},
		}
		createdField, err := th.App.CreatePropertyField(rctx, field)
		require.Nil(t, err)
		fetchedField, appErr := th.App.GetCPAField(rctx, createdField.ID)
		require.Nil(t, appErr)
		require.Equal(t, model.CustomProfileAttributesVisibilityDefault, fetchedField.Attrs.Visibility)
		require.Equal(t, float64(0), fetchedField.Attrs.SortOrder)
	})
	t.Run("should validate LDAP/SAML synced fields", func(t *testing.T) {
		ldapField, err := model.NewCPAFieldFromPropertyField(&model.PropertyField{
			GroupID: cpaID,
			Name:    "LDAP Field",
			Type:    model.PropertyFieldTypeText,
			Attrs: model.StringInterface{
				model.CustomProfileAttributesPropertyAttrsLDAP: "ldap_attribute",
			},
		})
		require.NoError(t, err)
		createdLDAPField, appErr := th.App.CreateCPAField(rctx, ldapField)
		require.Nil(t, appErr)
		samlField, err := model.NewCPAFieldFromPropertyField(&model.PropertyField{
			GroupID: cpaID,
			Name:    "SAML Field",
			Type:    model.PropertyFieldTypeText,
			Attrs: model.StringInterface{
				model.CustomProfileAttributesPropertyAttrsSAML: "saml_attribute",
			},
		})
		require.NoError(t, err)
		createdSAMLField, appErr := th.App.CreateCPAField(rctx, samlField)
		require.Nil(t, appErr)
		userID := model.NewId()
		_, appErr = th.App.PatchCPAValue(rctx, userID, createdLDAPField.ID, json.RawMessage(`"test value"`), false)
		require.NotNil(t, appErr)
		require.Equal(t, "app.custom_profile_attributes.property_field_is_synced.app_error", appErr.Id)
		_, appErr = th.App.PatchCPAValue(rctx, userID, createdSAMLField.ID, json.RawMessage(`"test value"`), false)
		require.NotNil(t, appErr)
		require.Equal(t, "app.custom_profile_attributes.property_field_is_synced.app_error", appErr.Id)
		patchedValue, appErr := th.App.PatchCPAValue(rctx, userID, createdLDAPField.ID, json.RawMessage(`"test value"`), true)
		require.Nil(t, appErr)
		require.NotNil(t, patchedValue)
		require.Equal(t, json.RawMessage(`"test value"`), patchedValue.Value)
		patchedValue, appErr = th.App.PatchCPAValue(rctx, userID, createdSAMLField.ID, json.RawMessage(`"test value"`), true)
		require.Nil(t, appErr)
		require.NotNil(t, patchedValue)
		require.Equal(t, json.RawMessage(`"test value"`), patchedValue.Value)
	})
}
func TestListCPAFields(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	cpaID, cErr := th.App.CpaGroupID()
	require.Nil(t, cErr)
	rctx := th.emptyContextWithCallerID(anonymousCallerId)
	t.Run("should list the CPA property fields", func(t *testing.T) {
		field1 := model.PropertyField{
			GroupID: cpaID,
			Name:    "Field 1",
			Type:    model.PropertyFieldTypeText,
			Attrs:   model.StringInterface{model.CustomProfileAttributesPropertyAttrsSortOrder: 1},
		}
		_, err := th.App.CreatePropertyField(rctx, &field1)
		require.Nil(t, err)
		field2 := &model.PropertyField{
			GroupID: model.NewId(),
			Name:    "Field 2",
			Type:    model.PropertyFieldTypeText,
		}
		_, err = th.App.CreatePropertyField(rctx, field2)
		require.Nil(t, err)
		field3 := model.PropertyField{
			GroupID: cpaID,
			Name:    "Field 3",
			Type:    model.PropertyFieldTypeText,
			Attrs:   model.StringInterface{model.CustomProfileAttributesPropertyAttrsSortOrder: 0},
		}
		_, err = th.App.CreatePropertyField(rctx, &field3)
		require.Nil(t, err)
		fields, appErr := th.App.ListCPAFields(rctx)
		require.Nil(t, appErr)
		require.Len(t, fields, 2)
		require.Equal(t, "Field 3", fields[0].Name)
		require.Equal(t, "Field 1", fields[1].Name)
	})
	t.Run("should initialize default attrs for fields with nil or empty Attrs", func(t *testing.T) {
		fieldWithNilAttrs := &model.PropertyField{
			GroupID: cpaID,
			Name:    "Field with nil attrs",
			Type:    model.PropertyFieldTypeText,
			Attrs:   nil,
		}
		_, err := th.App.CreatePropertyField(rctx, fieldWithNilAttrs)
		require.Nil(t, err)
		fieldWithEmptyAttrs := &model.PropertyField{
			GroupID: cpaID,
			Name:    "Field with empty attrs",
			Type:    model.PropertyFieldTypeText,
			Attrs:   model.StringInterface{},
		}
		_, err = th.App.CreatePropertyField(rctx, fieldWithEmptyAttrs)
		require.Nil(t, err)
		fields, appErr := th.App.ListCPAFields(rctx)
		require.Nil(t, appErr)
		require.NotEmpty(t, fields)
		for _, field := range fields {
			if field.Name == "Field with nil attrs" || field.Name == "Field with empty attrs" {
				require.Equal(t, model.CustomProfileAttributesVisibilityDefault, field.Attrs.Visibility)
				require.Equal(t, float64(0), field.Attrs.SortOrder)
			}
		}
	})
	t.Run("list fields should return defaults for fields created without visibility and sort_order", func(t *testing.T) {
		fieldMinimal, err := model.NewCPAFieldFromPropertyField(&model.PropertyField{
			Name:  "Field Without Defaults",
			Type:  model.PropertyFieldTypeText,
			Attrs: model.StringInterface{},
		})
		require.NoError(t, err)
		createdFieldMinimal, appErr := th.App.CreateCPAField(rctx, fieldMinimal)
		require.Nil(t, appErr)
		require.NotNil(t, createdFieldMinimal)
		fieldNormal, err := model.NewCPAFieldFromPropertyField(&model.PropertyField{
			Name: "Normal Field",
			Type: model.PropertyFieldTypeText,
			Attrs: model.StringInterface{
				model.CustomProfileAttributesPropertyAttrsVisibility: model.CustomProfileAttributesVisibilityAlways,
				model.CustomProfileAttributesPropertyAttrsSortOrder:  5.0,
			},
		})
		require.NoError(t, err)
		createdFieldNormal, appErr := th.App.CreateCPAField(rctx, fieldNormal)
		require.Nil(t, appErr)
		require.NotNil(t, createdFieldNormal)
		fields, appErr := th.App.ListCPAFields(rctx)
		require.Nil(t, appErr)
		require.NotEmpty(t, fields)
		foundMinimal := false
		foundNormal := false
		for _, f := range fields {
			if f.ID == createdFieldMinimal.ID {
				foundMinimal = true
				require.Equal(t, model.CustomProfileAttributesVisibilityDefault, f.Attrs.Visibility, "visibility should have default value")
				require.Equal(t, float64(0), f.Attrs.SortOrder, "sort_order should default to 0")
			}
			if f.ID == createdFieldNormal.ID {
				foundNormal = true
				require.Equal(t, model.CustomProfileAttributesVisibilityAlways, f.Attrs.Visibility)
				require.Equal(t, float64(5), f.Attrs.SortOrder)
			}
		}
		require.True(t, foundMinimal, "should have found createdFieldMinimal in list")
		require.True(t, foundNormal, "should have found createdFieldNormal in list")
	})
}
func TestCreateCPAField(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	cpaID, cErr := th.App.CpaGroupID()
	require.Nil(t, cErr)
	rctx := th.emptyContextWithCallerID(anonymousCallerId)
	t.Run("should fail if the field is not valid", func(t *testing.T) {
		field, err := model.NewCPAFieldFromPropertyField(&model.PropertyField{Name: model.NewId()})
		require.NoError(t, err)
		createdField, err := th.App.CreateCPAField(rctx, field)
		require.Error(t, err)
		require.Empty(t, createdField)
	})
	t.Run("should not be able to create a property field for a different feature", func(t *testing.T) {
		field, err := model.NewCPAFieldFromPropertyField(&model.PropertyField{
			GroupID: model.NewId(),
			Name:    model.NewId(),
			Type:    model.PropertyFieldTypeText,
		})
		require.NoError(t, err)
		createdField, appErr := th.App.CreateCPAField(rctx, field)
		require.Nil(t, appErr)
		require.Equal(t, cpaID, createdField.GroupID)
	})
	t.Run("should correctly create a CPA field", func(t *testing.T) {
		field, err := model.NewCPAFieldFromPropertyField(&model.PropertyField{
			GroupID: cpaID,
			Name:    model.NewId(),
			Type:    model.PropertyFieldTypeText,
			Attrs:   model.StringInterface{model.CustomProfileAttributesPropertyAttrsVisibility: model.CustomProfileAttributesVisibilityHidden},
		})
		require.NoError(t, err)
		createdField, appErr := th.App.CreateCPAField(rctx, field)
		require.Nil(t, appErr)
		require.NotZero(t, createdField.ID)
		require.Equal(t, cpaID, createdField.GroupID)
		require.Equal(t, model.CustomProfileAttributesVisibilityHidden, createdField.Attrs.Visibility)
		fetchedField, gErr := th.App.GetPropertyField(rctx, "", createdField.ID)
		require.Nil(t, gErr)
		require.Equal(t, field.Name, fetchedField.Name)
		require.NotZero(t, fetchedField.CreateAt)
		require.Equal(t, fetchedField.CreateAt, fetchedField.UpdateAt)
	})
	t.Run("should create CPA field with DeleteAt set to 0 even if input has non-zero DeleteAt", func(t *testing.T) {
		field, err := model.NewCPAFieldFromPropertyField(&model.PropertyField{
			GroupID: cpaID,
			Name:    model.NewId(),
			Type:    model.PropertyFieldTypeText,
			Attrs:   model.StringInterface{model.CustomProfileAttributesPropertyAttrsVisibility: model.CustomProfileAttributesVisibilityHidden},
		})
		require.NoError(t, err)
		field.DeleteAt = time.Now().UnixMilli()
		require.NotZero(t, field.DeleteAt, "Pre-condition: field should have non-zero DeleteAt")
		createdField, appErr := th.App.CreateCPAField(rctx, field)
		require.Nil(t, appErr)
		require.NotZero(t, createdField.ID)
		require.Equal(t, cpaID, createdField.GroupID)
		require.Zero(t, createdField.DeleteAt, "DeleteAt should be 0 after creation")
		fetchedField, gErr := th.App.GetPropertyField(rctx, "", createdField.ID)
		require.Nil(t, gErr)
		require.Zero(t, fetchedField.DeleteAt, "DeleteAt should be 0 in database")
	})
	t.Run("CPA should honor the field limit", func(t *testing.T) {
		th := Setup(t).InitBasic(t)
		t.Run("should not be able to create CPA fields above the limit", func(t *testing.T) {
			for i := 1; i <= CustomProfileAttributesFieldLimit; i++ {
				field, err := model.NewCPAFieldFromPropertyField(&model.PropertyField{
					Name: model.NewId(),
					Type: model.PropertyFieldTypeText,
				})
				require.NoError(t, err)
				createdField, appErr := th.App.CreateCPAField(rctx, field)
				require.Nil(t, appErr)
				require.NotZero(t, createdField.ID)
			}
			field := &model.CPAField{
				PropertyField: model.PropertyField{
					Name: model.NewId(),
					Type: model.PropertyFieldTypeText,
				},
			}
			createdField, appErr := th.App.CreateCPAField(rctx, field)
			require.NotNil(t, appErr)
			require.Equal(t, http.StatusUnprocessableEntity, appErr.StatusCode)
			require.Zero(t, createdField)
		})
		t.Run("deleted fields should not count for the limit", func(t *testing.T) {
			fields, appErr := th.App.ListCPAFields(rctx)
			require.Nil(t, appErr)
			require.Len(t, fields, CustomProfileAttributesFieldLimit)
			require.Nil(t, th.App.DeleteCPAField(rctx, fields[0].ID))
			field := &model.CPAField{
				PropertyField: model.PropertyField{
					Name: model.NewId(),
					Type: model.PropertyFieldTypeText,
				},
			}
			createdField, appErr := th.App.CreateCPAField(rctx, field)
			require.Nil(t, appErr)
			require.NotZero(t, createdField.ID)
		})
	})
}
func TestPatchCPAField(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	cpaID, cErr := th.App.CpaGroupID()
	require.Nil(t, cErr)
	rctx := th.emptyContextWithCallerID(anonymousCallerId)
	newField, err := model.NewCPAFieldFromPropertyField(&model.PropertyField{
		GroupID: cpaID,
		Name:    model.NewId(),
		Type:    model.PropertyFieldTypeText,
		Attrs:   model.StringInterface{model.CustomProfileAttributesPropertyAttrsVisibility: model.CustomProfileAttributesVisibilityHidden},
	})
	require.NoError(t, err)
	createdField, appErr := th.App.CreateCPAField(rctx, newField)
	require.Nil(t, appErr)
	patch := &model.PropertyFieldPatch{
		Name:       model.NewPointer("Patched name"),
		Attrs:      model.NewPointer(model.StringInterface{model.CustomProfileAttributesPropertyAttrsVisibility: model.CustomProfileAttributesVisibilityWhenSet}),
		TargetID:   model.NewPointer(model.NewId()),
		TargetType: model.NewPointer(model.NewId()),
	}
	t.Run("should fail if the field doesn't exist", func(t *testing.T) {
		updatedField, appErr := th.App.PatchCPAField(rctx, model.NewId(), patch)
		require.NotNil(t, appErr)
		require.Empty(t, updatedField)
	})
	t.Run("should not allow to patch a field outside of CPA", func(t *testing.T) {
		newField := &model.PropertyField{
			GroupID: model.NewId(),
			Name:    model.NewId(),
			Type:    model.PropertyFieldTypeText,
		}
		field, err := th.App.CreatePropertyField(rctx, newField)
		require.Nil(t, err)
		updatedField, uErr := th.App.PatchCPAField(rctx, field.ID, patch)
		require.NotNil(t, uErr)
		require.Equal(t, "app.custom_profile_attributes.property_field_not_found.app_error", uErr.Id)
		require.Empty(t, updatedField)
	})
	t.Run("should correctly patch the CPA property field", func(t *testing.T) {
		time.Sleep(10 * time.Millisecond)
		updatedField, appErr := th.App.PatchCPAField(rctx, createdField.ID, patch)
		require.Nil(t, appErr)
		require.Equal(t, createdField.ID, updatedField.ID)
		require.Equal(t, "Patched name", updatedField.Name)
		require.Equal(t, model.CustomProfileAttributesVisibilityWhenSet, updatedField.Attrs.Visibility)
		require.Empty(t, updatedField.TargetID, "CPA should not allow to patch the field's target ID")
		require.Empty(t, updatedField.TargetType, "CPA should not allow to patch the field's target type")
		require.Greater(t, updatedField.UpdateAt, createdField.UpdateAt)
	})
	t.Run("should preserve option IDs when patching select field options", func(t *testing.T) {
		selectField, err := model.NewCPAFieldFromPropertyField(&model.PropertyField{
			GroupID: cpaID,
			Name:    "Select Field",
			Type:    model.PropertyFieldTypeSelect,
			Attrs: map[string]any{
				model.PropertyFieldAttributeOptions: []any{
					map[string]any{
						"name":  "Option 1",
						"color": "#111111",
					},
					map[string]any{
						"name":  "Option 2",
						"color": "#222222",
					},
				},
			},
		})
		require.NoError(t, err)
		createdSelectField, appErr := th.App.CreateCPAField(rctx, selectField)
		require.Nil(t, appErr)
		options := createdSelectField.Attrs.Options
		require.Len(t, options, 2)
		originalID1 := options[0].ID
		originalID2 := options[1].ID
		require.NotEmpty(t, originalID1)
		require.NotEmpty(t, originalID2)
		selectPatch := &model.PropertyFieldPatch{
			Attrs: model.NewPointer(model.StringInterface{
				model.PropertyFieldAttributeOptions: []any{
					map[string]any{
						"id":    originalID1,
						"name":  "Updated Option 1",
						"color": "#333333",
					},
					map[string]any{
						"name":  "New Option 1.5",
						"color": "#353535",
					},
					map[string]any{
						"id":    originalID2,
						"name":  "Updated Option 2",
						"color": "#444444",
					},
				},
			}),
		}
		updatedSelectField, appErr := th.App.PatchCPAField(rctx, createdSelectField.ID, selectPatch)
		require.Nil(t, appErr)
		updatedOptions := updatedSelectField.Attrs.Options
		require.Len(t, updatedOptions, 3)
		require.Equal(t, originalID1, updatedOptions[0].ID)
		require.Equal(t, "Updated Option 1", updatedOptions[0].Name)
		require.Equal(t, "#333333", updatedOptions[0].Color)
		require.Equal(t, originalID2, updatedOptions[2].ID)
		require.Equal(t, "Updated Option 2", updatedOptions[2].Name)
		require.Equal(t, "#444444", updatedOptions[2].Color)
		require.Equal(t, "New Option 1.5", updatedOptions[1].Name)
		require.Equal(t, "#353535", updatedOptions[1].Color)
	})
	t.Run("Should not delete the values of a field after patching it if the type has not changed", func(t *testing.T) {
		field, err := model.NewCPAFieldFromPropertyField(&model.PropertyField{
			GroupID: cpaID,
			Name:    "Select Field with values",
			Type:    model.PropertyFieldTypeSelect,
			Attrs: model.StringInterface{
				model.PropertyFieldAttributeOptions: []any{
					map[string]any{
						"name":  "Option 1",
						"color": "#FF5733",
					},
					map[string]any{
						"name":  "Option 2",
						"color": "#33FF57",
					},
				},
			},
		})
		require.NoError(t, err)
		createdField, appErr := th.App.CreateCPAField(rctx, field)
		require.Nil(t, appErr)
		options := createdField.Attrs.Options
		require.Len(t, options, 2)
		optionID := options[0].ID
		require.NotEmpty(t, optionID)
		userID := model.NewId()
		value, appErr := th.App.PatchCPAValue(rctx, userID, createdField.ID, json.RawMessage(fmt.Sprintf(`"%s"`, optionID)), false)
		require.Nil(t, appErr)
		require.NotNil(t, value)
		patch := &model.PropertyFieldPatch{
			Name: model.NewPointer("Updated select field name"),
			Attrs: model.NewPointer(model.StringInterface{
				model.PropertyFieldAttributeOptions: []any{
					map[string]any{
						"id":    optionID,
						"name":  "Updated Option 1",
						"color": "#FF5733",
					},
					map[string]any{
						"name":  "Option 2",
						"color": "#33FF57",
					},
					map[string]any{
						"name":  "Option 3",
						"color": "#5733FF",
					},
				},
			}),
		}
		updatedField, appErr := th.App.PatchCPAField(rctx, createdField.ID, patch)
		require.Nil(t, appErr)
		require.Equal(t, "Updated select field name", updatedField.Name)
		require.Equal(t, model.PropertyFieldTypeSelect, updatedField.Type)
		values, appErr := th.App.ListCPAValues(rctx, userID)
		require.Nil(t, appErr)
		require.Len(t, values, 1)
		require.Equal(t, json.RawMessage(fmt.Sprintf(`"%s"`, optionID)), values[0].Value)
	})
	t.Run("Should delete the values of a field after patching it if the type has changed", func(t *testing.T) {
		field, err := model.NewCPAFieldFromPropertyField(&model.PropertyField{
			GroupID: cpaID,
			Name:    "Select Field with type change",
			Type:    model.PropertyFieldTypeSelect,
			Attrs: model.StringInterface{
				model.PropertyFieldAttributeOptions: []any{
					map[string]any{
						"name":  "Option A",
						"color": "#FF5733",
					},
					map[string]any{
						"name":  "Option B",
						"color": "#33FF57",
					},
				},
			},
		})
		require.NoError(t, err)
		createdField, appErr := th.App.CreateCPAField(rctx, field)
		require.Nil(t, appErr)
		options := createdField.Attrs.Options
		require.Len(t, options, 2)
		optionID := options[0].ID
		require.NotEmpty(t, optionID)
		userID := model.NewId()
		value, appErr := th.App.PatchCPAValue(rctx, userID, createdField.ID, json.RawMessage(fmt.Sprintf(`"%s"`, optionID)), false)
		require.Nil(t, appErr)
		require.NotNil(t, value)
		values, appErr := th.App.ListCPAValues(rctx, userID)
		require.Nil(t, appErr)
		require.Len(t, values, 1)
		patch := &model.PropertyFieldPatch{
			Type: model.NewPointer(model.PropertyFieldTypeText),
		}
		updatedField, appErr := th.App.PatchCPAField(rctx, createdField.ID, patch)
		require.Nil(t, appErr)
		require.Equal(t, model.PropertyFieldTypeText, updatedField.Type)
		values, appErr = th.App.ListCPAValues(rctx, userID)
		require.Nil(t, appErr)
		require.Empty(t, values)
	})
}
func TestDeleteCPAField(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	cpaID, cErr := th.App.CpaGroupID()
	require.Nil(t, cErr)
	rctx := th.emptyContextWithCallerID(anonymousCallerId)
	newField, err := model.NewCPAFieldFromPropertyField(&model.PropertyField{
		GroupID: cpaID,
		Name:    model.NewId(),
		Type:    model.PropertyFieldTypeText,
	})
	require.NoError(t, err)
	createdField, appErr := th.App.CreateCPAField(rctx, newField)
	require.Nil(t, appErr)
	for i := range 3 {
		newValue := &model.PropertyValue{
			TargetID:   model.NewId(),
			TargetType: model.PropertyValueTargetTypeUser,
			GroupID:    cpaID,
			FieldID:    createdField.ID,
			Value:      json.RawMessage(fmt.Sprintf(`"Value %d"`, i)),
		}
		value, err := th.App.CreatePropertyValue(rctx, newValue)
		require.Nil(t, err)
		require.NotZero(t, value.ID)
	}
	t.Run("should fail if the field doesn't exist", func(t *testing.T) {
		err := th.App.DeleteCPAField(rctx, model.NewId())
		require.NotNil(t, err)
		require.Equal(t, "app.custom_profile_attributes.property_field_not_found.app_error", err.Id)
	})
	t.Run("should not allow to delete a field outside of CPA", func(t *testing.T) {
		newField := &model.PropertyField{
			GroupID: model.NewId(),
			Name:    model.NewId(),
			Type:    model.PropertyFieldTypeText,
		}
		field, err := th.App.CreatePropertyField(rctx, newField)
		require.Nil(t, err)
		dErr := th.App.DeleteCPAField(rctx, field.ID)
		require.NotNil(t, dErr)
		require.Equal(t, "app.custom_profile_attributes.property_field_not_found.app_error", dErr.Id)
	})
	t.Run("should correctly delete the field", func(t *testing.T) {
		opts := model.PropertyValueSearchOpts{PerPage: 10, FieldID: createdField.ID}
		values, err := th.App.SearchPropertyValues(rctx, cpaID, opts)
		require.Nil(t, err)
		require.Len(t, values, 3)
		require.Nil(t, th.App.DeleteCPAField(rctx, createdField.ID))
		fetchedField, err := th.App.GetPropertyField(rctx, "", createdField.ID)
		require.Nil(t, err)
		require.NotZero(t, fetchedField.DeleteAt)
		values, err = th.App.SearchPropertyValues(rctx, cpaID, opts)
		require.Nil(t, err)
		require.Len(t, values, 0)
		opts.IncludeDeleted = true
		values, err = th.App.SearchPropertyValues(rctx, cpaID, opts)
		require.Nil(t, err)
		require.Len(t, values, 3)
		for _, value := range values {
			require.NotZero(t, value.DeleteAt)
		}
	})
}
func TestGetCPAValue(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	cpaID, cErr := th.App.CpaGroupID()
	require.Nil(t, cErr)
	rctx := th.emptyContextWithCallerID(anonymousCallerId)
	field := &model.PropertyField{
		GroupID: cpaID,
		Name:    model.NewId(),
		Type:    model.PropertyFieldTypeText,
	}
	createdField, err := th.App.CreatePropertyField(rctx, field)
	require.Nil(t, err)
	fieldID := createdField.ID
	t.Run("should fail if the value doesn't exist", func(t *testing.T) {
		pv, appErr := th.App.GetCPAValue(rctx, model.NewId())
		require.NotNil(t, appErr)
		require.Nil(t, pv)
	})
	t.Run("should fail if the group id is invalid", func(t *testing.T) {
		propertyValue := &model.PropertyValue{
			TargetID:   model.NewId(),
			TargetType: model.PropertyValueTargetTypeUser,
			GroupID:    model.NewId(),
			FieldID:    fieldID,
			Value:      json.RawMessage(`"Value"`),
		}
		created, err := th.App.CreatePropertyValue(rctx, propertyValue)
		require.Nil(t, err)
		require.NotNil(t, created)
		pv, appErr := th.App.GetCPAValue(rctx, created.ID)
		require.NotNil(t, appErr)
		require.Nil(t, pv)
	})
	t.Run("should succeed if id exists", func(t *testing.T) {
		propertyValue := &model.PropertyValue{
			TargetID:   model.NewId(),
			TargetType: model.PropertyValueTargetTypeUser,
			GroupID:    cpaID,
			FieldID:    fieldID,
			Value:      json.RawMessage(`"Value"`),
		}
		propertyValue, err := th.App.CreatePropertyValue(rctx, propertyValue)
		require.Nil(t, err)
		pv, appErr := th.App.GetCPAValue(rctx, propertyValue.ID)
		require.Nil(t, appErr)
		require.NotNil(t, pv)
	})
	t.Run("should handle array values correctly", func(t *testing.T) {
		arrayField := &model.PropertyField{
			GroupID: cpaID,
			Name:    model.NewId(),
			Type:    model.PropertyFieldTypeMultiselect,
		}
		createdField, err := th.App.CreatePropertyField(rctx, arrayField)
		require.Nil(t, err)
		propertyValue := &model.PropertyValue{
			TargetID:   model.NewId(),
			TargetType: model.PropertyValueTargetTypeUser,
			GroupID:    cpaID,
			FieldID:    createdField.ID,
			Value:      json.RawMessage(`["option1", "option2", "option3"]`),
		}
		propertyValue, err = th.App.CreatePropertyValue(rctx, propertyValue)
		require.Nil(t, err)
		pv, appErr := th.App.GetCPAValue(rctx, propertyValue.ID)
		require.Nil(t, appErr)
		require.NotNil(t, pv)
		var arrayValues []string
		require.NoError(t, json.Unmarshal(pv.Value, &arrayValues))
		require.Equal(t, []string{"option1", "option2", "option3"}, arrayValues)
	})
}
func TestListCPAValues(t *testing.T) {
	mainHelper.Parallel(t)
	th := SetupConfig(t, func(cfg *model.Config) {
		cfg.FeatureFlags.CustomProfileAttributes = true
	}).InitBasic(t)
	cpaID, cErr := th.App.CpaGroupID()
	require.Nil(t, cErr)
	rctx := th.emptyContextWithCallerID(anonymousCallerId)
	userID := model.NewId()
	t.Run("should return empty list when user has no values", func(t *testing.T) {
		values, appErr := th.App.ListCPAValues(rctx, userID)
		require.Nil(t, appErr)
		require.Empty(t, values)
	})
	t.Run("should list all values for a user", func(t *testing.T) {
		var expectedValues []json.RawMessage
		for i := 1; i <= CustomProfileAttributesFieldLimit; i++ {
			field := &model.PropertyField{
				GroupID: cpaID,
				Name:    fmt.Sprintf("Field %d", i),
				Type:    model.PropertyFieldTypeText,
			}
			_, err := th.App.CreatePropertyField(rctx, field)
			require.Nil(t, err)
			value := &model.PropertyValue{
				TargetID:   userID,
				TargetType: model.PropertyValueTargetTypeUser,
				GroupID:    cpaID,
				FieldID:    field.ID,
				Value:      json.RawMessage(fmt.Sprintf(`"Value %d"`, i)),
			}
			_, err = th.App.CreatePropertyValue(rctx, value)
			require.Nil(t, err)
			expectedValues = append(expectedValues, value.Value)
		}
		values, appErr := th.App.ListCPAValues(rctx, userID)
		require.Nil(t, appErr)
		require.Len(t, values, CustomProfileAttributesFieldLimit)
		actualValues := make([]json.RawMessage, len(values))
		for i, value := range values {
			require.Equal(t, userID, value.TargetID)
			require.Equal(t, "user", value.TargetType)
			require.Equal(t, cpaID, value.GroupID)
			actualValues[i] = value.Value
		}
		require.ElementsMatch(t, expectedValues, actualValues)
	})
}
func TestPatchCPAValue(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	cpaID, cErr := th.App.CpaGroupID()
	require.Nil(t, cErr)
	rctx := th.emptyContextWithCallerID(anonymousCallerId)
	t.Run("should fail if the field doesn't exist", func(t *testing.T) {
		invalidFieldID := model.NewId()
		_, appErr := th.App.PatchCPAValue(rctx, model.NewId(), invalidFieldID, json.RawMessage(`"fieldValue"`), true)
		require.NotNil(t, appErr)
	})
	t.Run("should create value if new field value", func(t *testing.T) {
		newField := &model.PropertyField{
			GroupID: cpaID,
			Name:    model.NewId(),
			Type:    model.PropertyFieldTypeText,
		}
		createdField, err := th.App.CreatePropertyField(rctx, newField)
		require.Nil(t, err)
		userID := model.NewId()
		patchedValue, appErr := th.App.PatchCPAValue(rctx, userID, createdField.ID, json.RawMessage(`"test value"`), true)
		require.Nil(t, appErr)
		require.NotNil(t, patchedValue)
		require.Equal(t, json.RawMessage(`"test value"`), patchedValue.Value)
		require.Equal(t, userID, patchedValue.TargetID)
		t.Run("should correctly patch the CPA property value", func(t *testing.T) {
			patch2, appErr := th.App.PatchCPAValue(rctx, userID, createdField.ID, json.RawMessage(`"new patched value"`), true)
			require.Nil(t, appErr)
			require.NotNil(t, patch2)
			require.Equal(t, patchedValue.ID, patch2.ID)
			require.Equal(t, json.RawMessage(`"new patched value"`), patch2.Value)
			require.Equal(t, userID, patch2.TargetID)
		})
	})
	t.Run("should fail if field is deleted", func(t *testing.T) {
		newField := &model.PropertyField{
			GroupID: cpaID,
			Name:    model.NewId(),
			Type:    model.PropertyFieldTypeText,
		}
		createdField, err := th.App.CreatePropertyField(rctx, newField)
		require.Nil(t, err)
		err = th.App.DeletePropertyField(rctx, cpaID, createdField.ID)
		require.Nil(t, err)
		userID := model.NewId()
		patchedValue, appErr := th.App.PatchCPAValue(rctx, userID, createdField.ID, json.RawMessage(`"test value"`), true)
		require.NotNil(t, appErr)
		require.Nil(t, patchedValue)
	})
	t.Run("should handle array values correctly", func(t *testing.T) {
		optionsID := []string{model.NewId(), model.NewId(), model.NewId(), model.NewId()}
		arrayField := &model.PropertyField{
			GroupID: cpaID,
			Name:    model.NewId(),
			Type:    model.PropertyFieldTypeMultiselect,
			Attrs: model.StringInterface{
				"options": []map[string]any{
					{"id": optionsID[0], "name": "option1"},
					{"id": optionsID[1], "name": "option2"},
					{"id": optionsID[2], "name": "option3"},
					{"id": optionsID[3], "name": "option4"},
				},
			},
		}
		createdField, err := th.App.CreatePropertyField(rctx, arrayField)
		require.Nil(t, err)
		optionJSON := fmt.Sprintf(`["%s", "%s", "%s"]`, optionsID[0], optionsID[1], optionsID[2])
		userID := model.NewId()
		patchedValue, appErr := th.App.PatchCPAValue(rctx, userID, createdField.ID, json.RawMessage(optionJSON), true)
		require.Nil(t, appErr)
		require.NotNil(t, patchedValue)
		var arrayValues []string
		require.NoError(t, json.Unmarshal(patchedValue.Value, &arrayValues))
		require.Equal(t, []string{optionsID[0], optionsID[1], optionsID[2]}, arrayValues)
		require.Equal(t, userID, patchedValue.TargetID)
		updatedOptionJSON := fmt.Sprintf(`["%s", "%s"]`, optionsID[1], optionsID[3])
		updatedValue, appErr := th.App.PatchCPAValue(rctx, userID, createdField.ID, json.RawMessage(updatedOptionJSON), true)
		require.Nil(t, appErr)
		require.NotNil(t, updatedValue)
		require.Equal(t, patchedValue.ID, updatedValue.ID)
		arrayValues = nil
		require.NoError(t, json.Unmarshal(updatedValue.Value, &arrayValues))
		require.Equal(t, []string{optionsID[1], optionsID[3]}, arrayValues)
		require.Equal(t, userID, updatedValue.TargetID)
		t.Run("should fail if it tries to set a value that not valid for a field", func(t *testing.T) {
			invalidID := model.NewId()
			invalidOptionJSON := fmt.Sprintf(`["%s", "%s"]`, optionsID[0], invalidID)
			invalidValue, appErr := th.App.PatchCPAValue(rctx, userID, createdField.ID, json.RawMessage(invalidOptionJSON), true)
			require.NotNil(t, appErr)
			require.Nil(t, invalidValue)
			require.Equal(t, "app.custom_profile_attributes.validate_value.app_error", appErr.Id)
			invalidJSON := `[not valid json]`
			invalidValue, appErr = th.App.PatchCPAValue(rctx, userID, createdField.ID, json.RawMessage(invalidJSON), true)
			require.NotNil(t, appErr)
			require.Nil(t, invalidValue)
			require.Equal(t, "app.custom_profile_attributes.validate_value.app_error", appErr.Id)
			wrongTypeJSON := `"not an array"`
			invalidValue, appErr = th.App.PatchCPAValue(rctx, userID, createdField.ID, json.RawMessage(wrongTypeJSON), true)
			require.NotNil(t, appErr)
			require.Nil(t, invalidValue)
			require.Equal(t, "app.custom_profile_attributes.validate_value.app_error", appErr.Id)
		})
	})
}
func TestDeleteCPAValues(t *testing.T) {
	mainHelper.Parallel(t)
	th := SetupConfig(t, func(cfg *model.Config) {
		cfg.FeatureFlags.CustomProfileAttributes = true
	}).InitBasic(t)
	cpaID, cErr := th.App.CpaGroupID()
	require.Nil(t, cErr)
	rctx := th.emptyContextWithCallerID(anonymousCallerId)
	userID := model.NewId()
	otherUserID := model.NewId()
	var createdFields []*model.CPAField
	for i := 1; i <= 3; i++ {
		field, err := model.NewCPAFieldFromPropertyField(&model.PropertyField{
			GroupID: cpaID,
			Name:    fmt.Sprintf("Field %d", i),
			Type:    model.PropertyFieldTypeText,
		})
		require.NoError(t, err)
		createdField, appErr := th.App.CreateCPAField(rctx, field)
		require.Nil(t, appErr)
		createdFields = append(createdFields, createdField)
		value, appErr := th.App.PatchCPAValue(rctx, userID, createdField.ID, json.RawMessage(fmt.Sprintf(`"Value %d"`, i)), false)
		require.Nil(t, appErr)
		require.NotNil(t, value)
	}
	values, appErr := th.App.ListCPAValues(rctx, userID)
	require.Nil(t, appErr)
	require.Len(t, values, 3)
	t.Run("should delete all values for a user", func(t *testing.T) {
		appErr := th.App.DeleteCPAValues(rctx, userID)
		require.Nil(t, appErr)
		values, appErr := th.App.ListCPAValues(rctx, userID)
		require.Nil(t, appErr)
		require.Empty(t, values)
	})
	t.Run("should handle deleting values for a user with no values", func(t *testing.T) {
		appErr := th.App.DeleteCPAValues(rctx, otherUserID)
		require.Nil(t, appErr)
	})
	t.Run("should not affect values for other users", func(t *testing.T) {
		for _, field := range createdFields {
			value, appErr := th.App.PatchCPAValue(rctx, otherUserID, field.ID, json.RawMessage(`"Other user value"`), false)
			require.Nil(t, appErr)
			require.NotNil(t, value)
		}
		appErr := th.App.DeleteCPAValues(rctx, userID)
		require.Nil(t, appErr)
		values, appErr := th.App.ListCPAValues(rctx, otherUserID)
		require.Nil(t, appErr)
		require.Len(t, values, 3)
	})
}