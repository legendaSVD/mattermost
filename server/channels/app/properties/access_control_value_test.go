package properties
import (
	"encoding/json"
	"testing"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)
func TestCreatePropertyValue_WriteAccessControl(t *testing.T) {
	th := Setup(t).RegisterCPAPropertyGroup(t)
	th.service.setPluginCheckerForTests(func(pluginID string) bool {
		return pluginID == "plugin-1" || pluginID == "plugin-2"
	})
	rctxPlugin1 := RequestContextWithCallerID(th.Context, "plugin-1")
	rctxPlugin2 := RequestContextWithCallerID(th.Context, "plugin-2")
	t.Run("allows creating value for public field", func(t *testing.T) {
		field := &model.PropertyField{GroupID: th.CPAGroupID, Name: "Public", Type: model.PropertyFieldTypeText}
		created, err := th.service.CreatePropertyField(rctxPlugin1, field)
		require.NoError(t, err)
		value := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    created.ID,
			TargetType: "user",
			TargetID:   model.NewId(),
			Value:      json.RawMessage(`"test value"`),
		}
		createdValue, err := th.service.CreatePropertyValue(rctxPlugin2, value)
		require.NoError(t, err)
		assert.NotNil(t, createdValue)
	})
	t.Run("allows source plugin to create value for source_only field", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID: th.CPAGroupID,
			Name:    "SourceOnly",
			Type:    model.PropertyFieldTypeText,
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModeSourceOnly,
				model.PropertyAttrsProtected:  true,
			},
		}
		created, err := th.service.CreatePropertyField(rctxPlugin1, field)
		require.NoError(t, err)
		value := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    created.ID,
			TargetType: "user",
			TargetID:   model.NewId(),
			Value:      json.RawMessage(`"secret value"`),
		}
		createdValue, err := th.service.CreatePropertyValue(rctxPlugin1, value)
		require.NoError(t, err)
		assert.NotNil(t, createdValue)
	})
	t.Run("denies creating value for protected field by non-source", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID: th.CPAGroupID,
			Name:    "Protected",
			Type:    model.PropertyFieldTypeText,
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		created, err := th.service.CreatePropertyField(rctxPlugin1, field)
		require.NoError(t, err)
		value := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    created.ID,
			TargetType: "user",
			TargetID:   model.NewId(),
			Value:      json.RawMessage(`"value"`),
		}
		createdValue, err := th.service.CreatePropertyValue(rctxPlugin2, value)
		require.Error(t, err)
		assert.Nil(t, createdValue)
		assert.Contains(t, err.Error(), "protected")
	})
	t.Run("non-CPA group routes directly to PropertyService without access control", func(t *testing.T) {
		nonCpaGroup, err := th.service.RegisterPropertyGroup("other-group-value-create")
		require.NoError(t, err)
		field := &model.PropertyField{
			GroupID: nonCpaGroup.ID,
			Name:    "Non-CPA Value Protected",
			Type:    model.PropertyFieldTypeText,
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected:      true,
				model.PropertyAttrsSourcePluginID: "plugin-1",
			},
		}
		created, err := th.service.CreatePropertyField(rctxPlugin1, field)
		require.NoError(t, err)
		value := &model.PropertyValue{
			GroupID:    nonCpaGroup.ID,
			FieldID:    created.ID,
			TargetType: "user",
			TargetID:   model.NewId(),
			Value:      json.RawMessage(`"test value"`),
		}
		createdValue, err := th.service.CreatePropertyValue(rctxPlugin2, value)
		require.NoError(t, err)
		assert.NotNil(t, createdValue)
	})
}
func TestDeletePropertyValue_WriteAccessControl(t *testing.T) {
	th := Setup(t).RegisterCPAPropertyGroup(t)
	th.service.setPluginCheckerForTests(func(pluginID string) bool {
		return pluginID == "plugin-1" || pluginID == "plugin-2"
	})
	rctxPlugin1 := RequestContextWithCallerID(th.Context, "plugin-1")
	rctxPlugin2 := RequestContextWithCallerID(th.Context, "plugin-2")
	t.Run("allows deleting value for public field", func(t *testing.T) {
		field := &model.PropertyField{GroupID: th.CPAGroupID, Name: "Public", Type: model.PropertyFieldTypeText}
		created, err := th.service.CreatePropertyField(rctxPlugin1, field)
		require.NoError(t, err)
		value := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    created.ID,
			TargetType: "user",
			TargetID:   model.NewId(),
			Value:      json.RawMessage(`"test"`),
		}
		createdValue, err := th.service.CreatePropertyValue(rctxPlugin1, value)
		require.NoError(t, err)
		err = th.service.DeletePropertyValue(rctxPlugin2, th.CPAGroupID, createdValue.ID)
		require.NoError(t, err)
	})
	t.Run("denies non-source deleting value for protected field", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID: th.CPAGroupID,
			Name:    "Protected",
			Type:    model.PropertyFieldTypeText,
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		created, err := th.service.CreatePropertyField(rctxPlugin1, field)
		require.NoError(t, err)
		value := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    created.ID,
			TargetType: "user",
			TargetID:   model.NewId(),
			Value:      json.RawMessage(`"test"`),
		}
		createdValue, err := th.service.CreatePropertyValue(rctxPlugin1, value)
		require.NoError(t, err)
		err = th.service.DeletePropertyValue(rctxPlugin2, th.CPAGroupID, createdValue.ID)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "protected")
	})
}
func TestDeletePropertyValuesForTarget_WriteAccessControl(t *testing.T) {
	th := Setup(t).RegisterCPAPropertyGroup(t)
	th.service.setPluginCheckerForTests(func(pluginID string) bool {
		return pluginID == "plugin-1" || pluginID == "plugin-2"
	})
	rctxPlugin1 := RequestContextWithCallerID(th.Context, "plugin-1")
	rctxPlugin2 := RequestContextWithCallerID(th.Context, "plugin-2")
	t.Run("allows deleting all values when caller has write access to all fields", func(t *testing.T) {
		field1 := &model.PropertyField{GroupID: th.CPAGroupID, Name: "Field1", Type: model.PropertyFieldTypeText}
		field2 := &model.PropertyField{GroupID: th.CPAGroupID, Name: "Field2", Type: model.PropertyFieldTypeText}
		created1, err := th.service.CreatePropertyField(rctxPlugin1, field1)
		require.NoError(t, err)
		created2, err := th.service.CreatePropertyField(rctxPlugin1, field2)
		require.NoError(t, err)
		targetID := model.NewId()
		value1 := &model.PropertyValue{GroupID: th.CPAGroupID, FieldID: created1.ID, TargetType: "user", TargetID: targetID, Value: json.RawMessage(`"v1"`)}
		value2 := &model.PropertyValue{GroupID: th.CPAGroupID, FieldID: created2.ID, TargetType: "user", TargetID: targetID, Value: json.RawMessage(`"v2"`)}
		_, err = th.service.CreatePropertyValue(rctxPlugin1, value1)
		require.NoError(t, err)
		_, err = th.service.CreatePropertyValue(rctxPlugin1, value2)
		require.NoError(t, err)
		err = th.service.DeletePropertyValuesForTarget(rctxPlugin2, th.CPAGroupID, "user", targetID)
		require.NoError(t, err)
	})
	t.Run("fails atomically when caller lacks access to one field", func(t *testing.T) {
		field1 := &model.PropertyField{GroupID: th.CPAGroupID, Name: "Public", Type: model.PropertyFieldTypeText}
		created1, err := th.service.CreatePropertyField(rctxPlugin1, field1)
		require.NoError(t, err)
		field2 := &model.PropertyField{
			GroupID: th.CPAGroupID,
			Name:    "Protected",
			Type:    model.PropertyFieldTypeText,
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		created2, err := th.service.CreatePropertyField(rctxPlugin1, field2)
		require.NoError(t, err)
		targetID := model.NewId()
		value1 := &model.PropertyValue{GroupID: th.CPAGroupID, FieldID: created1.ID, TargetType: "user", TargetID: targetID, Value: json.RawMessage(`"v1"`)}
		value2 := &model.PropertyValue{GroupID: th.CPAGroupID, FieldID: created2.ID, TargetType: "user", TargetID: targetID, Value: json.RawMessage(`"v2"`)}
		_, err = th.service.CreatePropertyValue(rctxPlugin1, value1)
		require.NoError(t, err)
		_, err = th.service.CreatePropertyValue(rctxPlugin1, value2)
		require.NoError(t, err)
		err = th.service.DeletePropertyValuesForTarget(rctxPlugin2, th.CPAGroupID, "user", targetID)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "protected")
		values, err := th.service.SearchPropertyValues(rctxPlugin1, th.CPAGroupID, model.PropertyValueSearchOpts{
			TargetIDs: []string{targetID},
			PerPage:   10,
		})
		require.NoError(t, err)
		assert.Len(t, values, 2)
	})
}
func TestGetPropertyValueReadAccess(t *testing.T) {
	th := Setup(t).RegisterCPAPropertyGroup(t)
	th.service.setPluginCheckerForTests(func(pluginID string) bool {
		return pluginID == "plugin-1" || pluginID == "test-plugin"
	})
	pluginID1 := "plugin-1"
	pluginID2 := "plugin-2"
	userID1 := model.NewId()
	userID2 := model.NewId()
	rctxAnon := RequestContextWithCallerID(th.Context, "")
	rctx1 := RequestContextWithCallerID(th.Context, pluginID1)
	rctx2 := RequestContextWithCallerID(th.Context, pluginID2)
	rctxUser2 := RequestContextWithCallerID(th.Context, userID2)
	rctxTestPlugin := RequestContextWithCallerID(th.Context, "test-plugin")
	t.Run("public field value - any caller can read", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "public-field",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModePublic,
			},
		}
		field, err := th.service.CreatePropertyField(rctxAnon, field)
		require.NoError(t, err)
		textValue, jsonErr := json.Marshal("test value")
		require.NoError(t, jsonErr)
		value := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    field.ID,
			TargetType: "user",
			TargetID:   userID1,
			Value:      textValue,
		}
		value, err = th.service.CreatePropertyValue(rctxAnon, value)
		require.NoError(t, err)
		retrieved, err := th.service.GetPropertyValue(rctx1, th.CPAGroupID, value.ID)
		require.NoError(t, err)
		require.NotNil(t, retrieved)
		assert.Equal(t, value.ID, retrieved.ID)
		assert.Equal(t, json.RawMessage(textValue), retrieved.Value)
		retrieved, err = th.service.GetPropertyValue(rctx2, th.CPAGroupID, value.ID)
		require.NoError(t, err)
		require.NotNil(t, retrieved)
		assert.Equal(t, value.ID, retrieved.ID)
		retrieved, err = th.service.GetPropertyValue(rctxUser2, th.CPAGroupID, value.ID)
		require.NoError(t, err)
		require.NotNil(t, retrieved)
		assert.Equal(t, value.ID, retrieved.ID)
		retrieved, err = th.service.GetPropertyValue(rctxAnon, th.CPAGroupID, value.ID)
		require.NoError(t, err)
		require.NotNil(t, retrieved)
		assert.Equal(t, value.ID, retrieved.ID)
	})
	t.Run("source_only field value - only source plugin can read", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "source-only-field",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModeSourceOnly,
				model.PropertyAttrsProtected:  true,
			},
		}
		field, err := th.service.CreatePropertyField(rctx1, field)
		require.NoError(t, err)
		textValue, jsonErr := json.Marshal("secret value")
		require.NoError(t, jsonErr)
		value := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    field.ID,
			TargetType: "user",
			TargetID:   userID1,
			Value:      textValue,
		}
		value, err = th.service.CreatePropertyValue(rctx1, value)
		require.NoError(t, err)
		retrieved, err := th.service.GetPropertyValue(rctx1, th.CPAGroupID, value.ID)
		require.NoError(t, err)
		require.NotNil(t, retrieved)
		assert.Equal(t, value.ID, retrieved.ID)
		assert.Equal(t, json.RawMessage(textValue), retrieved.Value)
	})
	t.Run("source_only field value - other plugin gets nil", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "source-only-field-2",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModeSourceOnly,
				model.PropertyAttrsProtected:  true,
			},
		}
		field, err := th.service.CreatePropertyField(rctx1, field)
		require.NoError(t, err)
		textValue, jsonErr := json.Marshal("secret value")
		require.NoError(t, jsonErr)
		value := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    field.ID,
			TargetType: "user",
			TargetID:   userID1,
			Value:      textValue,
		}
		value, err = th.service.CreatePropertyValue(rctx1, value)
		require.NoError(t, err)
		retrieved, err := th.service.GetPropertyValue(rctx2, th.CPAGroupID, value.ID)
		require.NoError(t, err)
		assert.Nil(t, retrieved)
		retrieved, err = th.service.GetPropertyValue(rctxUser2, th.CPAGroupID, value.ID)
		require.NoError(t, err)
		assert.Nil(t, retrieved)
		retrieved, err = th.service.GetPropertyValue(rctxAnon, th.CPAGroupID, value.ID)
		require.NoError(t, err)
		assert.Nil(t, retrieved)
	})
	t.Run("shared_only single-select - return value only if caller has same", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "shared-only-single-select",
			Type:       model.PropertyFieldTypeSelect,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModeSharedOnly,
				model.PropertyAttrsProtected:  true,
				model.PropertyFieldAttributeOptions: []any{
					map[string]any{"id": "opt1", "value": "Option 1"},
					map[string]any{"id": "opt2", "value": "Option 2"},
					map[string]any{"id": "opt3", "value": "Option 3"},
				},
			},
		}
		field, err := th.service.CreatePropertyField(rctxTestPlugin, field)
		require.NoError(t, err)
		user1Value, jsonErr := json.Marshal("opt1")
		require.NoError(t, jsonErr)
		value1 := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    field.ID,
			TargetType: "user",
			TargetID:   userID1,
			Value:      user1Value,
		}
		value1, err = th.service.CreatePropertyValue(rctxTestPlugin, value1)
		require.NoError(t, err)
		user2Value, jsonErr := json.Marshal("opt1")
		require.NoError(t, jsonErr)
		value2 := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    field.ID,
			TargetType: "user",
			TargetID:   userID2,
			Value:      user2Value,
		}
		_, err = th.service.CreatePropertyValue(rctxTestPlugin, value2)
		require.NoError(t, err)
		retrieved, err := th.service.GetPropertyValue(rctxUser2, th.CPAGroupID, value1.ID)
		require.NoError(t, err)
		require.NotNil(t, retrieved)
		assert.Equal(t, value1.ID, retrieved.ID)
		assert.Equal(t, json.RawMessage(user1Value), retrieved.Value)
		userID3 := model.NewId()
		user3Value, jsonErr := json.Marshal("opt2")
		require.NoError(t, jsonErr)
		value3 := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    field.ID,
			TargetType: "user",
			TargetID:   userID3,
			Value:      user3Value,
		}
		_, err = th.service.CreatePropertyValue(rctxTestPlugin, value3)
		require.NoError(t, err)
		retrieved, err = th.service.GetPropertyValue(RequestContextWithCallerID(th.Context, userID3), th.CPAGroupID, value1.ID)
		require.NoError(t, err)
		assert.Nil(t, retrieved)
	})
	t.Run("shared_only multi-select - return intersection of arrays", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "shared-only-multi-select",
			Type:       model.PropertyFieldTypeMultiselect,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModeSharedOnly,
				model.PropertyAttrsProtected:  true,
				model.PropertyFieldAttributeOptions: []any{
					map[string]any{"id": "opt1", "value": "Hiking"},
					map[string]any{"id": "opt2", "value": "Cooking"},
					map[string]any{"id": "opt3", "value": "Gaming"},
				},
			},
		}
		field, err := th.service.CreatePropertyField(rctxTestPlugin, field)
		require.NoError(t, err)
		aliceID := model.NewId()
		aliceValue, jsonErr := json.Marshal([]string{"opt1", "opt2"})
		require.NoError(t, jsonErr)
		alicePropertyValue := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    field.ID,
			TargetType: "user",
			TargetID:   aliceID,
			Value:      aliceValue,
		}
		alicePropertyValue, err = th.service.CreatePropertyValue(rctxTestPlugin, alicePropertyValue)
		require.NoError(t, err)
		bobID := model.NewId()
		bobValue, jsonErr := json.Marshal([]string{"opt1", "opt3"})
		require.NoError(t, jsonErr)
		bobPropertyValue := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    field.ID,
			TargetType: "user",
			TargetID:   bobID,
			Value:      bobValue,
		}
		_, err = th.service.CreatePropertyValue(rctxTestPlugin, bobPropertyValue)
		require.NoError(t, err)
		retrieved, err := th.service.GetPropertyValue(RequestContextWithCallerID(th.Context, bobID), th.CPAGroupID, alicePropertyValue.ID)
		require.NoError(t, err)
		require.NotNil(t, retrieved)
		assert.Equal(t, alicePropertyValue.ID, retrieved.ID)
		var retrievedOptions []string
		jsonErr = json.Unmarshal(retrieved.Value, &retrievedOptions)
		require.NoError(t, jsonErr)
		assert.Len(t, retrievedOptions, 1)
		assert.Contains(t, retrievedOptions, "opt1")
		charlieID := model.NewId()
		charlieValue, jsonErr := json.Marshal([]string{"opt3"})
		require.NoError(t, jsonErr)
		charliePropertyValue := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    field.ID,
			TargetType: "user",
			TargetID:   charlieID,
			Value:      charlieValue,
		}
		_, err = th.service.CreatePropertyValue(rctxTestPlugin, charliePropertyValue)
		require.NoError(t, err)
		retrieved, err = th.service.GetPropertyValue(RequestContextWithCallerID(th.Context, charlieID), th.CPAGroupID, alicePropertyValue.ID)
		require.NoError(t, err)
		assert.Nil(t, retrieved)
	})
	t.Run("shared_only value - caller with no values sees nothing", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "shared-only-no-values",
			Type:       model.PropertyFieldTypeMultiselect,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModeSharedOnly,
				model.PropertyAttrsProtected:  true,
				model.PropertyFieldAttributeOptions: []any{
					map[string]any{"id": "opt1", "value": "Option 1"},
				},
			},
		}
		field, err := th.service.CreatePropertyField(rctxTestPlugin, field)
		require.NoError(t, err)
		user1Value, jsonErr := json.Marshal([]string{"opt1"})
		require.NoError(t, jsonErr)
		value := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    field.ID,
			TargetType: "user",
			TargetID:   userID1,
			Value:      user1Value,
		}
		value, err = th.service.CreatePropertyValue(rctxTestPlugin, value)
		require.NoError(t, err)
		retrieved, err := th.service.GetPropertyValue(rctxUser2, th.CPAGroupID, value.ID)
		require.NoError(t, err)
		assert.Nil(t, retrieved)
	})
	t.Run("non-CPA group routes directly to PropertyService without filtering", func(t *testing.T) {
		nonCpaGroup, err := th.service.RegisterPropertyGroup("other-group-value-read")
		require.NoError(t, err)
		field := &model.PropertyField{
			GroupID:    nonCpaGroup.ID,
			Name:       "non-cpa-value-source-only",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode:     model.PropertyAccessModeSourceOnly,
				model.PropertyAttrsProtected:      true,
				model.PropertyAttrsSourcePluginID: pluginID1,
			},
		}
		created, err := th.service.CreatePropertyField(rctxTestPlugin, field)
		require.NoError(t, err)
		targetID := model.NewId()
		value := &model.PropertyValue{
			GroupID:    nonCpaGroup.ID,
			FieldID:    created.ID,
			TargetType: "user",
			TargetID:   targetID,
			Value:      json.RawMessage(`"visible"`),
		}
		createdValue, err := th.service.CreatePropertyValue(rctxTestPlugin, value)
		require.NoError(t, err)
		rctx2Local := RequestContextWithCallerID(th.Context, "plugin-2")
		retrieved, err := th.service.GetPropertyValue(rctx2Local, nonCpaGroup.ID, createdValue.ID)
		require.NoError(t, err)
		assert.NotNil(t, retrieved)
		rctxUser := RequestContextWithCallerID(th.Context, model.NewId())
		retrievedByUser, err := th.service.GetPropertyValue(rctxUser, nonCpaGroup.ID, createdValue.ID)
		require.NoError(t, err)
		assert.NotNil(t, retrievedByUser)
	})
}
func TestGetPropertyValuesReadAccess(t *testing.T) {
	th := Setup(t).RegisterCPAPropertyGroup(t)
	th.service.setPluginCheckerForTests(func(pluginID string) bool {
		return pluginID == "plugin-1" || pluginID == "test-plugin"
	})
	pluginID1 := "plugin-1"
	pluginID2 := "plugin-2"
	userID := model.NewId()
	rctxAnon := RequestContextWithCallerID(th.Context, "")
	rctx1 := RequestContextWithCallerID(th.Context, pluginID1)
	rctx2 := RequestContextWithCallerID(th.Context, pluginID2)
	rctxUser := RequestContextWithCallerID(th.Context, userID)
	t.Run("mixed access modes - bulk read respects per-field access control", func(t *testing.T) {
		publicField := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "public-field-bulk",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModePublic,
			},
		}
		publicField, err := th.service.CreatePropertyField(rctxAnon, publicField)
		require.NoError(t, err)
		sourceOnlyField := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "source-only-field-bulk",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModeSourceOnly,
				model.PropertyAttrsProtected:  true,
			},
		}
		sourceOnlyField, err = th.service.CreatePropertyField(rctx1, sourceOnlyField)
		require.NoError(t, err)
		publicValue, jsonErr := json.Marshal("public")
		require.NoError(t, jsonErr)
		publicPropValue := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    publicField.ID,
			TargetType: "user",
			TargetID:   userID,
			Value:      publicValue,
		}
		publicPropValue, err = th.service.CreatePropertyValue(rctxAnon, publicPropValue)
		require.NoError(t, err)
		sourceOnlyValue, jsonErr := json.Marshal("secret")
		require.NoError(t, jsonErr)
		sourceOnlyPropValue := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    sourceOnlyField.ID,
			TargetType: "user",
			TargetID:   userID,
			Value:      sourceOnlyValue,
		}
		sourceOnlyPropValue, err = th.service.CreatePropertyValue(rctx1, sourceOnlyPropValue)
		require.NoError(t, err)
		retrieved, err := th.service.GetPropertyValues(rctx1, th.CPAGroupID, []string{publicPropValue.ID, sourceOnlyPropValue.ID})
		require.NoError(t, err)
		assert.Len(t, retrieved, 2)
		retrieved, err = th.service.GetPropertyValues(rctx2, th.CPAGroupID, []string{publicPropValue.ID, sourceOnlyPropValue.ID})
		require.NoError(t, err)
		assert.Len(t, retrieved, 1)
		assert.Equal(t, publicPropValue.ID, retrieved[0].ID)
		retrieved, err = th.service.GetPropertyValues(rctxUser, th.CPAGroupID, []string{publicPropValue.ID, sourceOnlyPropValue.ID})
		require.NoError(t, err)
		assert.Len(t, retrieved, 1)
		assert.Equal(t, publicPropValue.ID, retrieved[0].ID)
	})
}
func TestSearchPropertyValuesReadAccess(t *testing.T) {
	th := Setup(t).RegisterCPAPropertyGroup(t)
	th.service.setPluginCheckerForTests(func(pluginID string) bool {
		return pluginID == "plugin-1" || pluginID == "test-plugin"
	})
	pluginID1 := "plugin-1"
	pluginID2 := "plugin-2"
	userID1 := model.NewId()
	userID2 := model.NewId()
	rctxAnon := RequestContextWithCallerID(th.Context, "")
	rctx1 := RequestContextWithCallerID(th.Context, pluginID1)
	rctx2 := RequestContextWithCallerID(th.Context, pluginID2)
	rctxUser2 := RequestContextWithCallerID(th.Context, userID2)
	rctxTestPlugin := RequestContextWithCallerID(th.Context, "test-plugin")
	t.Run("search filters based on field access", func(t *testing.T) {
		publicField := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "public-field-search",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModePublic,
			},
		}
		publicField, err := th.service.CreatePropertyField(rctxAnon, publicField)
		require.NoError(t, err)
		sourceOnlyField := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "source-only-field-search",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModeSourceOnly,
				model.PropertyAttrsProtected:  true,
			},
		}
		sourceOnlyField, err = th.service.CreatePropertyField(rctx1, sourceOnlyField)
		require.NoError(t, err)
		publicValue, jsonErr := json.Marshal("public data")
		require.NoError(t, jsonErr)
		_, err = th.service.CreatePropertyValue(rctxAnon, &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    publicField.ID,
			TargetType: "user",
			TargetID:   userID1,
			Value:      publicValue,
		})
		require.NoError(t, err)
		sourceOnlyValue, jsonErr := json.Marshal("secret data")
		require.NoError(t, jsonErr)
		_, err = th.service.CreatePropertyValue(rctx1, &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    sourceOnlyField.ID,
			TargetType: "user",
			TargetID:   userID1,
			Value:      sourceOnlyValue,
		})
		require.NoError(t, err)
		results, err := th.service.SearchPropertyValues(rctx1, th.CPAGroupID, model.PropertyValueSearchOpts{
			TargetIDs: []string{userID1},
			PerPage:   100,
		})
		require.NoError(t, err)
		assert.Len(t, results, 2)
		results, err = th.service.SearchPropertyValues(rctx2, th.CPAGroupID, model.PropertyValueSearchOpts{
			TargetIDs: []string{userID1},
			PerPage:   100,
		})
		require.NoError(t, err)
		assert.Len(t, results, 1)
		assert.Equal(t, publicField.ID, results[0].FieldID)
	})
	t.Run("search shared_only values show intersection", func(t *testing.T) {
		sharedField := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "shared-field-search",
			Type:       model.PropertyFieldTypeMultiselect,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModeSharedOnly,
				model.PropertyAttrsProtected:  true,
				model.PropertyFieldAttributeOptions: []any{
					map[string]any{"id": "opt1", "value": "Option 1"},
					map[string]any{"id": "opt2", "value": "Option 2"},
					map[string]any{"id": "opt3", "value": "Option 3"},
				},
			},
		}
		sharedField, err := th.service.CreatePropertyField(rctxTestPlugin, sharedField)
		require.NoError(t, err)
		user1Value, jsonErr := json.Marshal([]string{"opt1", "opt2"})
		require.NoError(t, jsonErr)
		_, err = th.service.CreatePropertyValue(rctxTestPlugin, &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    sharedField.ID,
			TargetType: "user",
			TargetID:   userID1,
			Value:      user1Value,
		})
		require.NoError(t, err)
		user2Value, jsonErr := json.Marshal([]string{"opt1", "opt3"})
		require.NoError(t, jsonErr)
		_, err = th.service.CreatePropertyValue(rctxTestPlugin, &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    sharedField.ID,
			TargetType: "user",
			TargetID:   userID2,
			Value:      user2Value,
		})
		require.NoError(t, err)
		results, err := th.service.SearchPropertyValues(rctxUser2, th.CPAGroupID, model.PropertyValueSearchOpts{
			TargetIDs: []string{userID1},
			FieldID:   sharedField.ID,
			PerPage:   100,
		})
		require.NoError(t, err)
		require.Len(t, results, 1)
		var retrievedOptions []string
		jsonErr = json.Unmarshal(results[0].Value, &retrievedOptions)
		require.NoError(t, jsonErr)
		assert.Len(t, retrievedOptions, 1)
		assert.Contains(t, retrievedOptions, "opt1")
	})
}
func TestCreatePropertyValues_WriteAccessControl(t *testing.T) {
	th := Setup(t).RegisterCPAPropertyGroup(t)
	th.service.setPluginCheckerForTests(func(pluginID string) bool {
		return pluginID == "plugin-1" || pluginID == "test-plugin"
	})
	pluginID1 := "plugin-1"
	pluginID2 := "plugin-2"
	rctxAnon := RequestContextWithCallerID(th.Context, "")
	rctx1 := RequestContextWithCallerID(th.Context, pluginID1)
	rctx2 := RequestContextWithCallerID(th.Context, pluginID2)
	t.Run("allows creating values for public fields", func(t *testing.T) {
		field1 := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "public-field-1",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModePublic,
			},
		}
		field1, err := th.service.CreatePropertyField(rctxAnon, field1)
		require.NoError(t, err)
		field2 := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "public-field-2",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModePublic,
			},
		}
		field2, err = th.service.CreatePropertyField(rctxAnon, field2)
		require.NoError(t, err)
		targetID := model.NewId()
		value1, v1err := json.Marshal("value1")
		require.NoError(t, v1err)
		value2, v2err := json.Marshal("value2")
		require.NoError(t, v2err)
		values := []*model.PropertyValue{
			{
				GroupID:    th.CPAGroupID,
				FieldID:    field1.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      value1,
			},
			{
				GroupID:    th.CPAGroupID,
				FieldID:    field2.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      value2,
			},
		}
		created, cerr := th.service.CreatePropertyValues(rctx2, values)
		require.NoError(t, cerr)
		assert.Len(t, created, 2)
	})
	t.Run("allows source plugin to create values for protected fields", func(t *testing.T) {
		field1 := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "protected-field-1",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModeSourceOnly,
				model.PropertyAttrsProtected:  true,
			},
		}
		field1, err := th.service.CreatePropertyField(rctx1, field1)
		require.NoError(t, err)
		field2 := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "protected-field-2",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModeSourceOnly,
				model.PropertyAttrsProtected:  true,
			},
		}
		field2, err = th.service.CreatePropertyField(rctx1, field2)
		require.NoError(t, err)
		targetID := model.NewId()
		value1, v1err := json.Marshal("secret1")
		require.NoError(t, v1err)
		value2, v2err := json.Marshal("secret2")
		require.NoError(t, v2err)
		values := []*model.PropertyValue{
			{
				GroupID:    th.CPAGroupID,
				FieldID:    field1.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      value1,
			},
			{
				GroupID:    th.CPAGroupID,
				FieldID:    field2.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      value2,
			},
		}
		created, cerr := th.service.CreatePropertyValues(rctx1, values)
		require.NoError(t, cerr)
		assert.Len(t, created, 2)
	})
	t.Run("fails atomically when one protected field in batch", func(t *testing.T) {
		publicField := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "public-field-batch",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModePublic,
			},
		}
		publicField, err := th.service.CreatePropertyField(rctxAnon, publicField)
		require.NoError(t, err)
		protectedField := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "protected-field-batch",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModeSourceOnly,
				model.PropertyAttrsProtected:  true,
			},
		}
		protectedField, err = th.service.CreatePropertyField(rctx1, protectedField)
		require.NoError(t, err)
		targetID := model.NewId()
		publicValue, jsonErr := json.Marshal("public data")
		require.NoError(t, jsonErr)
		protectedValue, jsonErr := json.Marshal("secret data")
		require.NoError(t, jsonErr)
		values := []*model.PropertyValue{
			{
				GroupID:    th.CPAGroupID,
				FieldID:    publicField.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      publicValue,
			},
			{
				GroupID:    th.CPAGroupID,
				FieldID:    protectedField.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      protectedValue,
			},
		}
		created, err := th.service.CreatePropertyValues(rctx2, values)
		require.Error(t, err)
		assert.Nil(t, created)
		assert.Contains(t, err.Error(), "protected")
		results, err := th.service.SearchPropertyValues(rctx1, th.CPAGroupID, model.PropertyValueSearchOpts{
			TargetIDs: []string{targetID},
			PerPage:   100,
		})
		require.NoError(t, err)
		assert.Empty(t, results)
	})
	t.Run("rejects values across multiple groups", func(t *testing.T) {
		group2, err := th.service.RegisterPropertyGroup("test-group-create-values-2")
		require.NoError(t, err)
		field1 := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "field-group1",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModePublic,
			},
		}
		field1, err = th.service.CreatePropertyField(rctxAnon, field1)
		require.NoError(t, err)
		field2 := &model.PropertyField{
			GroupID:    group2.ID,
			Name:       "field-group2",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModePublic,
			},
		}
		field2, err = th.service.CreatePropertyField(rctxAnon, field2)
		require.NoError(t, err)
		targetID := model.NewId()
		value1, jsonErr := json.Marshal("data from group 1")
		require.NoError(t, jsonErr)
		value2, jsonErr := json.Marshal("data from group 2")
		require.NoError(t, jsonErr)
		values := []*model.PropertyValue{
			{
				GroupID:    th.CPAGroupID,
				FieldID:    field1.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      value1,
			},
			{
				GroupID:    group2.ID,
				FieldID:    field2.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      value2,
			},
		}
		created, err := th.service.CreatePropertyValues(rctx2, values)
		require.Error(t, err)
		assert.Nil(t, created)
		assert.Contains(t, err.Error(), "mixed group IDs in batch")
	})
	t.Run("rejects mixed groups before checking access control", func(t *testing.T) {
		group3, err := th.service.RegisterPropertyGroup("test-group-create-values-3")
		require.NoError(t, err)
		publicField := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "public-field-multigroup",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModePublic,
			},
		}
		publicField, err = th.service.CreatePropertyField(rctxAnon, publicField)
		require.NoError(t, err)
		protectedField := &model.PropertyField{
			GroupID:    group3.ID,
			Name:       "protected-field-multigroup",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsAccessMode: model.PropertyAccessModeSourceOnly,
				model.PropertyAttrsProtected:  true,
			},
		}
		protectedField, err = th.service.CreatePropertyField(rctx1, protectedField)
		require.NoError(t, err)
		targetID := model.NewId()
		publicValue, jsonErr := json.Marshal("public data")
		require.NoError(t, jsonErr)
		protectedValue, jsonErr := json.Marshal("secret data")
		require.NoError(t, jsonErr)
		values := []*model.PropertyValue{
			{
				GroupID:    th.CPAGroupID,
				FieldID:    publicField.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      publicValue,
			},
			{
				GroupID:    group3.ID,
				FieldID:    protectedField.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      protectedValue,
			},
		}
		created, err := th.service.CreatePropertyValues(rctx2, values)
		require.Error(t, err)
		assert.Nil(t, created)
		assert.Contains(t, err.Error(), "mixed group IDs in batch")
	})
	t.Run("non-CPA group routes directly to PropertyService without access control", func(t *testing.T) {
		nonCpaGroup, err := th.service.RegisterPropertyGroup("other-group-bulk")
		require.NoError(t, err)
		field1 := &model.PropertyField{
			GroupID:    nonCpaGroup.ID,
			Name:       "non-cpa-bulk-field-1",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
		}
		field2 := &model.PropertyField{
			GroupID:    nonCpaGroup.ID,
			Name:       "non-cpa-bulk-field-2",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
		}
		created1, err := th.service.CreatePropertyField(rctx1, field1)
		require.NoError(t, err)
		created2, err := th.service.CreatePropertyField(rctx1, field2)
		require.NoError(t, err)
		targetID := model.NewId()
		values := []*model.PropertyValue{
			{
				GroupID:    nonCpaGroup.ID,
				FieldID:    created1.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      json.RawMessage(`"value1"`),
			},
			{
				GroupID:    nonCpaGroup.ID,
				FieldID:    created2.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      json.RawMessage(`"value2"`),
			},
		}
		createdValues, err := th.service.CreatePropertyValues(rctx2, values)
		require.NoError(t, err)
		assert.Len(t, createdValues, 2)
	})
	t.Run("mixed CPA and non-CPA groups are rejected before access control", func(t *testing.T) {
		nonCpaGroup, err := th.service.RegisterPropertyGroup("other-group-mixed")
		require.NoError(t, err)
		cpaField := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "cpa-protected-mixed",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		cpaField, err = th.service.CreatePropertyField(rctx1, cpaField)
		require.NoError(t, err)
		nonCpaField := &model.PropertyField{
			GroupID:    nonCpaGroup.ID,
			Name:       "non-cpa-field-mixed",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
		}
		nonCpaField, err = th.service.CreatePropertyField(rctx1, nonCpaField)
		require.NoError(t, err)
		targetID := model.NewId()
		values := []*model.PropertyValue{
			{
				GroupID:    th.CPAGroupID,
				FieldID:    cpaField.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      json.RawMessage(`"cpa data"`),
			},
			{
				GroupID:    nonCpaGroup.ID,
				FieldID:    nonCpaField.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      json.RawMessage(`"non-cpa data"`),
			},
		}
		created, err := th.service.CreatePropertyValues(rctx2, values)
		require.Error(t, err)
		assert.Nil(t, created)
		assert.Contains(t, err.Error(), "mixed group IDs in batch")
	})
}
func TestUpdatePropertyValue_WriteAccessControl(t *testing.T) {
	th := Setup(t).RegisterCPAPropertyGroup(t)
	th.service.setPluginCheckerForTests(func(pluginID string) bool { return pluginID == "plugin-1" })
	rctxPlugin1 := RequestContextWithCallerID(th.Context, "plugin-1")
	rctxPlugin2 := RequestContextWithCallerID(th.Context, "plugin-2")
	rctxAnon := RequestContextWithCallerID(th.Context, "")
	t.Run("source plugin can update values for protected field", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "protected-field-for-update",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		created, err := th.service.CreatePropertyField(rctxPlugin1, field)
		require.NoError(t, err)
		value := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    created.ID,
			TargetType: "user",
			TargetID:   model.NewId(),
			Value:      json.RawMessage(`"original"`),
		}
		createdValue, err := th.service.CreatePropertyValue(rctxPlugin1, value)
		require.NoError(t, err)
		createdValue.Value = json.RawMessage(`"updated"`)
		updated, err := th.service.UpdatePropertyValue(rctxPlugin1, th.CPAGroupID, createdValue)
		require.NoError(t, err)
		assert.NotNil(t, updated)
		assert.Equal(t, `"updated"`, string(updated.Value))
	})
	t.Run("non-source plugin cannot update values for protected field", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "protected-field-for-update-2",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		created, err := th.service.CreatePropertyField(rctxPlugin1, field)
		require.NoError(t, err)
		value := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    created.ID,
			TargetType: "user",
			TargetID:   model.NewId(),
			Value:      json.RawMessage(`"original"`),
		}
		createdValue, err := th.service.CreatePropertyValue(rctxPlugin1, value)
		require.NoError(t, err)
		createdValue.Value = json.RawMessage(`"hacked"`)
		updated, err := th.service.UpdatePropertyValue(rctxPlugin2, th.CPAGroupID, createdValue)
		require.Error(t, err)
		assert.Nil(t, updated)
		assert.Contains(t, err.Error(), "protected")
	})
	t.Run("any caller can update values for non-protected field", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "public-field-for-update",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
		}
		created, err := th.service.CreatePropertyField(rctxAnon, field)
		require.NoError(t, err)
		value := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    created.ID,
			TargetType: "user",
			TargetID:   model.NewId(),
			Value:      json.RawMessage(`"original"`),
		}
		createdValue, err := th.service.CreatePropertyValue(rctxPlugin1, value)
		require.NoError(t, err)
		createdValue.Value = json.RawMessage(`"updated by plugin2"`)
		updated, err := th.service.UpdatePropertyValue(rctxPlugin2, th.CPAGroupID, createdValue)
		require.NoError(t, err)
		assert.NotNil(t, updated)
		assert.Equal(t, `"updated by plugin2"`, string(updated.Value))
	})
}
func TestUpdatePropertyValues_WriteAccessControl(t *testing.T) {
	th := Setup(t).RegisterCPAPropertyGroup(t)
	th.service.setPluginCheckerForTests(func(pluginID string) bool {
		return pluginID == "plugin-1" || pluginID == "plugin-2"
	})
	pluginID1 := "plugin-1"
	pluginID2 := "plugin-2"
	rctx1 := RequestContextWithCallerID(th.Context, pluginID1)
	rctx2 := RequestContextWithCallerID(th.Context, pluginID2)
	rctxAnon := RequestContextWithCallerID(th.Context, "")
	t.Run("source plugin can update multiple values atomically", func(t *testing.T) {
		field1 := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "bulk-update-field-1",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		field2 := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "bulk-update-field-2",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		created1, err := th.service.CreatePropertyField(rctx1, field1)
		require.NoError(t, err)
		created2, err := th.service.CreatePropertyField(rctx1, field2)
		require.NoError(t, err)
		targetID := model.NewId()
		value1 := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    created1.ID,
			TargetType: "user",
			TargetID:   targetID,
			Value:      json.RawMessage(`"value1"`),
		}
		value2 := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    created2.ID,
			TargetType: "user",
			TargetID:   targetID,
			Value:      json.RawMessage(`"value2"`),
		}
		createdValues, err := th.service.CreatePropertyValues(rctx1, []*model.PropertyValue{value1, value2})
		require.NoError(t, err)
		require.Len(t, createdValues, 2)
		createdValues[0].Value = json.RawMessage(`"updated1"`)
		createdValues[1].Value = json.RawMessage(`"updated2"`)
		updated, err := th.service.UpdatePropertyValues(rctx1, th.CPAGroupID, createdValues)
		require.NoError(t, err)
		assert.Len(t, updated, 2)
	})
	t.Run("non-source plugin cannot update values atomically", func(t *testing.T) {
		field1 := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "bulk-update-fail-1",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		field2 := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "bulk-update-fail-2",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		created1, err := th.service.CreatePropertyField(rctx1, field1)
		require.NoError(t, err)
		created2, err := th.service.CreatePropertyField(rctx1, field2)
		require.NoError(t, err)
		targetID := model.NewId()
		value1 := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    created1.ID,
			TargetType: "user",
			TargetID:   targetID,
			Value:      json.RawMessage(`"value1"`),
		}
		value2 := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    created2.ID,
			TargetType: "user",
			TargetID:   targetID,
			Value:      json.RawMessage(`"value2"`),
		}
		createdValues, err := th.service.CreatePropertyValues(rctx1, []*model.PropertyValue{value1, value2})
		require.NoError(t, err)
		require.Len(t, createdValues, 2)
		createdValues[0].Value = json.RawMessage(`"hacked1"`)
		createdValues[1].Value = json.RawMessage(`"hacked2"`)
		updated, err := th.service.UpdatePropertyValues(rctx2, th.CPAGroupID, createdValues)
		require.Error(t, err)
		assert.Nil(t, updated)
		assert.Contains(t, err.Error(), "protected")
		retrieved, err := th.service.GetPropertyValues(rctx1, th.CPAGroupID, []string{createdValues[0].ID, createdValues[1].ID})
		require.NoError(t, err)
		assert.Equal(t, `"value1"`, string(retrieved[0].Value))
		assert.Equal(t, `"value2"`, string(retrieved[1].Value))
	})
	t.Run("mixed protected and non-protected fields - enforces access control only on protected fields", func(t *testing.T) {
		protectedField := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "mixed-update-protected-field",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		publicField := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "mixed-update-public-field",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
		}
		createdProtected, err := th.service.CreatePropertyField(rctx1, protectedField)
		require.NoError(t, err)
		createdPublic, err := th.service.CreatePropertyField(rctxAnon, publicField)
		require.NoError(t, err)
		targetID := model.NewId()
		protectedValue := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    createdProtected.ID,
			TargetType: "user",
			TargetID:   targetID,
			Value:      json.RawMessage(`"protected value"`),
		}
		publicValue := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    createdPublic.ID,
			TargetType: "user",
			TargetID:   targetID,
			Value:      json.RawMessage(`"public value"`),
		}
		createdValues, err := th.service.CreatePropertyValues(rctx1, []*model.PropertyValue{protectedValue, publicValue})
		require.NoError(t, err)
		require.Len(t, createdValues, 2)
		createdValues[0].Value = json.RawMessage(`"hacked protected"`)
		createdValues[1].Value = json.RawMessage(`"hacked public"`)
		updated, err := th.service.UpdatePropertyValues(rctx2, th.CPAGroupID, createdValues)
		require.Error(t, err)
		assert.Nil(t, updated)
		assert.Contains(t, err.Error(), "protected")
		retrieved, err := th.service.GetPropertyValues(rctx1, th.CPAGroupID, []string{createdValues[0].ID, createdValues[1].ID})
		require.NoError(t, err)
		assert.Equal(t, `"protected value"`, string(retrieved[0].Value))
		assert.Equal(t, `"public value"`, string(retrieved[1].Value))
		createdValues[0].Value = json.RawMessage(`"updated protected"`)
		createdValues[1].Value = json.RawMessage(`"updated public"`)
		updated, err = th.service.UpdatePropertyValues(rctx1, th.CPAGroupID, createdValues)
		require.NoError(t, err)
		assert.Len(t, updated, 2)
		assert.Equal(t, `"updated protected"`, string(updated[0].Value))
		assert.Equal(t, `"updated public"`, string(updated[1].Value))
	})
	t.Run("multiple protected fields with different owners - enforces access control atomically", func(t *testing.T) {
		field1 := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "multi-owner-field-1",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		field2 := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "multi-owner-field-2",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		createdField1, err := th.service.CreatePropertyField(rctx1, field1)
		require.NoError(t, err)
		createdField2, err := th.service.CreatePropertyField(rctx2, field2)
		require.NoError(t, err)
		targetID := model.NewId()
		value1 := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    createdField1.ID,
			TargetType: "user",
			TargetID:   targetID,
			Value:      json.RawMessage(`"value from plugin1"`),
		}
		value2 := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    createdField2.ID,
			TargetType: "user",
			TargetID:   targetID,
			Value:      json.RawMessage(`"value from plugin2"`),
		}
		createdValue1, err := th.service.CreatePropertyValue(rctx1, value1)
		require.NoError(t, err)
		createdValue2, err := th.service.CreatePropertyValue(rctx2, value2)
		require.NoError(t, err)
		createdValue1.Value = json.RawMessage(`"updated by plugin1"`)
		createdValue2.Value = json.RawMessage(`"hacked by plugin1"`)
		updated, err := th.service.UpdatePropertyValues(rctx1, th.CPAGroupID, []*model.PropertyValue{createdValue1, createdValue2})
		require.Error(t, err)
		assert.Nil(t, updated)
		assert.Contains(t, err.Error(), "protected")
		retrieved, err := th.service.GetPropertyValues(rctx1, th.CPAGroupID, []string{createdValue1.ID, createdValue2.ID})
		require.NoError(t, err)
		assert.Equal(t, `"value from plugin1"`, string(retrieved[0].Value))
		assert.Equal(t, `"value from plugin2"`, string(retrieved[1].Value))
		createdValue1.Value = json.RawMessage(`"hacked by plugin2"`)
		createdValue2.Value = json.RawMessage(`"updated by plugin2"`)
		updated, err = th.service.UpdatePropertyValues(rctx2, th.CPAGroupID, []*model.PropertyValue{createdValue1, createdValue2})
		require.Error(t, err)
		assert.Nil(t, updated)
		assert.Contains(t, err.Error(), "protected")
		retrieved, err = th.service.GetPropertyValues(rctx1, th.CPAGroupID, []string{createdValue1.ID, createdValue2.ID})
		require.NoError(t, err)
		assert.Equal(t, `"value from plugin1"`, string(retrieved[0].Value))
		assert.Equal(t, `"value from plugin2"`, string(retrieved[1].Value))
		createdValue1.Value = json.RawMessage(`"plugin-1 updated its own"`)
		updated1, err := th.service.UpdatePropertyValue(rctx1, th.CPAGroupID, createdValue1)
		require.NoError(t, err)
		assert.Equal(t, `"plugin-1 updated its own"`, string(updated1.Value))
		createdValue2.Value = json.RawMessage(`"plugin-2 updated its own"`)
		updated2, err := th.service.UpdatePropertyValue(rctx2, th.CPAGroupID, createdValue2)
		require.NoError(t, err)
		assert.Equal(t, `"plugin-2 updated its own"`, string(updated2.Value))
	})
}
func TestUpsertPropertyValue_WriteAccessControl(t *testing.T) {
	th := Setup(t).RegisterCPAPropertyGroup(t)
	th.service.setPluginCheckerForTests(func(pluginID string) bool { return pluginID == "plugin-1" })
	rctxPlugin1 := RequestContextWithCallerID(th.Context, "plugin-1")
	rctxPlugin2 := RequestContextWithCallerID(th.Context, "plugin-2")
	t.Run("source plugin can upsert value for protected field", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "upsert-protected-field",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		created, err := th.service.CreatePropertyField(rctxPlugin1, field)
		require.NoError(t, err)
		targetID := model.NewId()
		value := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    created.ID,
			TargetType: "user",
			TargetID:   targetID,
			Value:      json.RawMessage(`"first"`),
		}
		upserted, err := th.service.UpsertPropertyValue(rctxPlugin1, value)
		require.NoError(t, err)
		assert.NotNil(t, upserted)
		value.Value = json.RawMessage(`"second"`)
		upserted2, err := th.service.UpsertPropertyValue(rctxPlugin1, value)
		require.NoError(t, err)
		assert.Equal(t, `"second"`, string(upserted2.Value))
	})
	t.Run("non-source plugin cannot upsert value for protected field", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "upsert-protected-field-2",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		created, err := th.service.CreatePropertyField(rctxPlugin1, field)
		require.NoError(t, err)
		value := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    created.ID,
			TargetType: "user",
			TargetID:   model.NewId(),
			Value:      json.RawMessage(`"unauthorized"`),
		}
		upserted, err := th.service.UpsertPropertyValue(rctxPlugin2, value)
		require.Error(t, err)
		assert.Nil(t, upserted)
		assert.Contains(t, err.Error(), "protected")
	})
}
func TestUpsertPropertyValues_WriteAccessControl(t *testing.T) {
	th := Setup(t).RegisterCPAPropertyGroup(t)
	th.service.setPluginCheckerForTests(func(pluginID string) bool {
		return pluginID == "plugin-1" || pluginID == "plugin-2"
	})
	pluginID1 := "plugin-1"
	pluginID2 := "plugin-2"
	rctx1 := RequestContextWithCallerID(th.Context, pluginID1)
	rctx2 := RequestContextWithCallerID(th.Context, pluginID2)
	rctxAnon := RequestContextWithCallerID(th.Context, "")
	t.Run("source plugin can bulk upsert values for protected fields", func(t *testing.T) {
		field1 := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "bulk-upsert-field-1",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		field2 := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "bulk-upsert-field-2",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		created1, err := th.service.CreatePropertyField(rctx1, field1)
		require.NoError(t, err)
		created2, err := th.service.CreatePropertyField(rctx1, field2)
		require.NoError(t, err)
		targetID := model.NewId()
		values := []*model.PropertyValue{
			{
				GroupID:    th.CPAGroupID,
				FieldID:    created1.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      json.RawMessage(`"upsert1"`),
			},
			{
				GroupID:    th.CPAGroupID,
				FieldID:    created2.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      json.RawMessage(`"upsert2"`),
			},
		}
		upserted, err := th.service.UpsertPropertyValues(rctx1, values)
		require.NoError(t, err)
		assert.Len(t, upserted, 2)
	})
	t.Run("non-source plugin cannot bulk upsert values atomically", func(t *testing.T) {
		field1 := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "bulk-upsert-fail-1",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		field2 := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "bulk-upsert-fail-2",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		created1, err := th.service.CreatePropertyField(rctx1, field1)
		require.NoError(t, err)
		created2, err := th.service.CreatePropertyField(rctx1, field2)
		require.NoError(t, err)
		targetID := model.NewId()
		values := []*model.PropertyValue{
			{
				GroupID:    th.CPAGroupID,
				FieldID:    created1.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      json.RawMessage(`"unauthorized1"`),
			},
			{
				GroupID:    th.CPAGroupID,
				FieldID:    created2.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      json.RawMessage(`"unauthorized2"`),
			},
		}
		upserted, err := th.service.UpsertPropertyValues(rctx2, values)
		require.Error(t, err)
		assert.Nil(t, upserted)
		assert.Contains(t, err.Error(), "protected")
		retrieved, err := th.service.SearchPropertyValues(rctx1, th.CPAGroupID, model.PropertyValueSearchOpts{
			TargetIDs: []string{targetID},
			PerPage:   100,
		})
		require.NoError(t, err)
		assert.Empty(t, retrieved)
	})
	t.Run("mixed protected and non-protected fields - enforces access control only on protected fields", func(t *testing.T) {
		protectedField := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "mixed-protected-field",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		publicField := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "mixed-public-field",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
		}
		createdProtected, err := th.service.CreatePropertyField(rctx1, protectedField)
		require.NoError(t, err)
		createdPublic, err := th.service.CreatePropertyField(rctxAnon, publicField)
		require.NoError(t, err)
		targetID := model.NewId()
		values := []*model.PropertyValue{
			{
				GroupID:    th.CPAGroupID,
				FieldID:    createdProtected.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      json.RawMessage(`"protected value"`),
			},
			{
				GroupID:    th.CPAGroupID,
				FieldID:    createdPublic.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      json.RawMessage(`"public value"`),
			},
		}
		upserted, err := th.service.UpsertPropertyValues(rctx2, values)
		require.Error(t, err)
		assert.Nil(t, upserted)
		assert.Contains(t, err.Error(), "protected")
		retrieved, err := th.service.SearchPropertyValues(rctx1, th.CPAGroupID, model.PropertyValueSearchOpts{
			TargetIDs: []string{targetID},
			PerPage:   100,
		})
		require.NoError(t, err)
		assert.Empty(t, retrieved)
		upserted, err = th.service.UpsertPropertyValues(rctx1, values)
		require.NoError(t, err)
		assert.Len(t, upserted, 2)
	})
	t.Run("multiple protected fields with different owners - enforces access control atomically", func(t *testing.T) {
		field1 := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "upsert-multi-owner-field-1",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		field2 := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "upsert-multi-owner-field-2",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		createdField1, err := th.service.CreatePropertyField(rctx1, field1)
		require.NoError(t, err)
		createdField2, err := th.service.CreatePropertyField(rctx2, field2)
		require.NoError(t, err)
		targetID := model.NewId()
		values := []*model.PropertyValue{
			{
				GroupID:    th.CPAGroupID,
				FieldID:    createdField1.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      json.RawMessage(`"value from plugin1"`),
			},
			{
				GroupID:    th.CPAGroupID,
				FieldID:    createdField2.ID,
				TargetType: "user",
				TargetID:   targetID,
				Value:      json.RawMessage(`"hacked by plugin1"`),
			},
		}
		upserted, err := th.service.UpsertPropertyValues(rctx1, values)
		require.Error(t, err)
		assert.Nil(t, upserted)
		assert.Contains(t, err.Error(), "protected")
		retrieved, err := th.service.SearchPropertyValues(rctx1, th.CPAGroupID, model.PropertyValueSearchOpts{
			TargetIDs: []string{targetID},
			PerPage:   100,
		})
		require.NoError(t, err)
		assert.Empty(t, retrieved)
		values[0].Value = json.RawMessage(`"hacked by plugin2"`)
		values[1].Value = json.RawMessage(`"value from plugin2"`)
		upserted, err = th.service.UpsertPropertyValues(rctx2, values)
		require.Error(t, err)
		assert.Nil(t, upserted)
		assert.Contains(t, err.Error(), "protected")
		retrieved, err = th.service.SearchPropertyValues(rctx1, th.CPAGroupID, model.PropertyValueSearchOpts{
			TargetIDs: []string{targetID},
			PerPage:   100,
		})
		require.NoError(t, err)
		assert.Empty(t, retrieved)
		upserted1, err := th.service.UpsertPropertyValue(rctx1, &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    createdField1.ID,
			TargetType: "user",
			TargetID:   targetID,
			Value:      json.RawMessage(`"plugin-1 upserted its own"`),
		})
		require.NoError(t, err)
		assert.Equal(t, `"plugin-1 upserted its own"`, string(upserted1.Value))
		upserted2, err := th.service.UpsertPropertyValue(rctx2, &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    createdField2.ID,
			TargetType: "user",
			TargetID:   targetID,
			Value:      json.RawMessage(`"plugin-2 upserted its own"`),
		})
		require.NoError(t, err)
		assert.Equal(t, `"plugin-2 upserted its own"`, string(upserted2.Value))
	})
}
func TestDeletePropertyValuesForField_WriteAccessControl(t *testing.T) {
	th := Setup(t).RegisterCPAPropertyGroup(t)
	th.service.setPluginCheckerForTests(func(pluginID string) bool { return pluginID == "plugin-1" })
	rctxPlugin1 := RequestContextWithCallerID(th.Context, "plugin-1")
	rctxPlugin2 := RequestContextWithCallerID(th.Context, "plugin-2")
	rctxAnon := RequestContextWithCallerID(th.Context, "")
	t.Run("source plugin can delete all values for protected field", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "field-delete-values",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		created, err := th.service.CreatePropertyField(rctxPlugin1, field)
		require.NoError(t, err)
		targetID1 := model.NewId()
		targetID2 := model.NewId()
		values := []*model.PropertyValue{
			{
				GroupID:    th.CPAGroupID,
				FieldID:    created.ID,
				TargetType: "user",
				TargetID:   targetID1,
				Value:      json.RawMessage(`"value1"`),
			},
			{
				GroupID:    th.CPAGroupID,
				FieldID:    created.ID,
				TargetType: "user",
				TargetID:   targetID2,
				Value:      json.RawMessage(`"value2"`),
			},
		}
		_, err = th.service.CreatePropertyValues(rctxPlugin1, values)
		require.NoError(t, err)
		err = th.service.DeletePropertyValuesForField(rctxPlugin1, th.CPAGroupID, created.ID)
		require.NoError(t, err)
		retrieved, err := th.service.SearchPropertyValues(rctxPlugin1, th.CPAGroupID, model.PropertyValueSearchOpts{
			FieldID: created.ID,
			PerPage: 100,
		})
		require.NoError(t, err)
		assert.Empty(t, retrieved)
	})
	t.Run("non-source plugin cannot delete values for protected field", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "field-delete-values-fail",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
			Attrs: model.StringInterface{
				model.PropertyAttrsProtected: true,
			},
		}
		created, err := th.service.CreatePropertyField(rctxPlugin1, field)
		require.NoError(t, err)
		value := &model.PropertyValue{
			GroupID:    th.CPAGroupID,
			FieldID:    created.ID,
			TargetType: "user",
			TargetID:   model.NewId(),
			Value:      json.RawMessage(`"protected value"`),
		}
		_, err = th.service.CreatePropertyValue(rctxPlugin1, value)
		require.NoError(t, err)
		err = th.service.DeletePropertyValuesForField(rctxPlugin2, th.CPAGroupID, created.ID)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "protected")
		retrieved, err := th.service.SearchPropertyValues(rctxPlugin1, th.CPAGroupID, model.PropertyValueSearchOpts{
			FieldID: created.ID,
			PerPage: 100,
		})
		require.NoError(t, err)
		assert.Len(t, retrieved, 1)
	})
	t.Run("any caller can delete values for non-protected field", func(t *testing.T) {
		field := &model.PropertyField{
			GroupID:    th.CPAGroupID,
			Name:       "public-field-delete-values",
			Type:       model.PropertyFieldTypeText,
			TargetType: "user",
		}
		created, err := th.service.CreatePropertyField(rctxAnon, field)
		require.NoError(t, err)
		values := []*model.PropertyValue{
			{
				GroupID:    th.CPAGroupID,
				FieldID:    created.ID,
				TargetType: "user",
				TargetID:   model.NewId(),
				Value:      json.RawMessage(`"value1"`),
			},
			{
				GroupID:    th.CPAGroupID,
				FieldID:    created.ID,
				TargetType: "user",
				TargetID:   model.NewId(),
				Value:      json.RawMessage(`"value2"`),
			},
		}
		_, err = th.service.CreatePropertyValues(rctxPlugin1, values)
		require.NoError(t, err)
		err = th.service.DeletePropertyValuesForField(rctxPlugin2, th.CPAGroupID, created.ID)
		require.NoError(t, err)
		retrieved, err := th.service.SearchPropertyValues(rctxPlugin2, th.CPAGroupID, model.PropertyValueSearchOpts{
			FieldID: created.ID,
			PerPage: 100,
		})
		require.NoError(t, err)
		assert.Empty(t, retrieved)
	})
}
func TestCreatePropertyValue(t *testing.T) {
	th := Setup(t).RegisterCPAPropertyGroup(t)
	t.Run("nil value returns error", func(t *testing.T) {
		_, err := th.service.CreatePropertyValue(th.Context, nil)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "CreatePropertyValue: value cannot be nil")
	})
}
func TestCreatePropertyValues(t *testing.T) {
	th := Setup(t).RegisterCPAPropertyGroup(t)
	t.Run("nil element returns error", func(t *testing.T) {
		values := []*model.PropertyValue{
			{GroupID: model.NewId()},
			nil,
		}
		_, err := th.service.CreatePropertyValues(th.Context, values)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "CreatePropertyValues: nil element at index 1")
	})
	t.Run("mixed group IDs returns error", func(t *testing.T) {
		values := []*model.PropertyValue{
			{GroupID: model.NewId()},
			{GroupID: model.NewId()},
		}
		_, err := th.service.CreatePropertyValues(th.Context, values)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "CreatePropertyValues: mixed group IDs in batch")
	})
}
func TestUpsertPropertyValue(t *testing.T) {
	th := Setup(t).RegisterCPAPropertyGroup(t)
	t.Run("nil value returns error", func(t *testing.T) {
		_, err := th.service.UpsertPropertyValue(th.Context, nil)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "UpsertPropertyValue: value cannot be nil")
	})
}
func TestUpsertPropertyValues(t *testing.T) {
	th := Setup(t).RegisterCPAPropertyGroup(t)
	t.Run("nil element returns error", func(t *testing.T) {
		values := []*model.PropertyValue{
			{GroupID: model.NewId()},
			nil,
		}
		_, err := th.service.UpsertPropertyValues(th.Context, values)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "UpsertPropertyValues: nil element at index 1")
	})
	t.Run("mixed group IDs returns error", func(t *testing.T) {
		values := []*model.PropertyValue{
			{GroupID: model.NewId()},
			{GroupID: model.NewId()},
		}
		_, err := th.service.UpsertPropertyValues(th.Context, values)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "UpsertPropertyValues: mixed group IDs in batch")
	})
}