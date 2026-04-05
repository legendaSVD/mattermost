package commands
import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/cmd/mmctl/client"
	"github.com/mattermost/mattermost/server/v8/cmd/mmctl/printer"
	"github.com/spf13/cobra"
)
var CPAValueListCmd = &cobra.Command{
	Use:   "list [user]",
	Short: "List User Attributes values for a user",
	Long:  "List all User Attributes values for a specific user.",
	Example: `  user attributes value list john.doe@company.com
  user attributes value list johndoe`,
	Args: cobra.ExactArgs(1),
	RunE: withClient(cpaValueListCmdF),
}
var CPAValueSetCmd = &cobra.Command{
	Use:   "set [user] [field]",
	Short: "Set a User Attributes value for a user",
	Long:  "Set a User Attributes field value for a specific user.",
	Example: `  user attributes value set john.doe@company.com kx8m2w4r9p3q7n5t1j6h8s4c9e --value "Engineering"
  user attributes value set johndoe Department --value "Go" --value "React" --value "Python"
  user attributes value set user123 Skills --value "Senior"`,
	Args: cobra.ExactArgs(2),
	RunE: withClient(cpaValueSetCmdF),
}
func init() {
	CPAValueSetCmd.Flags().StringSlice("value", []string{}, "Value(s) to set for the field. Can be specified multiple times for multiselect/multiuser fields")
	_ = CPAValueSetCmd.MarkFlagRequired("value")
	UserAttributesValueCmd.AddCommand(
		CPAValueListCmd,
		CPAValueSetCmd,
	)
}
func cpaValueListCmdF(c client.Client, cmd *cobra.Command, args []string) error {
	userArg := args[0]
	if tErr := setupCPATemplateContext(c); tErr != nil {
		return tErr
	}
	user, err := getUserFromArg(c, userArg)
	if err != nil {
		return err
	}
	values, _, err := c.ListCPAValues(context.TODO(), user.Id)
	if err != nil {
		return fmt.Errorf("failed to get CPA values for user %s: %w", user.Username, err)
	}
	for fieldID, value := range values {
		keypair := map[string]any{
			fieldID: value,
		}
		printer.PrintT("{{range $k, $v := .}}{{fieldName $k}} ({{fieldType $k}}): {{resolveValue $k $v}}{{end}}", keypair)
	}
	return nil
}
func cpaValueSetCmdF(c client.Client, cmd *cobra.Command, args []string) error {
	userArg := args[0]
	fieldArg := args[1]
	values, err := cmd.Flags().GetStringSlice("value")
	if err != nil {
		return fmt.Errorf("failed to get values: %w", err)
	}
	user, err := getUserFromArg(c, userArg)
	if err != nil {
		return err
	}
	field, err := getFieldFromArg(c, fieldArg)
	if err != nil {
		return err
	}
	if tErr := setupCPATemplateContext(c); tErr != nil {
		return tErr
	}
	resolvedValues, err := resolveOptionNamesToIDs(field, values)
	if err != nil {
		return fmt.Errorf("failed to resolve option values: %w", err)
	}
	var valueToMarshal any
	if field.Type == model.PropertyFieldTypeMultiselect || field.Type == model.PropertyFieldTypeMultiuser {
		valueToMarshal = resolvedValues
	} else {
		valueToMarshal = resolvedValues[0]
	}
	valueJSON, err := json.Marshal(valueToMarshal)
	if err != nil {
		return fmt.Errorf("failed to marshal value: %w", err)
	}
	patchValues := map[string]json.RawMessage{
		field.ID: valueJSON,
	}
	updatedValues, _, vErr := c.PatchCPAValuesForUser(context.TODO(), user.Id, patchValues)
	if vErr != nil {
		return fmt.Errorf("failed to set CPA value: %w", vErr)
	}
	printer.SetSingle(true)
	for fieldID, value := range updatedValues {
		keypair := map[string]any{
			fieldID: value,
		}
		printer.PrintT("{{range $k, $v := .}}Successfully updated value for field {{fieldName $k}}: {{resolveValue $k $v}}{{end}}", keypair)
	}
	return nil
}
func resolveOptionNamesToIDs(field *model.PropertyField, values []string) ([]string, error) {
	if field.Type != model.PropertyFieldTypeSelect && field.Type != model.PropertyFieldTypeMultiselect {
		return values, nil
	}
	cpaField, err := model.NewCPAFieldFromPropertyField(field)
	if err != nil {
		return nil, err
	}
	var resolvedValues []string
	for _, value := range values {
		optionID := findOptionIDByName(cpaField.Attrs.Options, value)
		if optionID == "" {
			resolvedValues = append(resolvedValues, value)
		} else {
			resolvedValues = append(resolvedValues, optionID)
		}
	}
	return resolvedValues, nil
}
func findOptionIDByName(options []*model.CustomProfileAttributesSelectOption, name string) string {
	for _, option := range options {
		if option.Name == name {
			return option.ID
		}
	}
	return ""
}