package app
import (
	"strings"
	"testing"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/i18n"
	"github.com/stretchr/testify/assert"
)
func TestProcessScheduledPosts(t *testing.T) {
	mainHelper.Parallel(t)
	t.Run("base case - happy path", func(t *testing.T) {
		th := Setup(t).InitBasic(t)
		th.App.Srv().SetLicense(getLicWithSkuShortName(model.LicenseShortSkuProfessional))
		scheduledAt := model.GetMillis() + 1000
		scheduledPost1 := &model.ScheduledPost{
			Draft: model.Draft{
				CreateAt:  model.GetMillis(),
				UserId:    th.BasicUser.Id,
				ChannelId: th.BasicChannel.Id,
				Message:   "this is a scheduled post",
			},
			ScheduledAt: scheduledAt,
		}
		_, err := th.Server.Store().ScheduledPost().CreateScheduledPost(scheduledPost1)
		assert.NoError(t, err)
		scheduledPost2 := &model.ScheduledPost{
			Draft: model.Draft{
				CreateAt:  model.GetMillis(),
				UserId:    th.BasicUser.Id,
				ChannelId: th.BasicChannel.Id,
				Message:   "this is second scheduled post",
			},
			ScheduledAt: scheduledAt,
		}
		_, err = th.Server.Store().ScheduledPost().CreateScheduledPost(scheduledPost2)
		assert.NoError(t, err)
		time.Sleep(1 * time.Second)
		th.App.ProcessScheduledPosts(th.Context)
		scheduledPosts, err := th.App.Srv().Store().ScheduledPost().GetScheduledPostsForUser(th.BasicUser.Id, th.BasicChannel.TeamId)
		assert.NoError(t, err)
		assert.Len(t, scheduledPosts, 0)
	})
	t.Run("sets error code for archived channel", func(t *testing.T) {
		th := Setup(t).InitBasic(t)
		th.App.Srv().SetLicense(getLicWithSkuShortName(model.LicenseShortSkuProfessional))
		appErr := th.App.DeleteChannel(th.Context, th.BasicChannel, th.BasicUser.Id)
		assert.Nil(t, appErr)
		scheduledAt := model.GetMillis() - (5 * 60 * 60 * 1000)
		scheduledPost1 := &model.ScheduledPost{
			Draft: model.Draft{
				CreateAt:  model.GetMillis(),
				UserId:    th.BasicUser.Id,
				ChannelId: th.BasicChannel.Id,
				Message:   "this is a scheduled post",
			},
			ScheduledAt: scheduledAt,
		}
		_, err := th.Server.Store().ScheduledPost().CreateScheduledPost(scheduledPost1)
		assert.NoError(t, err)
		scheduledPost2 := &model.ScheduledPost{
			Draft: model.Draft{
				CreateAt:  model.GetMillis(),
				UserId:    th.BasicUser.Id,
				ChannelId: th.BasicChannel.Id,
				Message:   "this is second scheduled post",
			},
			ScheduledAt: scheduledAt,
		}
		_, err = th.Server.Store().ScheduledPost().CreateScheduledPost(scheduledPost2)
		assert.NoError(t, err)
		time.Sleep(1 * time.Second)
		th.App.ProcessScheduledPosts(th.Context)
		scheduledPosts, err := th.App.Srv().Store().ScheduledPost().GetScheduledPostsForUser(th.BasicUser.Id, th.BasicChannel.TeamId)
		assert.NoError(t, err)
		assert.Len(t, scheduledPosts, 2)
		assert.Equal(t, model.ScheduledPostErrorCodeChannelArchived, scheduledPosts[0].ErrorCode)
		assert.Greater(t, scheduledPosts[0].ProcessedAt, int64(0))
		assert.Equal(t, model.ScheduledPostErrorCodeChannelArchived, scheduledPosts[1].ErrorCode)
		assert.Greater(t, scheduledPosts[1].ProcessedAt, int64(0))
	})
	t.Run("sets error code for archived user", func(t *testing.T) {
		th := Setup(t).InitBasic(t)
		th.App.Srv().SetLicense(getLicWithSkuShortName(model.LicenseShortSkuProfessional))
		scheduledAt := model.GetMillis() + 1000
		scheduledPost1 := &model.ScheduledPost{
			Draft: model.Draft{
				CreateAt:  model.GetMillis(),
				UserId:    th.BasicUser.Id,
				ChannelId: th.BasicChannel.Id,
				Message:   "this is a scheduled post",
			},
			ScheduledAt: scheduledAt,
		}
		_, err := th.Server.Store().ScheduledPost().CreateScheduledPost(scheduledPost1)
		assert.NoError(t, err)
		scheduledPost2 := &model.ScheduledPost{
			Draft: model.Draft{
				CreateAt:  model.GetMillis(),
				UserId:    th.BasicUser.Id,
				ChannelId: th.BasicChannel.Id,
				Message:   "this is second scheduled post",
			},
			ScheduledAt: scheduledAt,
		}
		_, err = th.Server.Store().ScheduledPost().CreateScheduledPost(scheduledPost2)
		assert.NoError(t, err)
		_, appErr := th.App.UpdateActive(th.Context, th.BasicUser, false)
		assert.Nil(t, appErr)
		defer func() {
			_, _ = th.App.UpdateActive(th.Context, th.BasicUser, true)
		}()
		time.Sleep(1 * time.Second)
		th.App.ProcessScheduledPosts(th.Context)
		scheduledPosts, err := th.App.Srv().Store().ScheduledPost().GetScheduledPostsForUser(th.BasicUser.Id, th.BasicChannel.TeamId)
		assert.NoError(t, err)
		assert.Len(t, scheduledPosts, 2)
		assert.Equal(t, model.ScheduledPostErrorCodeUserDeleted, scheduledPosts[0].ErrorCode)
		assert.Greater(t, scheduledPosts[0].ProcessedAt, int64(0))
		assert.Equal(t, model.ScheduledPostErrorCodeUserDeleted, scheduledPosts[1].ErrorCode)
		assert.Greater(t, scheduledPosts[1].ProcessedAt, int64(0))
	})
	t.Run("sets error code when user is not a channel member", func(t *testing.T) {
		th := Setup(t).InitBasic(t)
		th.App.Srv().SetLicense(getLicWithSkuShortName(model.LicenseShortSkuProfessional))
		scheduledAt := model.GetMillis() + 1000
		scheduledPost1 := &model.ScheduledPost{
			Draft: model.Draft{
				CreateAt:  model.GetMillis(),
				UserId:    th.BasicUser.Id,
				ChannelId: th.BasicChannel.Id,
				Message:   "this is a scheduled post",
			},
			ScheduledAt: scheduledAt,
		}
		_, err := th.Server.Store().ScheduledPost().CreateScheduledPost(scheduledPost1)
		assert.NoError(t, err)
		scheduledPost2 := &model.ScheduledPost{
			Draft: model.Draft{
				CreateAt:  model.GetMillis(),
				UserId:    th.BasicUser.Id,
				ChannelId: th.BasicChannel.Id,
				Message:   "this is second scheduled post",
			},
			ScheduledAt: scheduledAt,
		}
		_, err = th.Server.Store().ScheduledPost().CreateScheduledPost(scheduledPost2)
		assert.NoError(t, err)
		appErr := th.App.LeaveChannel(th.Context, th.BasicChannel.Id, th.BasicUser.Id)
		assert.Nil(t, appErr)
		defer func() {
			_ = th.App.JoinChannel(th.Context, th.BasicChannel, th.BasicUser.Id)
		}()
		time.Sleep(1 * time.Second)
		th.App.ProcessScheduledPosts(th.Context)
		scheduledPosts, err := th.App.Srv().Store().ScheduledPost().GetScheduledPostsForUser(th.BasicUser.Id, th.BasicChannel.TeamId)
		assert.NoError(t, err)
		assert.Len(t, scheduledPosts, 2)
		assert.Equal(t, model.ScheduledPostErrorCodeNoChannelPermission, scheduledPosts[0].ErrorCode)
		assert.Greater(t, scheduledPosts[0].ProcessedAt, int64(0))
		assert.Equal(t, model.ScheduledPostErrorCodeNoChannelPermission, scheduledPosts[1].ErrorCode)
		assert.Greater(t, scheduledPosts[1].ProcessedAt, int64(0))
	})
	t.Run("sets error code when user is not a team member", func(t *testing.T) {
		th := Setup(t).InitBasic(t)
		th.App.Srv().SetLicense(getLicWithSkuShortName(model.LicenseShortSkuProfessional))
		scheduledAt := model.GetMillis() + 1000
		scheduledPost1 := &model.ScheduledPost{
			Draft: model.Draft{
				CreateAt:  model.GetMillis(),
				UserId:    th.BasicUser.Id,
				ChannelId: th.BasicChannel.Id,
				Message:   "this is a scheduled post",
			},
			ScheduledAt: scheduledAt,
		}
		_, err := th.Server.Store().ScheduledPost().CreateScheduledPost(scheduledPost1)
		assert.NoError(t, err)
		scheduledPost2 := &model.ScheduledPost{
			Draft: model.Draft{
				CreateAt:  model.GetMillis(),
				UserId:    th.BasicUser.Id,
				ChannelId: th.BasicChannel.Id,
				Message:   "this is second scheduled post",
			},
			ScheduledAt: scheduledAt,
		}
		_, err = th.Server.Store().ScheduledPost().CreateScheduledPost(scheduledPost2)
		assert.NoError(t, err)
		appErr := th.App.RemoveUserFromTeam(th.Context, th.BasicTeam.Id, th.BasicUser.Id, th.BasicUser.Id)
		assert.Nil(t, appErr)
		defer func() {
			_, _, _ = th.App.AddUserToTeam(th.Context, th.BasicTeam.Id, th.BasicUser.Id, th.BasicUser.Id)
		}()
		time.Sleep(1 * time.Second)
		th.App.ProcessScheduledPosts(th.Context)
		scheduledPosts, err := th.App.Srv().Store().ScheduledPost().GetScheduledPostsForUser(th.BasicUser.Id, th.BasicChannel.TeamId)
		assert.NoError(t, err)
		assert.Len(t, scheduledPosts, 2)
		assert.Equal(t, model.ScheduledPostErrorCodeNoChannelPermission, scheduledPosts[0].ErrorCode)
		assert.Greater(t, scheduledPosts[0].ProcessedAt, int64(0))
		assert.Equal(t, model.ScheduledPostErrorCodeNoChannelPermission, scheduledPosts[1].ErrorCode)
		assert.Greater(t, scheduledPosts[1].ProcessedAt, int64(0))
	})
}
func TestHandleFailedScheduledPosts(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	t.Run("should handle failed scheduled posts correctly and notify users about failure via system-bot", func(t *testing.T) {
		rctx := th.Context
		var err error
		var appErr *model.AppError
		var systemBot *model.Bot
		systemBot, appErr = th.App.GetSystemBot(rctx)
		assert.True(t, appErr == nil)
		assert.NotNil(t, systemBot)
		user1 := th.BasicUser
		user2 := th.BasicUser2
		channel1 := th.BasicChannel
		channel2 := th.CreateChannel(t, th.BasicTeam)
		failedScheduledPosts := []*model.ScheduledPost{
			{
				Id: model.NewId(),
				Draft: model.Draft{
					CreateAt:  model.GetMillis(),
					UserId:    user1.Id,
					ChannelId: channel1.Id,
					Message:   "Failed scheduled post for user 1",
				},
				ErrorCode: model.ScheduledPostErrorUnknownError,
			},
			{
				Id: model.NewId(),
				Draft: model.Draft{
					CreateAt:  model.GetMillis(),
					UserId:    user2.Id,
					ChannelId: channel1.Id,
					Message:   "Failed scheduled post 1 for user 2",
				},
				ErrorCode: model.ScheduledPostErrorCodeNoChannelPermission,
			},
			{
				Id: model.NewId(),
				Draft: model.Draft{
					CreateAt:  model.GetMillis(),
					UserId:    user2.Id,
					ChannelId: channel2.Id,
					Message:   "Failed scheduled post 2 for user 2",
				},
				ErrorCode: model.ScheduledPostErrorNoChannelMember,
			},
		}
		for _, sp := range failedScheduledPosts {
			_, err = th.Server.Store().ScheduledPost().CreateScheduledPost(sp)
			assert.NoError(t, err)
		}
		messagesUser1, closeWSUser1 := connectFakeWebSocket(t, th, user1.Id, "", []model.WebsocketEventType{model.WebsocketScheduledPostUpdated})
		defer closeWSUser1()
		messagesUser2, closeWSUser2 := connectFakeWebSocket(t, th, user2.Id, "", []model.WebsocketEventType{model.WebsocketScheduledPostUpdated})
		defer closeWSUser2()
		th.App.handleFailedScheduledPosts(rctx, failedScheduledPosts)
		for i := range failedScheduledPosts {
			var received *model.WebSocketEvent
			select {
			case received = <-messagesUser1:
				if received.GetBroadcast().UserId == user1.Id {
					assert.Equal(t, model.WebsocketScheduledPostUpdated, received.EventType())
				}
			case received = <-messagesUser2:
				if received.GetBroadcast().UserId == user2.Id {
					assert.Equal(t, model.WebsocketScheduledPostUpdated, received.EventType())
				}
			case <-time.After(3 * time.Second):
				t.Errorf("Timeout while waiting for a WebSocket event for scheduled post %d", i+1)
			}
		}
		checkUserNotification := func(user *model.User) {
			timeout := 5 * time.Second
			begin := time.Now()
			channel, appErr := th.App.GetOrCreateDirectChannel(rctx, user.Id, systemBot.UserId)
			assert.True(t, appErr == nil)
			var posts *model.PostList
			for {
				if time.Since(begin) > timeout {
					break
				}
				posts, appErr = th.App.GetPosts(th.Context, channel.Id, 0, 10)
				assert.True(t, appErr == nil)
				if len(posts.Posts) > 0 {
					break
				}
				time.Sleep(100 * time.Millisecond)
			}
			assert.NotEmpty(t, posts.Posts, "Expected notification for user %s to have been sent", user.Id)
			var userFailedMessages []*model.ScheduledPost
			for _, sp := range failedScheduledPosts {
				if sp.UserId == user.Id {
					userFailedMessages = append(userFailedMessages, sp)
				}
			}
			T := i18n.GetUserTranslations(user.Locale)
			messageHeader := T("app.scheduled_post.failed_messages", map[string]any{
				"Count": len(userFailedMessages),
			})
			found := false
			for _, post := range posts.Posts {
				if post.UserId == systemBot.UserId && strings.HasPrefix(post.Message, messageHeader) {
					found = true
					break
				}
			}
			assert.True(t, found, "\nNotification post not found for user %s with expected message prefix. \n Expected: %s \n", user.Id, messageHeader)
		}
		checkUserNotification(user1)
		checkUserNotification(user2)
	})
}