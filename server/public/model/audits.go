package model
type Audits []Audit
func (o Audits) Etag() string {
	if len(o) > 0 {
		return Etag(o[0].CreateAt)
	}
	return ""
}