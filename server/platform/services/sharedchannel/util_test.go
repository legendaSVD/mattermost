package sharedchannel
import (
	"strings"
	"testing"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/stretchr/testify/require"
)
func Test_mungUsername(t *testing.T) {
	type args struct {
		username   string
		remotename string
		suffix     string
		maxLen     int
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{"everything empty", args{username: "", remotename: "", suffix: "", maxLen: 64}, ":"},
		{"no trunc, no suffix", args{username: "bart", remotename: "example.com", suffix: "", maxLen: 64}, "bart:example.com"},
		{"no trunc, suffix", args{username: "bart", remotename: "example.com", suffix: "2", maxLen: 64}, "bart-2:example.com"},
		{"trunc remote, no suffix", args{username: "bart", remotename: "example1234567890.com", suffix: "", maxLen: 24}, "bart:example123456789..."},
		{"trunc remote, suffix", args{username: "bart", remotename: "example1234567890.com", suffix: "2", maxLen: 24}, "bart-2:example1234567..."},
		{"trunc both, no suffix", args{username: R(24, "A"), remotename: R(24, "B"), suffix: "", maxLen: 24}, "AAAAAAAAA...:BBBBBBBB..."},
		{"trunc both, suffix", args{username: R(24, "A"), remotename: R(24, "B"), suffix: "10", maxLen: 24}, "AAAAAA-10...:BBBBBBBB..."},
		{"trunc user, no suffix", args{username: R(40, "A"), remotename: "abc", suffix: "", maxLen: 24}, "AAAAAAAAAAAAAAAAA...:abc"},
		{"trunc user, suffix", args{username: R(40, "A"), remotename: "abc", suffix: "11", maxLen: 24}, "AAAAAAAAAAAAAA-11...:abc"},
		{"trunc user, remote, no suffix", args{username: R(40, "A"), remotename: "abcdefghijk", suffix: "", maxLen: 24}, "AAAAAAAAA...:abcdefghijk"},
		{"trunc user, remote, suffix", args{username: R(40, "A"), remotename: "abcdefghijk", suffix: "19", maxLen: 24}, "AAAAAA-19...:abcdefghijk"},
		{"short user, long remote, no suffix", args{username: "bart", remotename: R(40, "B"), suffix: "", maxLen: 24}, "bart:BBBBBBBBBBBBBBBB..."},
		{"long user, short remote, no suffix", args{username: R(40, "A"), remotename: "abc.com", suffix: "", maxLen: 24}, "AAAAAAAAAAAAA...:abc.com"},
		{"short user, long remote, suffix", args{username: "bart", remotename: R(40, "B"), suffix: "12", maxLen: 24}, "bart-12:BBBBBBBBBBBBB..."},
		{"long user, short remote, suffix", args{username: R(40, "A"), remotename: "abc.com", suffix: "12", maxLen: 24}, "AAAAAAAAAA-12...:abc.com"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := mungUsername(tt.args.username, tt.args.remotename, tt.args.suffix, tt.args.maxLen); got != tt.want {
				t.Errorf("mungUsername() = %v, want %v", got, tt.want)
			}
		})
	}
}
func Test_mungUsernameFuzz(t *testing.T) {
	for i := range 70 {
		for j := range 70 {
			for k := range 3 {
				username := R(i, "A")
				remotename := R(j, "B")
				suffix := R(k, "1")
				result := mungUsername(username, remotename, suffix, 64)
				require.LessOrEqual(t, len(result), 64)
			}
		}
	}
}
func Test_fixMention(t *testing.T) {
	tests := []struct {
		name       string
		post       *model.Post
		mentionMap model.UserMentionMap
		user       *model.User
		expected   string
	}{
		{
			name:       "nil post",
			post:       nil,
			mentionMap: model.UserMentionMap{"user:remote": "userid"},
			user:       &model.User{Id: "userid"},
			expected:   "",
		},
		{
			name:       "empty mentionMap",
			post:       &model.Post{Message: "hello @user:remote"},
			mentionMap: model.UserMentionMap{},
			user:       &model.User{Id: "userid"},
			expected:   "hello @user:remote",
		},
		{
			name:       "no RemoteUsername prop",
			post:       &model.Post{Message: "hello @user:remote"},
			mentionMap: model.UserMentionMap{"user:remote": "userid"},
			user:       &model.User{Id: "userid"},
			expected:   "hello @user:remote",
		},
		{
			name:       "username clash - simple mention",
			post:       &model.Post{Message: "hello @user:remote"},
			mentionMap: model.UserMentionMap{"user:remote": "userid"},
			user:       &model.User{Id: "userid", RemoteId: model.NewPointer("remoteid"), Props: model.StringMap{model.UserPropsKeyRemoteUsername: "user"}},
			expected:   "hello @user",
		},
		{
			name:       "username clash - mention at start",
			post:       &model.Post{Message: "@user:remote hello"},
			mentionMap: model.UserMentionMap{"user:remote": "userid"},
			user:       &model.User{Id: "userid", RemoteId: model.NewPointer("remoteid"), Props: model.StringMap{model.UserPropsKeyRemoteUsername: "user"}},
			expected:   "@user hello",
		},
		{
			name:       "username clash - multiple mentions",
			post:       &model.Post{Message: "hello @user:remote and @user:remote again"},
			mentionMap: model.UserMentionMap{"user:remote": "userid"},
			user:       &model.User{Id: "userid", RemoteId: model.NewPointer("remoteid"), Props: model.StringMap{model.UserPropsKeyRemoteUsername: "user"}},
			expected:   "hello @user and @user again",
		},
		{
			name:       "simple mention different username",
			post:       &model.Post{Message: "hello @user:remote"},
			mentionMap: model.UserMentionMap{"user:remote": "userid"},
			user:       &model.User{Id: "userid", RemoteId: model.NewPointer("remoteid"), Props: model.StringMap{model.UserPropsKeyRemoteUsername: "realuser"}},
			expected:   "hello @realuser",
		},
		{
			name:       "simple mention same username",
			post:       &model.Post{Message: "hello @user:remote"},
			mentionMap: model.UserMentionMap{"user:remote": "userid"},
			user:       &model.User{Id: "userid", RemoteId: model.NewPointer("remoteid"), Props: model.StringMap{model.UserPropsKeyRemoteUsername: "user"}},
			expected:   "hello @user",
		},
		{
			name:       "mention at start",
			post:       &model.Post{Message: "@user:remote hello"},
			mentionMap: model.UserMentionMap{"user:remote": "userid"},
			user:       &model.User{Id: "userid", RemoteId: model.NewPointer("remoteid"), Props: model.StringMap{model.UserPropsKeyRemoteUsername: "realuser"}},
			expected:   "@realuser hello",
		},
		{
			name:       "mention at end",
			post:       &model.Post{Message: "hello @user:remote"},
			mentionMap: model.UserMentionMap{"user:remote": "userid"},
			user:       &model.User{Id: "userid", RemoteId: model.NewPointer("remoteid"), Props: model.StringMap{model.UserPropsKeyRemoteUsername: "realuser"}},
			expected:   "hello @realuser",
		},
		{
			name:       "multiple mentions of same user",
			post:       &model.Post{Message: "hello @user:remote and @user:remote again"},
			mentionMap: model.UserMentionMap{"user:remote": "userid"},
			user:       &model.User{Id: "userid", RemoteId: model.NewPointer("remoteid"), Props: model.StringMap{model.UserPropsKeyRemoteUsername: "realuser"}},
			expected:   "hello @realuser and @realuser again",
		},
		{
			name:       "multiple different mentions",
			post:       &model.Post{Message: "hello @user:remote and @other:remote"},
			mentionMap: model.UserMentionMap{"user:remote": "userid", "other:remote": "otherid"},
			user:       &model.User{Id: "userid", RemoteId: model.NewPointer("remoteid"), Props: model.StringMap{model.UserPropsKeyRemoteUsername: "realuser"}},
			expected:   "hello @realuser and @other:remote",
		},
		{
			name:       "mention without colon",
			post:       &model.Post{Message: "hello @user"},
			mentionMap: model.UserMentionMap{"user": "userid"},
			user:       &model.User{Id: "userid", RemoteId: model.NewPointer("remoteid"), Props: model.StringMap{model.UserPropsKeyRemoteUsername: "realuser"}},
			expected:   "hello @user",
		},
		{
			name:       "mention different user id",
			post:       &model.Post{Message: "hello @user:remote"},
			mentionMap: model.UserMentionMap{"user:remote": "different"},
			user:       &model.User{Id: "userid", RemoteId: model.NewPointer("remoteid"), Props: model.StringMap{model.UserPropsKeyRemoteUsername: "realuser"}},
			expected:   "hello @user:remote",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			fixMention(tt.post, tt.mentionMap, tt.user)
			if tt.post != nil {
				require.Equal(t, tt.expected, tt.post.Message)
			}
		})
	}
}
func R(count int, s string) string {
	return strings.Repeat(s, count)
}
func TestHandleUserMentions(t *testing.T) {
	t.Run("should format mentions across clusters", func(t *testing.T) {
		clusterBName := "remote_cluster_B"
		adminUserB := &model.User{
			Id:       "adminB",
			Username: "admin",
			RemoteId: model.NewPointer(clusterBName),
			Props:    model.StringMap{model.UserPropsKeyRemoteUsername: "admin"},
		}
		postOnClusterB := &model.Post{
			Message: "Hey @admin, please review this.",
		}
		require.Contains(t, postOnClusterB.Message, "@admin",
			"Message should preserve @admin mention when synced between clusters")
		postWithRemoteMention := &model.Post{
			Message: "Let's ask @admin:remote_cluster_B about this",
		}
		mentionMapWithRemote := model.UserMentionMap{
			"admin:remote_cluster_B": "adminB",
		}
		postCopy := &model.Post{Message: postWithRemoteMention.Message}
		fixMention(postCopy, mentionMapWithRemote, adminUserB)
		expected := "Let's ask @admin about this"
		require.Equal(t, expected, postCopy.Message,
			"Should remove remote cluster suffix when message is viewed on user's home server")
	})
}