package valid
type API interface {
	ValidMethod()
	NewerValidMethod()
}
type Helpers interface {
	ValidHelperMethod()
	NewerValidHelperMethod()
	IndirectReferenceMethod()
}
type HelpersImpl struct {
	api API
}
func (h *HelpersImpl) ValidHelperMethod() {
	h.api.ValidMethod()
}
func (h *HelpersImpl) NewerValidHelperMethod() {
	h.api.NewerValidMethod()
	h.api.ValidMethod()
}
func (h *HelpersImpl) IndirectReferenceMethod() {
	a := h.api
	a.NewerValidMethod()
}