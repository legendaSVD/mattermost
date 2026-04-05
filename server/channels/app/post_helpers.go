package app
import (
	"net/http"
	"sort"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
)
type filterPostOptions struct {
	assumeSortedCreatedAt bool
}
type accessibleBounds struct {
	start int
	end   int
}
func (b accessibleBounds) allAccessible(lenPosts int) bool {
	return b.start == allAccessibleBounds(lenPosts).start && b.end == allAccessibleBounds(lenPosts).end
}
func (b accessibleBounds) noAccessible() bool {
	return b.start == noAccessibleBounds.start && b.end == noAccessibleBounds.end
}
func (b accessibleBounds) getInaccessibleRange(listLength int) (int, int) {
	var start, end int
	if b.start == 0 {
		start = b.end + 1
		end = listLength - 1
	} else {
		start = 0
		end = b.start - 1
	}
	return start, end
}
var noAccessibleBounds = accessibleBounds{start: -1, end: -1}
var allAccessibleBounds = func(lenPosts int) accessibleBounds { return accessibleBounds{start: 0, end: lenPosts - 1} }
func getTimeSortedPostAccessibleBounds(earliestAccessibleTime int64, lenPosts int, getCreateAt func(int) int64) accessibleBounds {
	if lenPosts == 0 {
		return allAccessibleBounds(lenPosts)
	}
	if lenPosts == 1 {
		if getCreateAt(0) >= earliestAccessibleTime {
			return allAccessibleBounds(lenPosts)
		}
		return noAccessibleBounds
	}
	ascending := getCreateAt(0) < getCreateAt(lenPosts-1)
	idx := sort.Search(lenPosts, func(i int) bool {
		if ascending {
			return getCreateAt(i) >= earliestAccessibleTime
		}
		return getCreateAt(i) <= earliestAccessibleTime-1
	})
	if ascending {
		if idx == lenPosts {
			return noAccessibleBounds
		}
		return accessibleBounds{start: idx, end: lenPosts - 1}
	}
	if idx == 0 {
		return noAccessibleBounds
	}
	return accessibleBounds{start: 0, end: idx - 1}
}
func linearFilterPostList(postList *model.PostList, earliestAccessibleTime int64) {
	posts := postList.Posts
	order := postList.Order
	n := 0
	for i, postID := range order {
		if createAt := posts[postID].CreateAt; createAt >= earliestAccessibleTime {
			order[n] = order[i]
			n++
		} else {
			if createAt > postList.FirstInaccessiblePostTime {
				postList.FirstInaccessiblePostTime = createAt
			}
			delete(posts, postID)
		}
	}
	postList.Order = order[:n]
	for postId := range posts {
		if createAt := posts[postId].CreateAt; createAt < earliestAccessibleTime {
			if createAt > postList.FirstInaccessiblePostTime {
				postList.FirstInaccessiblePostTime = createAt
			}
			delete(posts, postId)
		}
	}
}
func linearFilterPostsSlice(posts []*model.Post, earliestAccessibleTime int64) ([]*model.Post, int64) {
	var firstInaccessiblePostTime int64
	n := 0
	for i := range posts {
		if createAt := posts[i].CreateAt; createAt >= earliestAccessibleTime {
			posts[n] = posts[i]
			n++
		} else {
			if createAt > firstInaccessiblePostTime {
				firstInaccessiblePostTime = createAt
			}
		}
	}
	return posts[:n], firstInaccessiblePostTime
}
func (a *App) filterInaccessiblePosts(postList *model.PostList, options filterPostOptions) *model.AppError {
	if postList == nil || postList.Posts == nil || len(postList.Posts) == 0 {
		return nil
	}
	lastAccessiblePostTime, appErr := a.GetLastAccessiblePostTime()
	if appErr != nil {
		return model.NewAppError("filterInaccessiblePosts", "app.last_accessible_post.app_error", nil, "", http.StatusInternalServerError).Wrap(appErr)
	}
	if lastAccessiblePostTime == 0 {
		return nil
	}
	if len(postList.Posts) == len(postList.Order) && options.assumeSortedCreatedAt {
		lenPosts := len(postList.Posts)
		getCreateAt := func(i int) int64 { return postList.Posts[postList.Order[i]].CreateAt }
		bounds := getTimeSortedPostAccessibleBounds(lastAccessiblePostTime, lenPosts, getCreateAt)
		if bounds.allAccessible(lenPosts) {
			return nil
		}
		if bounds.noAccessible() {
			if lenPosts > 0 {
				firstPostCreatedAt := postList.Posts[postList.Order[0]].CreateAt
				lastPostCreatedAt := postList.Posts[postList.Order[len(postList.Order)-1]].CreateAt
				postList.FirstInaccessiblePostTime = max(firstPostCreatedAt, lastPostCreatedAt)
			}
			postList.Posts = map[string]*model.Post{}
			postList.Order = []string{}
			return nil
		}
		startInaccessibleIndex, endInaccessibleIndex := bounds.getInaccessibleRange(len(postList.Order))
		startInaccessibleCreatedAt := postList.Posts[postList.Order[startInaccessibleIndex]].CreateAt
		endInaccessibleCreatedAt := postList.Posts[postList.Order[endInaccessibleIndex]].CreateAt
		postList.FirstInaccessiblePostTime = max(startInaccessibleCreatedAt, endInaccessibleCreatedAt)
		posts := postList.Posts
		order := postList.Order
		accessibleCount := bounds.end - bounds.start + 1
		inaccessibleCount := lenPosts - accessibleCount
		if inaccessibleCount < accessibleCount {
			for i := 0; i < bounds.start; i++ {
				delete(posts, order[i])
			}
			for i := bounds.end + 1; i < lenPosts; i++ {
				delete(posts, order[i])
			}
		} else {
			accessiblePosts := make(map[string]*model.Post, accessibleCount)
			for i := bounds.start; i <= bounds.end; i++ {
				accessiblePosts[order[i]] = posts[order[i]]
			}
			postList.Posts = accessiblePosts
		}
		postList.Order = postList.Order[bounds.start : bounds.end+1]
	} else {
		linearFilterPostList(postList, lastAccessiblePostTime)
	}
	return nil
}
func (a *App) isInaccessiblePost(post *model.Post) (int64, *model.AppError) {
	if post == nil {
		return 0, nil
	}
	pl := &model.PostList{
		Order: []string{post.Id},
		Posts: map[string]*model.Post{post.Id: post},
	}
	return pl.FirstInaccessiblePostTime, a.filterInaccessiblePosts(pl, filterPostOptions{assumeSortedCreatedAt: true})
}
func (a *App) getFilteredAccessiblePosts(posts []*model.Post, options filterPostOptions) ([]*model.Post, int64, *model.AppError) {
	if len(posts) == 0 {
		return posts, 0, nil
	}
	filteredPosts := []*model.Post{}
	lastAccessiblePostTime, appErr := a.GetLastAccessiblePostTime()
	if appErr != nil {
		return filteredPosts, 0, model.NewAppError("getFilteredAccessiblePosts", "app.last_accessible_post.app_error", nil, "", http.StatusInternalServerError).Wrap(appErr)
	} else if lastAccessiblePostTime == 0 {
		return posts, 0, nil
	}
	if options.assumeSortedCreatedAt {
		lenPosts := len(posts)
		getCreateAt := func(i int) int64 { return posts[i].CreateAt }
		bounds := getTimeSortedPostAccessibleBounds(lastAccessiblePostTime, lenPosts, getCreateAt)
		if bounds.allAccessible(lenPosts) {
			return posts, 0, nil
		}
		if bounds.noAccessible() {
			var firstInaccessiblePostTime int64
			if lenPosts > 0 {
				firstPostCreatedAt := posts[0].CreateAt
				lastPostCreatedAt := posts[len(posts)-1].CreateAt
				firstInaccessiblePostTime = max(firstPostCreatedAt, lastPostCreatedAt)
			}
			return filteredPosts, firstInaccessiblePostTime, nil
		}
		startInaccessibleIndex, endInaccessibleIndex := bounds.getInaccessibleRange(len(posts))
		firstPostCreatedAt := posts[startInaccessibleIndex].CreateAt
		lastPostCreatedAt := posts[endInaccessibleIndex].CreateAt
		firstInaccessiblePostTime := max(firstPostCreatedAt, lastPostCreatedAt)
		filteredPosts = posts[bounds.start : bounds.end+1]
		return filteredPosts, firstInaccessiblePostTime, nil
	}
	filteredPosts, firstInaccessiblePostTime := linearFilterPostsSlice(posts, lastAccessiblePostTime)
	return filteredPosts, firstInaccessiblePostTime, nil
}
func (a *App) filterBurnOnReadPosts(postList *model.PostList) *model.AppError {
	if postList == nil || postList.Posts == nil || len(postList.Posts) == 0 {
		return nil
	}
	if !a.Config().FeatureFlags.BurnOnRead || !model.SafeDereference(a.Config().ServiceSettings.EnableBurnOnRead) {
		return nil
	}
	var burnOnReadPostIDs []string
	for postID, post := range postList.Posts {
		if post.Type == model.PostTypeBurnOnRead {
			burnOnReadPostIDs = append(burnOnReadPostIDs, postID)
		}
	}
	if len(burnOnReadPostIDs) == 0 {
		return nil
	}
	for _, postID := range burnOnReadPostIDs {
		a.removePostFromList(postList, postID)
	}
	filteredOrder := make([]string, 0, len(postList.Order))
	for _, postID := range postList.Order {
		if post, exists := postList.Posts[postID]; exists && post.Type != model.PostTypeBurnOnRead {
			filteredOrder = append(filteredOrder, postID)
		}
	}
	postList.Order = filteredOrder
	postList.BurnOnReadPosts = make(map[string]*model.Post)
	if postList.NextPostId != "" {
		if _, exists := postList.Posts[postList.NextPostId]; !exists {
			postList.NextPostId = ""
		}
	}
	if postList.PrevPostId != "" {
		if _, exists := postList.Posts[postList.PrevPostId]; !exists {
			postList.PrevPostId = ""
		}
	}
	return nil
}
func (a *App) revealSingleBurnOnReadPost(rctx request.CTX, post *model.Post, userID string) (*model.Post, *model.AppError) {
	if post == nil {
		return nil, model.NewAppError("revealSingleBurnOnReadPost", "app.post.get.app_error", nil, "", http.StatusBadRequest)
	}
	if post.Type != model.PostTypeBurnOnRead {
		return post, nil
	}
	if !a.Config().FeatureFlags.BurnOnRead || !model.SafeDereference(a.Config().ServiceSettings.EnableBurnOnRead) {
		return post, nil
	}
	tmpPostList := model.NewPostList()
	tmpPostList.AddPost(post)
	postList, appErr := a.revealBurnOnReadPostsForUser(rctx, tmpPostList, userID)
	if appErr != nil {
		return nil, appErr
	}
	revealedPost, ok := postList.Posts[post.Id]
	if !ok {
		return nil, model.NewAppError("revealSingleBurnOnReadPost", "app.post.get.app_error", nil, "", http.StatusNotFound)
	}
	return revealedPost, nil
}
func (a *App) revealBurnOnReadPostsForUser(rctx request.CTX, postList *model.PostList, userID string) (*model.PostList, *model.AppError) {
	if postList == nil || postList.BurnOnReadPosts == nil || len(postList.BurnOnReadPosts) == 0 {
		return postList, nil
	}
	if !a.Config().FeatureFlags.BurnOnRead || !model.SafeDereference(a.Config().ServiceSettings.EnableBurnOnRead) {
		return postList, nil
	}
	for _, post := range postList.BurnOnReadPosts {
		if post.DeleteAt > 0 {
			continue
		}
		if post.UserId == userID {
			if err := a.revealPostForAuthor(rctx, postList, post); err != nil {
				return nil, err
			}
			continue
		}
		receipt, err := a.getUserReadReceipt(rctx, post.Id, userID)
		if err != nil {
			return nil, err
		}
		if receipt == nil {
			a.setUnrevealedPost(postList, post.Id)
			continue
		}
		if a.isReceiptExpired(receipt) {
			a.removePostFromList(postList, post.Id)
			continue
		}
		if err := a.revealPostForUser(rctx, postList, post, receipt); err != nil {
			return nil, err
		}
	}
	return postList, nil
}