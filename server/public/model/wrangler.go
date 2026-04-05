package model
type WranglerPostList struct {
	Posts                []*Post
	ThreadUserIDs        []string
	EarlistPostTimestamp int64
	LatestPostTimestamp  int64
	FileAttachmentCount  int64
}
func (wpl *WranglerPostList) NumPosts() int {
	return len(wpl.Posts)
}
func (wpl *WranglerPostList) RootPost() *Post {
	if wpl.NumPosts() < 1 {
		return nil
	}
	return wpl.Posts[0]
}
func (wpl *WranglerPostList) ContainsFileAttachments() bool {
	return wpl.FileAttachmentCount != 0
}