package model
func NewPointer[T any](t T) *T { return &t }
func SafeDereference[T any](t *T) T {
	if t == nil {
		var t T
		return t
	}
	return *t
}