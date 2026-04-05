package storetest
import (
	"database/sql"
	"fmt"
	"testing"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
	"github.com/stretchr/testify/require"
)
func TestPropertyFieldStore(t *testing.T, rctx request.CTX, ss store.Store, s SqlStore) {
	t.Run("CreatePropertyField", func(t *testing.T) { testCreatePropertyField(t, rctx, ss) })
	t.Run("GetPropertyField", func(t *testing.T) { testGetPropertyField(t, rctx, ss) })
	t.Run("GetManyPropertyFields", func(t *testing.T) { testGetManyPropertyFields(t, rctx, ss) })
	t.Run("GetFieldByName", func(t *testing.T) { testGetFieldByName(t, rctx, ss) })
	t.Run("UpdatePropertyField", func(t *testing.T) { testUpdatePropertyField(t, rctx, ss) })
	t.Run("DeletePropertyField", func(t *testing.T) { testDeletePropertyField(t, rctx, ss) })
	t.Run("SearchPropertyFields", func(t *testing.T) { testSearchPropertyFields(t, rctx, ss) })
	t.Run("SearchPropertyFieldsSince", func(t *testing.T) { testSearchPropertyFieldsSince(t, rctx, ss) })
	t.Run("CountForGroup", func(t *testing.T) { testCountForGroup(t, rctx, ss) })
}
func testCreatePropertyField(t *testing.T, _ request.CTX, ss store.Store) {
	t.Run("should fail if the property field already has an ID set", func(t *testing.T) {
		newField := &model.PropertyField{ID: "sampleid"}
		field, err := ss.PropertyField().Create(newField)
		require.Zero(t, field)
		var eii *store.ErrInvalidInput
		require.ErrorAs(t, err, &eii)
	})
	t.Run("should fail if the property field is not valid", func(t *testing.T) {
		newField := &model.PropertyField{GroupID: ""}
		field, err := ss.PropertyField().Create(newField)
		require.Zero(t, field)
		require.ErrorContains(t, err, "model.property_field.is_valid.app_error")
		newField = &model.PropertyField{GroupID: model.NewId(), Name: ""}
		field, err = ss.PropertyField().Create(newField)
		require.Zero(t, field)
		require.ErrorContains(t, err, "model.property_field.is_valid.app_error")
	})
	newField := &model.PropertyField{
		GroupID: model.NewId(),
		Name:    "My new property field",
		Type:    model.PropertyFieldTypeText,
		Attrs: map[string]any{
			"locked":  true,
			"special": "value",
		},
	}
	t.Run("should be able to create a property field", func(t *testing.T) {
		field, err := ss.PropertyField().Create(newField)
		require.NoError(t, err)
		require.NotZero(t, field.ID)
		require.NotZero(t, field.CreateAt)
		require.NotZero(t, field.UpdateAt)
		require.Zero(t, field.DeleteAt)
	})
	t.Run("should enforce the field's uniqueness", func(t *testing.T) {
		newField.ID = ""
		field, err := ss.PropertyField().Create(newField)
		require.Error(t, err)
		require.Empty(t, field)
	})
	t.Run("should generate option IDs for multiselect fields without IDs", func(t *testing.T) {
		multiselectField := &model.PropertyField{
			GroupID: model.NewId(),
			Name:    "Test Multiselect",
			Type:    model.PropertyFieldTypeMultiselect,
			Attrs: map[string]any{
				"options": []any{
					map[string]any{"name": "Option 1"},
					map[string]any{"name": "Option 2"},
					map[string]any{"name": "Option 3"},
				},
			},
		}
		field, err := ss.PropertyField().Create(multiselectField)
		require.NoError(t, err)
		require.NotZero(t, field.ID)
		options := field.Attrs["options"].([]any)
		require.Len(t, options, 3)
		for i, opt := range options {
			optMap := opt.(map[string]any)
			require.NotEmpty(t, optMap["id"], "Option %d should have an ID", i)
			require.Len(t, optMap["id"].(string), 26, "Option %d ID should be 26 characters", i)
		}
	})
	t.Run("should preserve existing option IDs for multiselect fields", func(t *testing.T) {
		existingID1 := model.NewId()
		existingID2 := model.NewId()
		multiselectField := &model.PropertyField{
			GroupID: model.NewId(),
			Name:    "Test Multiselect with IDs",
			Type:    model.PropertyFieldTypeMultiselect,
			Attrs: map[string]any{
				"options": []any{
					map[string]any{"id": existingID1, "name": "Option 1"},
					map[string]any{"id": existingID2, "name": "Option 2"},
				},
			},
		}
		field, err := ss.PropertyField().Create(multiselectField)
		require.NoError(t, err)
		options := field.Attrs["options"].([]any)
		require.Len(t, options, 2)
		require.Equal(t, existingID1, options[0].(map[string]any)["id"])
		require.Equal(t, existingID2, options[1].(map[string]any)["id"])
	})
}
func testGetPropertyField(t *testing.T, _ request.CTX, ss store.Store) {
	t.Run("should fail on nonexisting field", func(t *testing.T) {
		field, err := ss.PropertyField().Get("", model.NewId())
		require.Zero(t, field)
		require.ErrorIs(t, err, sql.ErrNoRows)
	})
	groupID := model.NewId()
	newField := &model.PropertyField{
		GroupID: groupID,
		Name:    "My new property field",
		Type:    model.PropertyFieldTypeText,
		Attrs: map[string]any{
			"locked":  true,
			"special": "value",
		},
	}
	_, err := ss.PropertyField().Create(newField)
	require.NoError(t, err)
	require.NotZero(t, newField.ID)
	t.Run("should be able to retrieve an existing property field", func(t *testing.T) {
		field, err := ss.PropertyField().Get(groupID, newField.ID)
		require.NoError(t, err)
		require.Equal(t, newField.ID, field.ID)
		require.True(t, field.Attrs["locked"].(bool))
		require.Equal(t, "value", field.Attrs["special"])
		field, err = ss.PropertyField().Get("", newField.ID)
		require.NoError(t, err)
		require.Equal(t, newField.ID, field.ID)
		require.True(t, field.Attrs["locked"].(bool))
		require.Equal(t, "value", field.Attrs["special"])
	})
	t.Run("should not be able to retrieve an existing field when specifying a different group ID", func(t *testing.T) {
		field, err := ss.PropertyField().Get(model.NewId(), newField.ID)
		require.Zero(t, field)
		require.ErrorIs(t, err, sql.ErrNoRows)
	})
}
func testGetManyPropertyFields(t *testing.T, _ request.CTX, ss store.Store) {
	t.Run("should fail on nonexisting fields", func(t *testing.T) {
		fields, err := ss.PropertyField().GetMany("", []string{model.NewId(), model.NewId()})
		require.Empty(t, fields)
		require.ErrorContains(t, err, "missmatch results")
	})
	groupID := model.NewId()
	newFields := []*model.PropertyField{}
	for _, fieldName := range []string{"field1", "field2", "field3"} {
		newField := &model.PropertyField{
			GroupID: groupID,
			Name:    fieldName,
			Type:    model.PropertyFieldTypeText,
		}
		_, err := ss.PropertyField().Create(newField)
		require.NoError(t, err)
		require.NotZero(t, newField.ID)
		newFields = append(newFields, newField)
	}
	newFieldOutsideGroup := &model.PropertyField{
		GroupID: model.NewId(),
		Name:    "field outside the groupID",
		Type:    model.PropertyFieldTypeText,
	}
	_, err := ss.PropertyField().Create(newFieldOutsideGroup)
	require.NoError(t, err)
	require.NotZero(t, newFieldOutsideGroup.ID)
	t.Run("should fail if at least one of the ids is nonexistent", func(t *testing.T) {
		fields, err := ss.PropertyField().GetMany(groupID, []string{newFields[0].ID, newFields[1].ID, model.NewId()})
		require.Empty(t, fields)
		require.ErrorContains(t, err, "missmatch results")
	})
	t.Run("should be able to retrieve existing property fields", func(t *testing.T) {
		fields, err := ss.PropertyField().GetMany(groupID, []string{newFields[0].ID, newFields[1].ID, newFields[2].ID})
		require.NoError(t, err)
		require.Len(t, fields, 3)
		require.ElementsMatch(t, newFields, fields)
	})
	t.Run("should fail if asked for valid IDs but outside the group", func(t *testing.T) {
		fields, err := ss.PropertyField().GetMany(groupID, []string{newFields[0].ID, newFieldOutsideGroup.ID})
		require.Empty(t, fields)
		require.ErrorContains(t, err, "missmatch results")
	})
	t.Run("should be able to retrieve existing property fields from multiple groups", func(t *testing.T) {
		fields, err := ss.PropertyField().GetMany("", []string{newFields[0].ID, newFieldOutsideGroup.ID})
		require.NoError(t, err)
		require.Len(t, fields, 2)
	})
}
func testGetFieldByName(t *testing.T, _ request.CTX, ss store.Store) {
	t.Run("should fail on nonexisting field", func(t *testing.T) {
		field, err := ss.PropertyField().GetFieldByName("", "", "nonexistent-field-name")
		require.Zero(t, field)
		require.ErrorIs(t, err, sql.ErrNoRows)
	})
	groupID := model.NewId()
	targetID := model.NewId()
	newField := &model.PropertyField{
		GroupID:  groupID,
		TargetID: targetID,
		Name:     "unique-field-name",
		Type:     model.PropertyFieldTypeText,
		Attrs: map[string]any{
			"locked":  true,
			"special": "value",
		},
	}
	_, cErr := ss.PropertyField().Create(newField)
	require.NoError(t, cErr)
	require.NotZero(t, newField.ID)
	t.Run("should be able to retrieve an existing property field by name", func(t *testing.T) {
		field, err := ss.PropertyField().GetFieldByName(groupID, targetID, "unique-field-name")
		require.NoError(t, err)
		require.Equal(t, newField.ID, field.ID)
		require.Equal(t, "unique-field-name", field.Name)
		require.True(t, field.Attrs["locked"].(bool))
		require.Equal(t, "value", field.Attrs["special"])
	})
	t.Run("should not be able to retrieve an existing field when specifying a different group ID", func(t *testing.T) {
		field, err := ss.PropertyField().GetFieldByName(model.NewId(), targetID, "unique-field-name")
		require.Zero(t, field)
		require.ErrorIs(t, err, sql.ErrNoRows)
	})
	t.Run("should not be able to retrieve an existing field when specifying a different target ID", func(t *testing.T) {
		field, err := ss.PropertyField().GetFieldByName(groupID, model.NewId(), "unique-field-name")
		require.Zero(t, field)
		require.ErrorIs(t, err, sql.ErrNoRows)
	})
	anotherGroupID := model.NewId()
	duplicateNameField := &model.PropertyField{
		GroupID:  anotherGroupID,
		TargetID: targetID,
		Name:     "unique-field-name",
		Type:     model.PropertyFieldTypeSelect,
		Attrs: map[string]any{
			"options": []any{
				map[string]any{"name": "a"},
				map[string]any{"name": "b"},
				map[string]any{"name": "c"},
			},
		},
	}
	_, cErr = ss.PropertyField().Create(duplicateNameField)
	require.NoError(t, cErr)
	require.NotZero(t, duplicateNameField.ID)
	t.Run("should retrieve the correct field when multiple fields have the same name but different groups", func(t *testing.T) {
		field, err := ss.PropertyField().GetFieldByName(groupID, targetID, "unique-field-name")
		require.NoError(t, err)
		require.Equal(t, newField.ID, field.ID)
		require.Equal(t, model.PropertyFieldTypeText, field.Type)
		field, err = ss.PropertyField().GetFieldByName(anotherGroupID, targetID, "unique-field-name")
		require.NoError(t, err)
		require.Equal(t, duplicateNameField.ID, field.ID)
		require.Equal(t, model.PropertyFieldTypeSelect, field.Type)
	})
	anotherTargetID := model.NewId()
	sameGroupDifferentTargetField := &model.PropertyField{
		GroupID:  groupID,
		TargetID: anotherTargetID,
		Name:     "unique-field-name",
		Type:     model.PropertyFieldTypeText,
		Attrs: map[string]any{
			"min": 1,
			"max": 100,
		},
	}
	_, cErr = ss.PropertyField().Create(sameGroupDifferentTargetField)
	require.NoError(t, cErr)
	require.NotZero(t, sameGroupDifferentTargetField.ID)
	t.Run("should retrieve the correct field when multiple fields have the same name and group but different target IDs", func(t *testing.T) {
		field, err := ss.PropertyField().GetFieldByName(groupID, targetID, "unique-field-name")
		require.NoError(t, err)
		require.Equal(t, newField.ID, field.ID)
		require.Equal(t, model.PropertyFieldTypeText, field.Type)
		field, err = ss.PropertyField().GetFieldByName(groupID, anotherTargetID, "unique-field-name")
		require.NoError(t, err)
		require.Equal(t, sameGroupDifferentTargetField.ID, field.ID)
		require.Equal(t, model.PropertyFieldTypeText, field.Type)
	})
	t.Run("should not retrieve deleted fields", func(t *testing.T) {
		deletedField := &model.PropertyField{
			GroupID:  groupID,
			TargetID: targetID,
			Name:     "to-be-deleted-field",
			Type:     model.PropertyFieldTypeText,
		}
		_, cErr := ss.PropertyField().Create(deletedField)
		require.NoError(t, cErr)
		require.NotZero(t, deletedField.ID)
		field, err := ss.PropertyField().GetFieldByName(groupID, targetID, "to-be-deleted-field")
		require.NoError(t, err)
		require.Equal(t, deletedField.ID, field.ID)
		err = ss.PropertyField().Delete("", deletedField.ID)
		require.NoError(t, err)
		field, err = ss.PropertyField().GetFieldByName(groupID, targetID, "to-be-deleted-field")
		require.Zero(t, field)
		require.ErrorIs(t, err, sql.ErrNoRows)
	})
	t.Run("should not retrieve fields with matching name but different DeleteAt status", func(t *testing.T) {
		replacementField := &model.PropertyField{
			GroupID:  groupID,
			TargetID: targetID,
			Name:     "to-be-deleted-field",
			Type:     model.PropertyFieldTypeText,
			Attrs: map[string]any{
				"min": 0,
				"max": 10,
			},
		}
		_, cErr := ss.PropertyField().Create(replacementField)
		require.NoError(t, cErr)
		require.NotZero(t, replacementField.ID)
		field, err := ss.PropertyField().GetFieldByName(groupID, targetID, "to-be-deleted-field")
		require.NoError(t, err)
		require.Equal(t, replacementField.ID, field.ID)
		require.Equal(t, model.PropertyFieldTypeText, field.Type)
		require.Zero(t, field.DeleteAt)
	})
}
func testUpdatePropertyField(t *testing.T, _ request.CTX, ss store.Store) {
	t.Run("should fail on nonexisting field", func(t *testing.T) {
		field := &model.PropertyField{
			ID:       model.NewId(),
			GroupID:  model.NewId(),
			Name:     "My property field",
			Type:     model.PropertyFieldTypeText,
			CreateAt: model.GetMillis(),
		}
		updatedField, err := ss.PropertyField().Update("", []*model.PropertyField{field})
		require.Zero(t, updatedField)
		require.ErrorContains(t, err, "failed to update, some property fields were not found, got 0 of 1")
	})
	t.Run("should fail if the property field is not valid", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID: model.NewId(),
			Name:    "My property field",
			Type:    model.PropertyFieldTypeText,
		}
		_, err := ss.PropertyField().Create(field)
		require.NoError(t, err)
		require.NotZero(t, field.ID)
		field.GroupID = ""
		updatedField, err := ss.PropertyField().Update("", []*model.PropertyField{field})
		require.Zero(t, updatedField)
		require.ErrorContains(t, err, "model.property_field.is_valid.app_error")
		field.GroupID = model.NewId()
		field.Name = ""
		updatedField, err = ss.PropertyField().Update("", []*model.PropertyField{field})
		require.Zero(t, updatedField)
		require.ErrorContains(t, err, "model.property_field.is_valid.app_error")
	})
	t.Run("should be able to update multiple property fields", func(t *testing.T) {
		field1 := &model.PropertyField{
			GroupID: model.NewId(),
			Name:    "First field",
			Type:    model.PropertyFieldTypeText,
			Attrs: map[string]any{
				"locked":  true,
				"special": "value",
			},
		}
		field2 := &model.PropertyField{
			GroupID: model.NewId(),
			Name:    "Second field",
			Type:    model.PropertyFieldTypeSelect,
			Attrs: map[string]any{
				"options": []any{
					map[string]any{"name": "a"},
					map[string]any{"name": "b"},
				},
			},
		}
		for _, field := range []*model.PropertyField{field1, field2} {
			_, err := ss.PropertyField().Create(field)
			require.NoError(t, err)
			require.NotZero(t, field.ID)
		}
		time.Sleep(10 * time.Millisecond)
		field1.Name = "Updated first"
		field1.Type = model.PropertyFieldTypeSelect
		field1.Attrs = map[string]any{
			"locked":    false,
			"new_field": "new_value",
		}
		field2.Name = "Updated second"
		field2.Attrs = map[string]any{
			"options": []any{
				map[string]any{"name": "x"},
				map[string]any{"name": "y"},
				map[string]any{"name": "z"},
			},
		}
		_, err := ss.PropertyField().Update("", []*model.PropertyField{field1, field2})
		require.NoError(t, err)
		updated1, err := ss.PropertyField().Get("", field1.ID)
		require.NoError(t, err)
		require.Equal(t, "Updated first", updated1.Name)
		require.Equal(t, model.PropertyFieldTypeSelect, updated1.Type)
		require.False(t, updated1.Attrs["locked"].(bool))
		require.NotContains(t, updated1.Attrs, "special")
		require.Equal(t, "new_value", updated1.Attrs["new_field"])
		require.Greater(t, updated1.UpdateAt, updated1.CreateAt)
		updated2, err := ss.PropertyField().Get("", field2.ID)
		require.NoError(t, err)
		require.Equal(t, "Updated second", updated2.Name)
		require.Equal(t, model.PropertyFieldTypeSelect, updated2.Type)
		options := updated2.Attrs["options"].([]any)
		require.Len(t, options, 3)
		optionNames := []string{}
		for _, opt := range options {
			optMap := opt.(map[string]any)
			require.NotEmpty(t, optMap["id"], "Option should have an ID")
			optionNames = append(optionNames, optMap["name"].(string))
		}
		require.ElementsMatch(t, []string{"x", "y", "z"}, optionNames)
		require.Greater(t, updated2.UpdateAt, updated2.CreateAt)
	})
	t.Run("should generate option IDs for multiselect fields on update", func(t *testing.T) {
		multiselectField := &model.PropertyField{
			GroupID: model.NewId(),
			Name:    "Test Multiselect Update",
			Type:    model.PropertyFieldTypeMultiselect,
			Attrs: map[string]any{
				"options": []any{
					map[string]any{"name": "Original 1"},
					map[string]any{"name": "Original 2"},
				},
			},
		}
		_, err := ss.PropertyField().Create(multiselectField)
		require.NoError(t, err)
		require.NotZero(t, multiselectField.ID)
		multiselectField.Attrs = map[string]any{
			"options": []any{
				map[string]any{"name": "Updated 1"},
				map[string]any{"name": "Updated 2"},
				map[string]any{"name": "Updated 3"},
			},
		}
		updatedFields, err := ss.PropertyField().Update("", []*model.PropertyField{multiselectField})
		require.NoError(t, err)
		require.Len(t, updatedFields, 1)
		options := updatedFields[0].Attrs["options"].([]any)
		require.Len(t, options, 3)
		for i, opt := range options {
			optMap := opt.(map[string]any)
			require.NotEmpty(t, optMap["id"], "Updated option %d should have an ID", i)
			require.Len(t, optMap["id"].(string), 26, "Updated option %d ID should be 26 characters", i)
		}
	})
	t.Run("should preserve existing option IDs on update", func(t *testing.T) {
		existingID1 := model.NewId()
		existingID2 := model.NewId()
		multiselectField := &model.PropertyField{
			GroupID: model.NewId(),
			Name:    "Test Multiselect Preserve IDs",
			Type:    model.PropertyFieldTypeMultiselect,
			Attrs: map[string]any{
				"options": []any{
					map[string]any{"id": existingID1, "name": "Option 1"},
					map[string]any{"id": existingID2, "name": "Option 2"},
				},
			},
		}
		_, err := ss.PropertyField().Create(multiselectField)
		require.NoError(t, err)
		multiselectField.Attrs = map[string]any{
			"options": []any{
				map[string]any{"id": existingID1, "name": "Option 1 Updated"},
				map[string]any{"id": existingID2, "name": "Option 2 Updated"},
			},
		}
		updatedFields, err := ss.PropertyField().Update("", []*model.PropertyField{multiselectField})
		require.NoError(t, err)
		require.Len(t, updatedFields, 1)
		options := updatedFields[0].Attrs["options"].([]any)
		require.Len(t, options, 2)
		require.Equal(t, existingID1, options[0].(map[string]any)["id"])
		require.Equal(t, existingID2, options[1].(map[string]any)["id"])
	})
	t.Run("should not update any fields if one update is invalid", func(t *testing.T) {
		groupID := model.NewId()
		field1 := &model.PropertyField{
			GroupID: groupID,
			Name:    "Field 1",
			Type:    model.PropertyFieldTypeText,
			Attrs: map[string]any{
				"key": "value",
			},
		}
		field2 := &model.PropertyField{
			GroupID: groupID,
			Name:    "Field 2",
			Type:    model.PropertyFieldTypeText,
			Attrs: map[string]any{
				"key": "value",
			},
		}
		for _, field := range []*model.PropertyField{field1, field2} {
			_, err := ss.PropertyField().Create(field)
			require.NoError(t, err)
		}
		originalUpdateAt1 := field1.UpdateAt
		originalUpdateAt2 := field2.UpdateAt
		field1.Name = "Valid update"
		field2.GroupID = "Invalid ID"
		_, err := ss.PropertyField().Update("", []*model.PropertyField{field1, field2})
		require.ErrorContains(t, err, "model.property_field.is_valid.app_error")
		updated1, err := ss.PropertyField().Get("", field1.ID)
		require.NoError(t, err)
		require.Equal(t, "Field 1", updated1.Name)
		require.Equal(t, originalUpdateAt1, updated1.UpdateAt)
		updated2, err := ss.PropertyField().Get("", field2.ID)
		require.NoError(t, err)
		require.Equal(t, groupID, updated2.GroupID)
		require.Equal(t, originalUpdateAt2, updated2.UpdateAt)
	})
	t.Run("should not update any fields if one update points to a nonexisting one", func(t *testing.T) {
		field1 := &model.PropertyField{
			GroupID: model.NewId(),
			Name:    "First field",
			Type:    model.PropertyFieldTypeText,
		}
		_, err := ss.PropertyField().Create(field1)
		require.NoError(t, err)
		originalUpdateAt := field1.UpdateAt
		field2 := &model.PropertyField{
			ID:         model.NewId(),
			GroupID:    model.NewId(),
			Name:       "Second field",
			Type:       model.PropertyFieldTypeText,
			TargetID:   model.NewId(),
			TargetType: "test_type",
			CreateAt:   1,
			Attrs: map[string]any{
				"key": "value",
			},
		}
		field1.Name = "Updated First"
		_, err = ss.PropertyField().Update("", []*model.PropertyField{field1, field2})
		require.Error(t, err)
		require.ErrorContains(t, err, "failed to update, some property fields were not found")
		updated1, err := ss.PropertyField().Get("", field1.ID)
		require.NoError(t, err)
		require.Equal(t, "First field", updated1.Name)
		require.Equal(t, originalUpdateAt, updated1.UpdateAt)
	})
	t.Run("should update fields with matching groupID", func(t *testing.T) {
		groupID := model.NewId()
		field1 := &model.PropertyField{
			GroupID: groupID,
			Name:    "Group Field 1",
			Type:    model.PropertyFieldTypeText,
		}
		field2 := &model.PropertyField{
			GroupID: groupID,
			Name:    "Group Field 2",
			Type:    model.PropertyFieldTypeText,
		}
		for _, field := range []*model.PropertyField{field1, field2} {
			_, err := ss.PropertyField().Create(field)
			require.NoError(t, err)
		}
		field1.Name = "Updated Group Field 1"
		field2.Name = "Updated Group Field 2"
		updatedFields, err := ss.PropertyField().Update(groupID, []*model.PropertyField{field1, field2})
		require.NoError(t, err)
		require.Len(t, updatedFields, 2)
		for _, field := range []*model.PropertyField{field1, field2} {
			updated, err := ss.PropertyField().Get("", field.ID)
			require.NoError(t, err)
			require.Contains(t, updated.Name, "Updated Group Field")
		}
	})
	t.Run("should not update fields with non-matching groupID", func(t *testing.T) {
		groupID1 := model.NewId()
		groupID2 := model.NewId()
		field1 := &model.PropertyField{
			GroupID: groupID1,
			Name:    "Field in Group 1",
			Type:    model.PropertyFieldTypeText,
		}
		field2 := &model.PropertyField{
			GroupID: groupID2,
			Name:    "Field in Group 2",
			Type:    model.PropertyFieldTypeText,
		}
		for _, field := range []*model.PropertyField{field1, field2} {
			_, err := ss.PropertyField().Create(field)
			require.NoError(t, err)
		}
		originalName1 := field1.Name
		originalName2 := field2.Name
		field1.Name = "Updated Field in Group 1"
		field2.Name = "Updated Field in Group 2"
		_, err := ss.PropertyField().Update(groupID1, []*model.PropertyField{field1, field2})
		require.Error(t, err)
		require.ErrorContains(t, err, "failed to update, some property fields were not found")
		updated1, err := ss.PropertyField().Get("", field1.ID)
		require.NoError(t, err)
		require.Equal(t, originalName1, updated1.Name)
		updated2, err := ss.PropertyField().Get("", field2.ID)
		require.NoError(t, err)
		require.Equal(t, originalName2, updated2.Name)
	})
}
func testDeletePropertyField(t *testing.T, _ request.CTX, ss store.Store) {
	t.Run("should fail on nonexisting field", func(t *testing.T) {
		err := ss.PropertyField().Delete("", model.NewId())
		var enf *store.ErrNotFound
		require.ErrorAs(t, err, &enf)
	})
	newField := &model.PropertyField{
		GroupID: model.NewId(),
		Name:    "My property field",
		Type:    model.PropertyFieldTypeText,
	}
	t.Run("should be able to delete an existing property field", func(t *testing.T) {
		field, err := ss.PropertyField().Create(newField)
		require.NoError(t, err)
		require.NotEmpty(t, field.ID)
		err = ss.PropertyField().Delete("", field.ID)
		require.NoError(t, err)
		deletedField, err := ss.PropertyField().Get("", field.ID)
		require.NoError(t, err)
		require.NotZero(t, deletedField.DeleteAt)
	})
	t.Run("should be able to create a new field with the same details as the deleted one", func(t *testing.T) {
		newField.ID = ""
		field, err := ss.PropertyField().Create(newField)
		require.NoError(t, err)
		require.NotEmpty(t, field.ID)
	})
	t.Run("should be able to delete a field with matching groupID", func(t *testing.T) {
		groupID := model.NewId()
		field := &model.PropertyField{
			GroupID: groupID,
			Name:    "Field with specific group",
			Type:    model.PropertyFieldTypeText,
		}
		_, err := ss.PropertyField().Create(field)
		require.NoError(t, err)
		require.NotZero(t, field.ID)
		err = ss.PropertyField().Delete(groupID, field.ID)
		require.NoError(t, err)
		deletedField, err := ss.PropertyField().Get(groupID, field.ID)
		require.NoError(t, err)
		require.NotZero(t, deletedField.DeleteAt)
	})
	t.Run("should fail when deleting with non-matching groupID", func(t *testing.T) {
		groupID := model.NewId()
		field := &model.PropertyField{
			GroupID: groupID,
			Name:    "Another field with specific group",
			Type:    model.PropertyFieldTypeText,
		}
		_, err := ss.PropertyField().Create(field)
		require.NoError(t, err)
		require.NotZero(t, field.ID)
		err = ss.PropertyField().Delete(model.NewId(), field.ID)
		require.Error(t, err)
		var enf *store.ErrNotFound
		require.ErrorAs(t, err, &enf)
		nonDeletedField, err := ss.PropertyField().Get(groupID, field.ID)
		require.NoError(t, err)
		require.Zero(t, nonDeletedField.DeleteAt)
	})
}
func testCountForGroup(t *testing.T, _ request.CTX, ss store.Store) {
	t.Run("should return 0 for group with no properties", func(t *testing.T) {
		count, err := ss.PropertyField().CountForGroup(model.NewId(), false)
		require.NoError(t, err)
		require.Equal(t, int64(0), count)
	})
	t.Run("should return correct count for group with properties", func(t *testing.T) {
		groupID := model.NewId()
		for i := range 5 {
			field := &model.PropertyField{
				GroupID: groupID,
				Name:    fmt.Sprintf("Field %d", i),
				Type:    model.PropertyFieldTypeText,
			}
			_, err := ss.PropertyField().Create(field)
			require.NoError(t, err)
		}
		count, err := ss.PropertyField().CountForGroup(groupID, false)
		require.NoError(t, err)
		require.Equal(t, int64(5), count)
	})
	t.Run("should not count deleted properties when includeDeleted is false", func(t *testing.T) {
		groupID := model.NewId()
		for i := range 5 {
			field := &model.PropertyField{
				GroupID: groupID,
				Name:    fmt.Sprintf("Field %d", i),
				Type:    model.PropertyFieldTypeText,
			}
			_, err := ss.PropertyField().Create(field)
			require.NoError(t, err)
		}
		deletedField := &model.PropertyField{
			GroupID: groupID,
			Name:    "To be deleted",
			Type:    model.PropertyFieldTypeText,
		}
		_, err := ss.PropertyField().Create(deletedField)
		require.NoError(t, err)
		err = ss.PropertyField().Delete("", deletedField.ID)
		require.NoError(t, err)
		count, err := ss.PropertyField().CountForGroup(groupID, false)
		require.NoError(t, err)
		require.Equal(t, int64(5), count)
	})
	t.Run("should count deleted properties when includeDeleted is true", func(t *testing.T) {
		groupID := model.NewId()
		for i := range 5 {
			field := &model.PropertyField{
				GroupID: groupID,
				Name:    fmt.Sprintf("Field %d", i),
				Type:    model.PropertyFieldTypeText,
			}
			_, err := ss.PropertyField().Create(field)
			require.NoError(t, err)
		}
		deletedField := &model.PropertyField{
			GroupID: groupID,
			Name:    "To be deleted",
			Type:    model.PropertyFieldTypeText,
		}
		_, err := ss.PropertyField().Create(deletedField)
		require.NoError(t, err)
		err = ss.PropertyField().Delete("", deletedField.ID)
		require.NoError(t, err)
		count, err := ss.PropertyField().CountForGroup(groupID, true)
		require.NoError(t, err)
		require.Equal(t, int64(6), count)
	})
}
func testSearchPropertyFields(t *testing.T, _ request.CTX, ss store.Store) {
	groupID := model.NewId()
	targetID := model.NewId()
	field1 := &model.PropertyField{
		GroupID:    groupID,
		Name:       "Field 1",
		Type:       model.PropertyFieldTypeText,
		TargetID:   targetID,
		TargetType: "test_type",
	}
	field2 := &model.PropertyField{
		GroupID:    groupID,
		Name:       "Field 2",
		Type:       model.PropertyFieldTypeSelect,
		TargetID:   targetID,
		TargetType: "other_type",
	}
	field3 := &model.PropertyField{
		GroupID:    model.NewId(),
		Name:       "Field 3",
		Type:       model.PropertyFieldTypeText,
		TargetType: "test_type",
	}
	targetID2 := model.NewId()
	field4 := &model.PropertyField{
		GroupID:    groupID,
		Name:       "Field 4",
		Type:       model.PropertyFieldTypeText,
		TargetID:   targetID2,
		TargetType: "test_type",
	}
	for _, field := range []*model.PropertyField{field1, field2, field3, field4} {
		_, err := ss.PropertyField().Create(field)
		require.NoError(t, err)
		time.Sleep(10 * time.Millisecond)
	}
	require.NoError(t, ss.PropertyField().Delete("", field4.ID))
	tests := []struct {
		name          string
		opts          model.PropertyFieldSearchOpts
		expectedError bool
		expectedIDs   []string
	}{
		{
			name: "negative per_page",
			opts: model.PropertyFieldSearchOpts{
				PerPage: -1,
			},
			expectedError: true,
		},
		{
			name: "filter by group_id",
			opts: model.PropertyFieldSearchOpts{
				GroupID: groupID,
				PerPage: 10,
			},
			expectedIDs: []string{field1.ID, field2.ID},
		},
		{
			name: "filter by group_id including deleted",
			opts: model.PropertyFieldSearchOpts{
				GroupID:        groupID,
				PerPage:        10,
				IncludeDeleted: true,
			},
			expectedIDs: []string{field1.ID, field2.ID, field4.ID},
		},
		{
			name: "filter by target_type",
			opts: model.PropertyFieldSearchOpts{
				TargetType: "test_type",
				PerPage:    10,
			},
			expectedIDs: []string{field1.ID, field3.ID},
		},
		{
			name: "filter by target_id",
			opts: model.PropertyFieldSearchOpts{
				TargetIDs: []string{targetID},
				PerPage:   10,
			},
			expectedIDs: []string{field1.ID, field2.ID},
		},
		{
			name: "pagination page 0",
			opts: model.PropertyFieldSearchOpts{
				GroupID:        groupID,
				PerPage:        2,
				IncludeDeleted: true,
			},
			expectedIDs: []string{field1.ID, field2.ID},
		},
		{
			name: "pagination page 1",
			opts: model.PropertyFieldSearchOpts{
				GroupID: groupID,
				Cursor: model.PropertyFieldSearchCursor{
					CreateAt:        field2.CreateAt,
					PropertyFieldID: field2.ID,
				},
				PerPage:        2,
				IncludeDeleted: true,
			},
			expectedIDs: []string{field4.ID},
		},
		{
			name: "filter by multiple target_ids",
			opts: model.PropertyFieldSearchOpts{
				TargetIDs: []string{targetID, targetID2},
				PerPage:   10,
			},
			expectedIDs: []string{field1.ID, field2.ID},
		},
		{
			name: "filter by multiple target_ids including deleted",
			opts: model.PropertyFieldSearchOpts{
				TargetIDs:      []string{targetID, targetID2},
				IncludeDeleted: true,
				PerPage:        10,
			},
			expectedIDs: []string{field1.ID, field2.ID, field4.ID},
		},
		{
			name: "filter by multiple target_ids with group filter",
			opts: model.PropertyFieldSearchOpts{
				GroupID:   groupID,
				TargetIDs: []string{targetID, targetID2},
				PerPage:   10,
			},
			expectedIDs: []string{field1.ID, field2.ID},
		},
		{
			name: "filter by SinceUpdateAt timestamp - no results before",
			opts: model.PropertyFieldSearchOpts{
				SinceUpdateAt: field3.UpdateAt,
				PerPage:       10,
			},
			expectedIDs: []string{},
		},
		{
			name: "filter by SinceUpdateAt timestamp - get fields after specific time",
			opts: model.PropertyFieldSearchOpts{
				SinceUpdateAt: field1.UpdateAt,
				PerPage:       10,
			},
			expectedIDs: []string{field2.ID, field3.ID},
		},
		{
			name: "filter by SinceUpdateAt timestamp with group filter",
			opts: model.PropertyFieldSearchOpts{
				GroupID:       groupID,
				SinceUpdateAt: field1.UpdateAt,
				PerPage:       10,
			},
			expectedIDs: []string{field2.ID},
		},
		{
			name: "filter by SinceUpdateAt timestamp including deleted",
			opts: model.PropertyFieldSearchOpts{
				SinceUpdateAt:  field3.UpdateAt,
				IncludeDeleted: true,
				PerPage:        10,
			},
			expectedIDs: []string{field4.ID},
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			results, err := ss.PropertyField().SearchPropertyFields(tc.opts)
			if tc.expectedError {
				require.Error(t, err)
				return
			}
			require.NoError(t, err)
			ids := make([]string, len(results))
			for i, field := range results {
				ids[i] = field.ID
			}
			require.ElementsMatch(t, tc.expectedIDs, ids)
		})
	}
}
func testSearchPropertyFieldsSince(t *testing.T, _ request.CTX, ss store.Store) {
	groupID := model.NewId()
	field1, err := ss.PropertyField().Create(&model.PropertyField{
		GroupID:    groupID,
		Name:       "Field 1",
		Type:       model.PropertyFieldTypeText,
		TargetID:   model.NewId(),
		TargetType: "test_type",
	})
	require.NoError(t, err)
	time.Sleep(10 * time.Millisecond)
	field2, err := ss.PropertyField().Create(&model.PropertyField{
		GroupID:    groupID,
		Name:       "Field 2",
		Type:       model.PropertyFieldTypeText,
		TargetID:   model.NewId(),
		TargetType: "test_type",
	})
	require.NoError(t, err)
	time.Sleep(10 * time.Millisecond)
	field3, err := ss.PropertyField().Create(&model.PropertyField{
		GroupID:    groupID,
		Name:       "Field 3",
		Type:       model.PropertyFieldTypeText,
		TargetID:   model.NewId(),
		TargetType: "test_type",
	})
	require.NoError(t, err)
	time.Sleep(10 * time.Millisecond)
	field2.Name = "Field 2 Updated"
	updatedFields, err := ss.PropertyField().Update("", []*model.PropertyField{field2})
	require.NoError(t, err)
	require.Len(t, updatedFields, 1)
	updatedField2 := updatedFields[0]
	t.Run("SinceUpdateAt filters correctly by UpdateAt", func(t *testing.T) {
		results, err := ss.PropertyField().SearchPropertyFields(model.PropertyFieldSearchOpts{
			GroupID:       groupID,
			SinceUpdateAt: field1.UpdateAt,
			PerPage:       10,
		})
		require.NoError(t, err)
		require.Len(t, results, 2)
		resultIDs := make([]string, len(results))
		for i, result := range results {
			resultIDs[i] = result.ID
		}
		require.ElementsMatch(t, []string{field2.ID, field3.ID}, resultIDs)
	})
	t.Run("SinceUpdateAt with boundary condition", func(t *testing.T) {
		results, err := ss.PropertyField().SearchPropertyFields(model.PropertyFieldSearchOpts{
			GroupID:       groupID,
			SinceUpdateAt: field3.UpdateAt - 1,
			PerPage:       10,
		})
		require.NoError(t, err)
		require.Len(t, results, 2)
		resultIDs := make([]string, len(results))
		for i, result := range results {
			resultIDs[i] = result.ID
		}
		require.ElementsMatch(t, []string{field2.ID, field3.ID}, resultIDs)
	})
	t.Run("SinceUpdateAt after all updates", func(t *testing.T) {
		results, err := ss.PropertyField().SearchPropertyFields(model.PropertyFieldSearchOpts{
			GroupID:       groupID,
			SinceUpdateAt: updatedField2.UpdateAt,
			PerPage:       10,
		})
		require.NoError(t, err)
		require.Len(t, results, 0)
	})
	t.Run("SinceUpdateAt with very recent timestamp", func(t *testing.T) {
		results, err := ss.PropertyField().SearchPropertyFields(model.PropertyFieldSearchOpts{
			GroupID:       groupID,
			SinceUpdateAt: model.GetMillis(),
			PerPage:       10,
		})
		require.NoError(t, err)
		require.Len(t, results, 0)
	})
}