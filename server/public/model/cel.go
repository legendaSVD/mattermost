package model
type ValueType int
const (
	LiteralValue ValueType = iota
	AttrValue
)
type Condition struct {
	Attribute string `json:"attribute"`
	Operator string `json:"operator"`
	Value any `json:"value"`
	ValueType ValueType `json:"value_type"`
	AttributeType string `json:"attribute_type"`
}
type VisualExpression struct {
	Conditions []Condition `json:"conditions"`
}