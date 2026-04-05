package markdown
const (
	maxLen = 1024 * 64 * 2
)
func Inspect(markdown string, f func(any) bool) {
	if len(markdown) > maxLen {
		return
	}
	document, referenceDefinitions := Parse(markdown)
	InspectBlock(document, func(block Block) bool {
		if !f(block) {
			return false
		}
		switch v := block.(type) {
		case *Paragraph:
			for _, inline := range MergeInlineText(v.ParseInlines(referenceDefinitions)) {
				InspectInline(inline, func(inline Inline) bool {
					return f(inline)
				})
			}
		}
		return true
	})
}
func InspectBlock(block Block, f func(Block) bool) {
	stack := []Block{block}
	seen := map[Block]bool{}
	for len(stack) > 0 {
		block := stack[len(stack)-1]
		if seen[block] {
			stack = stack[:len(stack)-1]
			f(nil)
			continue
		}
		seen[block] = true
		if !f(block) {
			continue
		}
		switch v := block.(type) {
		case *Document:
			for i := len(v.Children) - 1; i >= 0; i-- {
				stack = append(stack, v.Children[i])
			}
		case *List:
			for i := len(v.Children) - 1; i >= 0; i-- {
				stack = append(stack, v.Children[i])
			}
		case *ListItem:
			for i := len(v.Children) - 1; i >= 0; i-- {
				stack = append(stack, v.Children[i])
			}
		case *BlockQuote:
			for i := len(v.Children) - 1; i >= 0; i-- {
				stack = append(stack, v.Children[i])
			}
		}
	}
}
func InspectInline(inline Inline, f func(Inline) bool) {
	stack := []Inline{inline}
	seen := map[Inline]bool{}
	for len(stack) > 0 {
		inline := stack[len(stack)-1]
		if seen[inline] {
			stack = stack[:len(stack)-1]
			f(nil)
			continue
		}
		seen[inline] = true
		if !f(inline) {
			continue
		}
		switch v := inline.(type) {
		case *InlineImage:
			for i := len(v.Children) - 1; i >= 0; i-- {
				stack = append(stack, v.Children[i])
			}
		case *InlineLink:
			for i := len(v.Children) - 1; i >= 0; i-- {
				stack = append(stack, v.Children[i])
			}
		case *ReferenceImage:
			for i := len(v.Children) - 1; i >= 0; i-- {
				stack = append(stack, v.Children[i])
			}
		case *ReferenceLink:
			for i := len(v.Children) - 1; i >= 0; i-- {
				stack = append(stack, v.Children[i])
			}
		}
	}
}