package mock
import (
	"github.com/stretchr/testify/mock"
)
const (
	Anything = mock.Anything
)
type Arguments = mock.Arguments
type AnythingOfTypeArgument = mock.AnythingOfTypeArgument
type Call = mock.Call
type Mock = mock.Mock
type TestingT = mock.TestingT
func AnythingOfType(t string) AnythingOfTypeArgument {
	return mock.AnythingOfType(t)
}
func AssertExpectationsForObjects(t TestingT, testObjects ...any) bool {
	return mock.AssertExpectationsForObjects(t, testObjects...)
}
func MatchedBy(fn any) any {
	return mock.MatchedBy(fn)
}