package plugin_api_tests
import "reflect"
type BasicConfig struct {
	BasicChannelID       string
	BasicChannelName     string
	BasicPostID          string
	BasicPostMessage     string
	BasicTeamDisplayName string
	BasicTeamID          string
	BasicTeamName        string
	BasicUser2Email      string
	BasicUser2Id         string
	BasicUserEmail       string
	BasicUserID          string
}
func IsEmpty(object any) bool {
	if object == nil {
		return true
	}
	objValue := reflect.ValueOf(object)
	switch objValue.Kind() {
	case reflect.Array, reflect.Chan, reflect.Map, reflect.Slice:
		return objValue.Len() == 0
	case reflect.Ptr:
		if objValue.IsNil() {
			return true
		}
		deref := objValue.Elem().Interface()
		return IsEmpty(deref)
	default:
		zero := reflect.Zero(objValue.Type())
		return reflect.DeepEqual(object, zero.Interface())
	}
}