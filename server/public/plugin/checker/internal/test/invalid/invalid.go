package invalid
type API interface {
	ValidMethod()
	InvalidMethod()
}
type Helpers interface {
	LowerVersionMethod()
	HigherVersionMethod()
}
type HelpersImpl struct {
	api API
}
func (h *HelpersImpl) LowerVersionMethod() {
	h.api.ValidMethod()
}
func (h *HelpersImpl) HigherVersionMethod() {
	h.api.ValidMethod()
}