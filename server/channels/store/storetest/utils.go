package storetest
import (
	"github.com/mattermost/mattermost/server/public/model"
)
func NewTestID() string {
	newID := []byte(model.NewId())
	for i := 1; i < len(newID); i = i + 2 {
		newID[i] = 48 + newID[i-1]%10
	}
	return string(newID)
}
func quoteColumnName(driver string, columnName string) string {
	return columnName
}