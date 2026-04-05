package app
import (
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
)
type AutocompleteDynamicArgProvider interface {
	GetAutoCompleteListItems(rctx request.CTX, a *App, commandArgs *model.CommandArgs, arg *model.AutocompleteArg, parsed, toBeParsed string) ([]model.AutocompleteListItem, error)
}
func (a *App) GetSuggestions(rctx request.CTX, commandArgs *model.CommandArgs, commands []*model.Command, roleID string) []model.AutocompleteSuggestion {
	sort.Slice(commands, func(i, j int) bool {
		return strings.Compare(strings.ToLower(commands[i].Trigger), strings.ToLower(commands[j].Trigger)) < 0
	})
	autocompleteData := []*model.AutocompleteData{}
	for _, command := range commands {
		if command.AutocompleteData == nil {
			command.AutocompleteData = model.NewAutocompleteData(command.Trigger, command.AutoCompleteHint, command.AutoCompleteDesc)
		}
		autocompleteData = append(autocompleteData, command.AutocompleteData)
	}
	userInput := commandArgs.Command
	suggestions := a.getSuggestions(rctx, commandArgs, autocompleteData, "", userInput, roleID)
	for i, suggestion := range suggestions {
		for _, command := range commands {
			if strings.HasPrefix(suggestion.Complete, command.Trigger) {
				suggestions[i].IconData = command.AutocompleteIconData
				break
			}
		}
	}
	return suggestions
}
func (a *App) getSuggestions(rctx request.CTX, commandArgs *model.CommandArgs, commands []*model.AutocompleteData, inputParsed, inputToBeParsed, roleID string) []model.AutocompleteSuggestion {
	suggestions := []model.AutocompleteSuggestion{}
	index := strings.Index(inputToBeParsed, " ")
	if index == -1 {
		for _, command := range commands {
			if strings.HasPrefix(command.Trigger, strings.ToLower(inputToBeParsed)) && (command.RoleID == roleID || roleID == model.SystemAdminRoleId || roleID == "") {
				s := model.AutocompleteSuggestion{
					Complete:    inputParsed + command.Trigger,
					Suggestion:  command.Trigger,
					Description: command.HelpText,
					Hint:        command.Hint,
				}
				suggestions = append(suggestions, s)
			}
		}
		return suggestions
	}
	for _, command := range commands {
		if command.Trigger != strings.ToLower(inputToBeParsed[:index]) {
			continue
		}
		if roleID != "" && roleID != model.SystemAdminRoleId && roleID != command.RoleID {
			continue
		}
		toBeParsed := inputToBeParsed[index+1:]
		parsed := inputParsed + inputToBeParsed[:index+1]
		if len(command.Arguments) == 0 {
			subSuggestions := a.getSuggestions(rctx, commandArgs, command.SubCommands, parsed, toBeParsed, roleID)
			suggestions = append(suggestions, subSuggestions...)
			continue
		}
		found, _, _, suggestion := a.parseArguments(rctx, commandArgs, command.Arguments, parsed, toBeParsed)
		if found {
			suggestions = append(suggestions, suggestion...)
		}
	}
	return suggestions
}
func (a *App) parseArguments(rctx request.CTX, commandArgs *model.CommandArgs, args []*model.AutocompleteArg, parsed, toBeParsed string) (found bool, alreadyParsed string, yetToBeParsed string, suggestions []model.AutocompleteSuggestion) {
	if len(args) == 0 {
		return false, parsed, toBeParsed, suggestions
	}
	if args[0].Required {
		found, changedParsed, changedToBeParsed, suggestion := a.parseArgument(rctx, commandArgs, args[0], parsed, toBeParsed)
		if found {
			suggestions = append(suggestions, suggestion...)
			return true, changedParsed, changedToBeParsed, suggestions
		}
		return a.parseArguments(rctx, commandArgs, args[1:], changedParsed, changedToBeParsed)
	}
	foundWithOptional, changedParsedWithOptional, changedToBeParsedWithOptional, suggestionsWithOptional := a.parseArgument(rctx, commandArgs, args[0], parsed, toBeParsed)
	if foundWithOptional {
		suggestions = append(suggestions, suggestionsWithOptional...)
	} else {
		foundWithOptionalRest, changedParsedWithOptionalRest, changedToBeParsedWithOptionalRest, suggestionsWithOptionalRest := a.parseArguments(rctx, commandArgs, args[1:], changedParsedWithOptional, changedToBeParsedWithOptional)
		if foundWithOptionalRest {
			suggestions = append(suggestions, suggestionsWithOptionalRest...)
		}
		foundWithOptional = foundWithOptionalRest
		changedParsedWithOptional = changedParsedWithOptionalRest
		changedToBeParsedWithOptional = changedToBeParsedWithOptionalRest
	}
	foundWithoutOptional, changedParsedWithoutOptional, changedToBeParsedWithoutOptional, suggestionsWithoutOptional := a.parseArguments(rctx, commandArgs, args[1:], parsed, toBeParsed)
	if foundWithoutOptional {
		suggestions = append(suggestions, suggestionsWithoutOptional...)
	}
	if foundWithOptional || foundWithoutOptional {
		return true, parsed + toBeParsed, "", suggestions
	}
	if changedParsedWithOptional != parsed && changedToBeParsedWithOptional != toBeParsed {
		return false, changedParsedWithOptional, changedToBeParsedWithOptional, suggestions
	}
	return foundWithoutOptional, changedParsedWithoutOptional, changedToBeParsedWithoutOptional, suggestions
}
func (a *App) parseArgument(rctx request.CTX, commandArgs *model.CommandArgs, arg *model.AutocompleteArg, parsed, toBeParsed string) (found bool, alreadyParsed string, yetToBeParsed string, suggestions []model.AutocompleteSuggestion) {
	if arg.Name != "" {
		found, changedParsed, changedToBeParsed, suggestion := parseNamedArgument(arg, parsed, toBeParsed)
		if found {
			suggestions = append(suggestions, suggestion)
			return true, changedParsed, changedToBeParsed, suggestions
		}
		if changedToBeParsed == "" {
			return true, changedParsed, changedToBeParsed, suggestions
		}
		if changedToBeParsed == " " {
			changedToBeParsed = ""
		}
		parsed = changedParsed
		toBeParsed = changedToBeParsed
	}
	if arg.Type == model.AutocompleteArgTypeText {
		found, changedParsed, changedToBeParsed, suggestion := parseInputTextArgument(arg, parsed, toBeParsed)
		if found {
			suggestions = append(suggestions, suggestion)
			return true, changedParsed, changedToBeParsed, suggestions
		}
		parsed = changedParsed
		toBeParsed = changedToBeParsed
	} else if arg.Type == model.AutocompleteArgTypeStaticList {
		found, changedParsed, changedToBeParsed, staticListSuggestions := parseStaticListArgument(arg, parsed, toBeParsed)
		if found {
			suggestions = append(suggestions, staticListSuggestions...)
			return true, changedParsed, changedToBeParsed, suggestions
		}
		parsed = changedParsed
		toBeParsed = changedToBeParsed
	} else if arg.Type == model.AutocompleteArgTypeDynamicList {
		found, changedParsed, changedToBeParsed, dynamicListSuggestions := a.getDynamicListArgument(rctx, commandArgs, arg, parsed, toBeParsed)
		if found {
			suggestions = append(suggestions, dynamicListSuggestions...)
			return true, changedParsed, changedToBeParsed, suggestions
		}
		parsed = changedParsed
		toBeParsed = changedToBeParsed
	}
	return false, parsed, toBeParsed, suggestions
}
func parseNamedArgument(arg *model.AutocompleteArg, parsed, toBeParsed string) (found bool, alreadyParsed string, yetToBeParsed string, suggestion model.AutocompleteSuggestion) {
	in := strings.TrimPrefix(toBeParsed, " ")
	namedArg := "--" + arg.Name
	if in == "" {
		return true, parsed + toBeParsed, "", model.AutocompleteSuggestion{Complete: parsed + toBeParsed + namedArg + " ", Suggestion: namedArg, Hint: "", Description: arg.HelpText}
	}
	if strings.HasPrefix(strings.ToLower(namedArg), strings.ToLower(in)) {
		return true, parsed + toBeParsed, "", model.AutocompleteSuggestion{Complete: parsed + toBeParsed + namedArg[len(in):] + " ", Suggestion: namedArg, Hint: "", Description: arg.HelpText}
	}
	if !strings.HasPrefix(strings.ToLower(in), strings.ToLower(namedArg)+" ") {
		return false, parsed + toBeParsed, "", model.AutocompleteSuggestion{}
	}
	if strings.ToLower(in) == strings.ToLower(namedArg)+" " {
		return false, parsed + namedArg + " ", " ", model.AutocompleteSuggestion{}
	}
	return false, parsed + namedArg + " ", in[len(namedArg)+1:], model.AutocompleteSuggestion{}
}
func parseInputTextArgument(arg *model.AutocompleteArg, parsed, toBeParsed string) (found bool, alreadyParsed string, yetToBeParsed string, suggestion model.AutocompleteSuggestion) {
	in := strings.TrimPrefix(toBeParsed, " ")
	a := arg.Data.(*model.AutocompleteTextArg)
	if in == "" {
		return true, parsed + toBeParsed, "", model.AutocompleteSuggestion{Complete: parsed + toBeParsed, Suggestion: "", Hint: a.Hint, Description: arg.HelpText}
	}
	if in[0] == '"' { //input with multiple words
		indexOfSecondQuote := strings.Index(in[1:], `"`)
		if indexOfSecondQuote == -1 {
			return true, parsed + toBeParsed, "", model.AutocompleteSuggestion{Complete: parsed + toBeParsed, Suggestion: "", Hint: a.Hint, Description: arg.HelpText}
		}
		offset := 2
		if len(in) > indexOfSecondQuote+2 && in[indexOfSecondQuote+2] == ' ' {
			offset++
		}
		return false, parsed + in[:indexOfSecondQuote+offset], in[indexOfSecondQuote+offset:], model.AutocompleteSuggestion{}
	}
	index := strings.Index(in, " ")
	if index == -1 {
		return true, parsed + toBeParsed, "", model.AutocompleteSuggestion{Complete: parsed + toBeParsed, Suggestion: "", Hint: a.Hint, Description: arg.HelpText}
	}
	return false, parsed + in[:index+1], in[index+1:], model.AutocompleteSuggestion{}
}
func parseStaticListArgument(arg *model.AutocompleteArg, parsed, toBeParsed string) (found bool, alreadyParsed string, yetToBeParsed string, suggestions []model.AutocompleteSuggestion) {
	a := arg.Data.(*model.AutocompleteStaticListArg)
	return parseListItems(a.PossibleArguments, parsed, toBeParsed)
}
func (a *App) getDynamicListArgument(rctx request.CTX, commandArgs *model.CommandArgs, arg *model.AutocompleteArg, parsed, toBeParsed string) (found bool, alreadyParsed string, yetToBeParsed string, suggestions []model.AutocompleteSuggestion) {
	dynamicArg := arg.Data.(*model.AutocompleteDynamicListArg)
	if strings.HasPrefix(dynamicArg.FetchURL, "builtin:") {
		listItems, err := a.getBuiltinDynamicListArgument(rctx, commandArgs, arg, parsed, toBeParsed)
		if err != nil {
			rctx.Logger().Error("Can't fetch dynamic list arguments for", mlog.String("url", dynamicArg.FetchURL), mlog.Err(err))
			return false, parsed, toBeParsed, []model.AutocompleteSuggestion{}
		}
		return parseListItems(listItems, parsed, toBeParsed)
	}
	params := url.Values{}
	params.Add("user_input", parsed+toBeParsed)
	params.Add("parsed", parsed)
	pluginContext := pluginContext(rctx)
	params.Add("request_id", pluginContext.RequestId)
	params.Add("session_id", pluginContext.SessionId)
	params.Add("ip_address", pluginContext.IPAddress)
	params.Add("accept_language", pluginContext.AcceptLanguage)
	params.Add("user_agent", pluginContext.UserAgent)
	params.Add("channel_id", commandArgs.ChannelId)
	params.Add("team_id", commandArgs.TeamId)
	params.Add("root_id", commandArgs.RootId)
	params.Add("user_id", commandArgs.UserId)
	siteURL := *a.Config().ServiceSettings.SiteURL
	if siteURL != "" {
		params.Add("site_url", siteURL)
	}
	resp, err := a.doPluginRequest(rctx, "GET", dynamicArg.FetchURL, params, nil)
	if err != nil {
		rctx.Logger().Error("Can't fetch dynamic list arguments for", mlog.String("url", dynamicArg.FetchURL), mlog.Err(err))
		return false, parsed, toBeParsed, []model.AutocompleteSuggestion{}
	}
	var listItems []model.AutocompleteListItem
	if jsonErr := json.NewDecoder(resp.Body).Decode(&listItems); jsonErr != nil {
		rctx.Logger().Warn("Failed to decode from JSON", mlog.Err(jsonErr))
	}
	return parseListItems(listItems, parsed, toBeParsed)
}
func parseListItems(items []model.AutocompleteListItem, parsed, toBeParsed string) (bool, string, string, []model.AutocompleteSuggestion) {
	in := strings.TrimPrefix(toBeParsed, " ")
	suggestions := []model.AutocompleteSuggestion{}
	maxPrefix := ""
	for _, arg := range items {
		if strings.HasPrefix(strings.ToLower(in), strings.ToLower(arg.Item)+" ") && len(maxPrefix) < len(arg.Item)+1 {
			maxPrefix = arg.Item + " "
		}
	}
	if maxPrefix != "" {
		return false, parsed + in[:len(maxPrefix)], in[len(maxPrefix):], []model.AutocompleteSuggestion{}
	}
	for _, arg := range items {
		if strings.HasPrefix(strings.ToLower(arg.Item), strings.ToLower(in)) {
			suggestions = append(suggestions, model.AutocompleteSuggestion{Complete: parsed + arg.Item, Suggestion: arg.Item, Hint: arg.Hint, Description: arg.HelpText})
		}
	}
	return true, parsed + toBeParsed, "", suggestions
}
func (a *App) getBuiltinDynamicListArgument(rctx request.CTX, commandArgs *model.CommandArgs, arg *model.AutocompleteArg, parsed, toBeParsed string) ([]model.AutocompleteListItem, error) {
	dynamicArg := arg.Data.(*model.AutocompleteDynamicListArg)
	arr := strings.Split(dynamicArg.FetchURL, ":")
	if len(arr) < 2 {
		return nil, errors.New("dynamic list URL missing built-in command name")
	}
	cmdName := arr[1]
	provider := GetCommandProvider(cmdName)
	if provider == nil {
		return nil, fmt.Errorf("no command provider for %s", cmdName)
	}
	dp, ok := provider.(AutocompleteDynamicArgProvider)
	if !ok {
		return nil, fmt.Errorf("auto-completion not available for built-in command %s", cmdName)
	}
	return dp.GetAutoCompleteListItems(rctx, a, commandArgs, arg, parsed, toBeParsed)
}