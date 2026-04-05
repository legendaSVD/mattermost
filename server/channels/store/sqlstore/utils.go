package sqlstore
import (
	"database/sql"
	"errors"
	"fmt"
	"io"
	"maps"
	"net/url"
	"strconv"
	"strings"
	"unicode"
	"github.com/wiggin77/merror"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
var escapeLikeSearchChar = []string{
	"%",
	"_",
}
func sanitizeSearchTerm(term string, escapeChar string) string {
	term = strings.Replace(term, escapeChar, "", -1)
	for _, c := range escapeLikeSearchChar {
		term = strings.Replace(term, c, escapeChar+c, -1)
	}
	return term
}
func MapStringsToQueryParams(list []string, paramPrefix string) (string, map[string]any) {
	var keys strings.Builder
	params := make(map[string]any, len(list))
	for i, entry := range list {
		if keys.Len() > 0 {
			keys.WriteString(",")
		}
		key := paramPrefix + strconv.Itoa(i)
		keys.WriteString(":" + key)
		params[key] = entry
	}
	return "(" + keys.String() + ")", params
}
func finalizeTransactionX(transaction *sqlxTxWrapper, perr *error) {
	if err := transaction.Rollback(); err != nil && !errors.Is(err, sql.ErrTxDone) {
		*perr = merror.Append(*perr, err)
	}
}
func deferClose(c io.Closer, perr *error) {
	err := c.Close()
	*perr = merror.Append(*perr, err)
}
func removeNonAlphaNumericUnquotedTerms(line, separator string) string {
	words := strings.Split(line, separator)
	filteredResult := make([]string, 0, len(words))
	for _, w := range words {
		if isQuotedWord(w) || containsAlphaNumericChar(w) {
			filteredResult = append(filteredResult, strings.TrimSpace(w))
		}
	}
	return strings.Join(filteredResult, separator)
}
func containsAlphaNumericChar(s string) bool {
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			return true
		}
	}
	return false
}
func isQuotedWord(s string) bool {
	if len(s) < 2 {
		return false
	}
	return s[0] == '"' && s[len(s)-1] == '"'
}
func constructArrayArgs(ids []string) (string, []any) {
	var placeholder strings.Builder
	values := make([]any, 0, len(ids))
	for _, entry := range ids {
		if placeholder.Len() > 0 {
			placeholder.WriteString(",")
		}
		placeholder.WriteString("?")
		values = append(values, entry)
	}
	return "(" + placeholder.String() + ")", values
}
func wrapBinaryParamStringMap(ok bool, props model.StringMap) model.StringMap {
	if props == nil {
		props = make(model.StringMap)
	}
	props[model.BinaryParamKey] = strconv.FormatBool(ok)
	return props
}
type morphWriter struct{}
func (l *morphWriter) Write(in []byte) (int, error) {
	mlog.Debug(strings.TrimSpace(string(in)))
	return len(in), nil
}
func DSNHasBinaryParam(dsn string) (bool, error) {
	url, err := url.Parse(dsn)
	if err != nil {
		return false, err
	}
	return url.Query().Get("binary_parameters") == "yes", nil
}
func AppendBinaryFlag(buf []byte) []byte {
	return append([]byte{0x01}, buf...)
}
const maxTokenSize = 50
func trimInput(input string) string {
	if len(input) > maxTokenSize {
		input = input[:maxTokenSize] + "..."
	}
	return input
}
func scanRowsIntoMap[K comparable, V any](rows *sql.Rows, scanner func(rows *sql.Rows) (K, V, error), defaults map[K]V) (map[K]V, error) {
	results := make(map[K]V, len(defaults))
	maps.Copy(results, defaults)
	for rows.Next() {
		key, value, err := scanner(rows)
		if err != nil {
			return nil, err
		}
		results[key] = value
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error while iterating rows: %w", err)
	}
	return results, nil
}