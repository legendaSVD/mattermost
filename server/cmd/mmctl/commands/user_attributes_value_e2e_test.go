package commands
import (
	"encoding/json"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/spf13/cobra"
	"github.com/mattermost/mattermost/server/v8/cmd/mmctl/printer"
)
func (s *MmctlE2ETestSuite) cleanCPAValuesForUser(userID string) {
	existingValues, appErr := s.th.App.ListCPAValues(nil, userID)
	s.Require().Nil(appErr)
	updates := make(map[string]json.RawMessage)
	for _, value := range existingValues {
		updates[value.FieldID] = json.RawMessage("null")
	}
	if len(updates) > 0 {
		_, appErr = s.th.App.PatchCPAValues(nil, userID, updates, false)
		s.Require().Nil(appErr)
	}
}
func (s *MmctlE2ETestSuite) TestCPAValueList() {
	s.SetupEnterpriseTestHelper().InitBasic(s.T())
	s.th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterprise))
	s.Run("List CPA values with no values", func() {
		c := s.th.SystemAdminClient
		printer.Clean()
		s.cleanCPAFields()
		s.cleanCPAValuesForUser(s.th.BasicUser.Id)
		err := cpaValueListCmdF(c, &cobra.Command{}, []string{s.th.BasicUser.Email})
		s.Require().Nil(err)
		s.Require().Len(printer.GetLines(), 0)
		s.Require().Len(printer.GetErrorLines(), 0)
	})
	s.Run("List CPA values with existing values", func() {
		c := s.th.SystemAdminClient
		printer.Clean()
		s.cleanCPAFields()
		s.cleanCPAValuesForUser(s.th.BasicUser.Id)
		textField := &model.CPAField{
			PropertyField: model.PropertyField{
				Name:       "Department",
				Type:       model.PropertyFieldTypeText,
				TargetType: "user",
			},
			Attrs: model.CPAAttrs{
				Managed: "",
			},
		}
		createdField, appErr := s.th.App.CreateCPAField(nil, textField)
		s.Require().Nil(appErr)
		updates := map[string]json.RawMessage{
			createdField.ID: json.RawMessage(`"Engineering"`),
		}
		_, appErr = s.th.App.PatchCPAValues(nil, s.th.BasicUser.Id, updates, false)
		s.Require().Nil(appErr)
		printer.SetFormat(printer.FormatPlain)
		err := cpaValueListCmdF(c, &cobra.Command{}, []string{s.th.BasicUser.Email})
		s.Require().Nil(err)
		s.Require().Len(printer.GetLines(), 1)
		s.Require().Len(printer.GetErrorLines(), 0)
		output := printer.GetLines()[0].(string)
		s.Require().Equal("Department (text): Engineering", output)
		printer.Clean()
		printer.SetFormat(printer.FormatJSON)
		err = cpaValueListCmdF(c, &cobra.Command{}, []string{s.th.BasicUser.Email})
		s.Require().Nil(err)
		s.Require().Len(printer.GetLines(), 1)
		s.Require().Len(printer.GetErrorLines(), 0)
		outputMap := printer.GetLines()[0].(map[string]any)
		s.Require().Contains(outputMap, createdField.ID)
		s.Require().Equal(`"Engineering"`, string(outputMap[createdField.ID].(json.RawMessage)))
	})
}
func (s *MmctlE2ETestSuite) TestCPAValueSet() {
	s.SetupEnterpriseTestHelper().InitBasic(s.T())
	s.th.App.Srv().SetLicense(model.NewTestLicenseSKU(model.LicenseShortSkuEnterprise))
	s.Run("Set value for text type field", func() {
		c := s.th.SystemAdminClient
		printer.Clean()
		s.cleanCPAFields()
		s.cleanCPAValuesForUser(s.th.BasicUser.Id)
		textField := &model.CPAField{
			PropertyField: model.PropertyField{
				Name:       "Department",
				Type:       model.PropertyFieldTypeText,
				TargetType: "user",
			},
			Attrs: model.CPAAttrs{
				Managed: "",
			},
		}
		createdField, appErr := s.th.App.CreateCPAField(nil, textField)
		s.Require().Nil(appErr)
		cmd := &cobra.Command{}
		cmd.Flags().StringSlice("value", []string{}, "")
		err := cmd.Flags().Set("value", "Engineering")
		s.Require().Nil(err)
		err = cpaValueSetCmdF(c, cmd, []string{s.th.BasicUser.Email, createdField.ID})
		s.Require().Nil(err)
		values, appErr := s.th.App.ListCPAValues(nil, s.th.BasicUser.Id)
		s.Require().Nil(appErr)
		s.Require().Len(values, 1)
		s.Require().Equal(createdField.ID, values[0].FieldID)
		s.Require().Equal(`"Engineering"`, string(values[0].Value))
	})
	s.Run("Set value for select type field", func() {
		c := s.th.SystemAdminClient
		printer.Clean()
		s.cleanCPAFields()
		s.cleanCPAValuesForUser(s.th.BasicUser.Id)
		selectField := &model.CPAField{
			PropertyField: model.PropertyField{
				Name:       "Level",
				Type:       model.PropertyFieldTypeSelect,
				TargetType: "user",
			},
			Attrs: model.CPAAttrs{
				Managed: "",
				Options: []*model.CustomProfileAttributesSelectOption{
					{ID: model.NewId(), Name: "Junior"},
					{ID: model.NewId(), Name: "Senior"},
					{ID: model.NewId(), Name: "Lead"},
				},
			},
		}
		createdField, appErr := s.th.App.CreateCPAField(nil, selectField)
		s.Require().Nil(appErr)
		cmd := &cobra.Command{}
		cmd.Flags().StringSlice("value", []string{}, "")
		err := cmd.Flags().Set("value", "Senior")
		s.Require().Nil(err)
		err = cpaValueSetCmdF(c, cmd, []string{s.th.BasicUser.Email, createdField.ID})
		s.Require().Nil(err)
		values, appErr := s.th.App.ListCPAValues(nil, s.th.BasicUser.Id)
		s.Require().Nil(appErr)
		s.Require().Len(values, 1)
		s.Require().Equal(createdField.ID, values[0].FieldID)
		var seniorOptionID string
		for _, option := range createdField.Attrs.Options {
			if option.Name == "Senior" {
				seniorOptionID = option.ID
				break
			}
		}
		s.Require().Equal(`"`+seniorOptionID+`"`, string(values[0].Value))
	})
	s.Run("Set value for multiselect type field", func() {
		c := s.th.SystemAdminClient
		printer.Clean()
		s.cleanCPAFields()
		s.cleanCPAValuesForUser(s.th.BasicUser.Id)
		multiselectField := &model.CPAField{
			PropertyField: model.PropertyField{
				Name:       "Skills",
				Type:       model.PropertyFieldTypeMultiselect,
				TargetType: "user",
			},
			Attrs: model.CPAAttrs{
				Managed: "",
				Options: []*model.CustomProfileAttributesSelectOption{
					{ID: model.NewId(), Name: "Go"},
					{ID: model.NewId(), Name: "React"},
					{ID: model.NewId(), Name: "Python"},
					{ID: model.NewId(), Name: "JavaScript"},
				},
			},
		}
		createdField, appErr := s.th.App.CreateCPAField(nil, multiselectField)
		s.Require().Nil(appErr)
		cmd := &cobra.Command{}
		cmd.Flags().StringSlice("value", []string{}, "")
		err := cmd.Flags().Set("value", "Go")
		s.Require().Nil(err)
		err = cmd.Flags().Set("value", "React")
		s.Require().Nil(err)
		err = cmd.Flags().Set("value", "Python")
		s.Require().Nil(err)
		err = cpaValueSetCmdF(c, cmd, []string{s.th.BasicUser.Email, createdField.ID})
		s.Require().Nil(err)
		values, appErr := s.th.App.ListCPAValues(nil, s.th.BasicUser.Id)
		s.Require().Nil(appErr)
		s.Require().Len(values, 1)
		s.Require().Equal(createdField.ID, values[0].FieldID)
		var goOptionID, reactOptionID, pythonOptionID string
		for _, option := range createdField.Attrs.Options {
			switch option.Name {
			case "Go":
				goOptionID = option.ID
			case "React":
				reactOptionID = option.ID
			case "Python":
				pythonOptionID = option.ID
			}
		}
		actualValue := string(values[0].Value)
		s.Require().Contains(actualValue, goOptionID)
		s.Require().Contains(actualValue, reactOptionID)
		s.Require().Contains(actualValue, pythonOptionID)
	})
	s.Run("Set a single value for multiselect type field", func() {
		c := s.th.SystemAdminClient
		printer.Clean()
		s.cleanCPAFields()
		s.cleanCPAValuesForUser(s.th.BasicUser.Id)
		multiselectField := &model.CPAField{
			PropertyField: model.PropertyField{
				Name:       "Programming Languages",
				Type:       model.PropertyFieldTypeMultiselect,
				TargetType: "user",
			},
			Attrs: model.CPAAttrs{
				Managed: "",
				Options: []*model.CustomProfileAttributesSelectOption{
					{ID: model.NewId(), Name: "Go"},
					{ID: model.NewId(), Name: "Python"},
					{ID: model.NewId(), Name: "JavaScript"},
				},
			},
		}
		createdField, appErr := s.th.App.CreateCPAField(nil, multiselectField)
		s.Require().Nil(appErr)
		cmd := &cobra.Command{}
		cmd.Flags().StringSlice("value", []string{}, "")
		err := cmd.Flags().Set("value", "Python")
		s.Require().Nil(err)
		err = cpaValueSetCmdF(c, cmd, []string{s.th.BasicUser.Email, createdField.ID})
		s.Require().Nil(err)
		values, appErr := s.th.App.ListCPAValues(nil, s.th.BasicUser.Id)
		s.Require().Nil(appErr)
		s.Require().Len(values, 1)
		s.Require().Equal(createdField.ID, values[0].FieldID)
		var pythonOptionID string
		for _, option := range createdField.Attrs.Options {
			if option.Name == "Python" {
				pythonOptionID = option.ID
				break
			}
		}
		actualValue := string(values[0].Value)
		s.Require().Contains(actualValue, pythonOptionID)
		s.Require().Contains(actualValue, "[")
		s.Require().Contains(actualValue, "]")
		for _, option := range createdField.Attrs.Options {
			if option.Name != "Python" {
				s.Require().NotContains(actualValue, option.ID)
			}
		}
	})
	s.Run("Set value for user type field", func() {
		c := s.th.SystemAdminClient
		printer.Clean()
		s.cleanCPAFields()
		s.cleanCPAValuesForUser(s.th.BasicUser.Id)
		userField := &model.CPAField{
			PropertyField: model.PropertyField{
				Name:       "Manager",
				Type:       model.PropertyFieldTypeUser,
				TargetType: "user",
			},
			Attrs: model.CPAAttrs{
				Managed: "",
			},
		}
		createdField, appErr := s.th.App.CreateCPAField(nil, userField)
		s.Require().Nil(appErr)
		cmd := &cobra.Command{}
		cmd.Flags().StringSlice("value", []string{}, "")
		err := cmd.Flags().Set("value", s.th.SystemAdminUser.Id)
		s.Require().Nil(err)
		err = cpaValueSetCmdF(c, cmd, []string{s.th.BasicUser.Email, createdField.ID})
		s.Require().Nil(err)
		values, appErr := s.th.App.ListCPAValues(nil, s.th.BasicUser.Id)
		s.Require().Nil(appErr)
		s.Require().Len(values, 1)
		s.Require().Equal(createdField.ID, values[0].FieldID)
		s.Require().Equal(`"`+s.th.SystemAdminUser.Id+`"`, string(values[0].Value))
	})
}