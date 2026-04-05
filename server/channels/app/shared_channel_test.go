package app
import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/platform/services/remotecluster"
	"github.com/mattermost/mattermost/server/v8/platform/services/sharedchannel"
)
func setupSharedChannels(tb testing.TB) *TestHelper {
	return SetupConfig(tb, func(cfg *model.Config) {
		*cfg.ConnectedWorkspacesSettings.EnableRemoteClusterService = true
		*cfg.ConnectedWorkspacesSettings.EnableSharedChannels = true
		cfg.FeatureFlags.EnableSharedChannelsMemberSync = true
		cfg.ClusterSettings.ClusterName = model.NewPointer("test-remote")
	})
}
func TestApp_CheckCanInviteToSharedChannel(t *testing.T) {
	mainHelper.Parallel(t)
	th := setupSharedChannels(t).InitBasic(t)
	channel1 := th.CreateChannel(t, th.BasicTeam)
	channel2 := th.CreateChannel(t, th.BasicTeam)
	channel3 := th.CreateChannel(t, th.BasicTeam)
	data := []struct {
		channelID string
		home      bool
		name      string
		remoteID  string
	}{
		{channelID: channel1.Id, home: true, name: "test_home", remoteID: ""},
		{channelID: channel2.Id, home: false, name: "test_remote", remoteID: model.NewId()},
	}
	for _, d := range data {
		sc := &model.SharedChannel{
			ChannelId: d.channelID,
			TeamId:    th.BasicTeam.Id,
			Home:      d.home,
			ShareName: d.name,
			CreatorId: th.BasicUser.Id,
			RemoteId:  d.remoteID,
		}
		_, err := th.App.ShareChannel(th.Context, sc)
		require.NoError(t, err)
	}
	t.Run("Test checkChannelNotShared: not yet shared channel", func(t *testing.T) {
		err := th.App.checkChannelNotShared(th.Context, channel3.Id)
		assert.NoError(t, err, "unshared channel should not error")
	})
	t.Run("Test checkChannelNotShared: already shared channel", func(t *testing.T) {
		err := th.App.checkChannelNotShared(th.Context, channel1.Id)
		assert.Error(t, err, "already shared channel should error")
	})
	t.Run("Test checkChannelNotShared: invalid channel", func(t *testing.T) {
		err := th.App.checkChannelNotShared(th.Context, model.NewId())
		assert.Error(t, err, "invalid channel should error")
	})
	t.Run("Test checkChannelIsShared: not yet shared channel", func(t *testing.T) {
		err := th.App.checkChannelIsShared(channel3.Id)
		assert.Error(t, err, "unshared channel should error")
	})
	t.Run("Test checkChannelIsShared: already shared channel", func(t *testing.T) {
		err := th.App.checkChannelIsShared(channel1.Id)
		assert.NoError(t, err, "already channel should not error")
	})
	t.Run("Test checkChannelIsShared: invalid channel", func(t *testing.T) {
		err := th.App.checkChannelIsShared(model.NewId())
		assert.Error(t, err, "invalid channel should error")
	})
	t.Run("Test CheckCanInviteToSharedChannel: Home shared channel", func(t *testing.T) {
		err := th.App.CheckCanInviteToSharedChannel(data[0].channelID)
		assert.NoError(t, err, "home channel should allow invites")
	})
	t.Run("Test CheckCanInviteToSharedChannel: Remote shared channel", func(t *testing.T) {
		err := th.App.CheckCanInviteToSharedChannel(data[1].channelID)
		assert.Error(t, err, "home channel should not allow invites")
	})
	t.Run("Test CheckCanInviteToSharedChannel: Invalid shared channel", func(t *testing.T) {
		err := th.App.CheckCanInviteToSharedChannel(model.NewId())
		assert.Error(t, err, "invalid channel should not allow invites")
	})
}
func TestApp_RemoteUnsharing(t *testing.T) {
	th := setupSharedChannels(t).InitBasic(t)
	ss := th.App.Srv().Store()
	scsInterface := th.App.Srv().GetSharedChannelSyncService()
	service, ok := scsInterface.(*sharedchannel.Service)
	require.True(t, ok, "Expected sharedchannel.Service concrete type")
	err := service.Start()
	require.NoError(t, err)
	rcService := th.App.Srv().GetRemoteClusterService()
	if rcService != nil {
		_ = rcService.Start()
	}
	t.Run("remote-initiated unshare with single remote", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var syncHandler *SelfReferentialSyncHandler
		testServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if syncHandler != nil {
				syncHandler.HandleRequest(w, r)
			} else {
				writeOKResponse(w)
			}
		}))
		defer testServer.Close()
		selfCluster := &model.RemoteCluster{
			RemoteId:     model.NewId(),
			Name:         "test-remote",
			DisplayName:  "Test Remote",
			SiteURL:      testServer.URL,
			Token:        model.NewId(),
			CreateAt:     model.GetMillis(),
			LastPingAt:   model.GetMillis(),
			CreatorId:    th.BasicUser.Id,
			RemoteTeamId: model.NewId(),
		}
		selfCluster, err = ss.RemoteCluster().Save(selfCluster)
		require.NoError(t, err)
		syncHandler = NewSelfReferentialSyncHandler(t, service, selfCluster)
		channel := th.CreateChannel(t, th.BasicTeam)
		sc := &model.SharedChannel{
			ChannelId:        channel.Id,
			TeamId:           channel.TeamId,
			Home:             true,
			ReadOnly:         false,
			ShareName:        channel.Name,
			ShareDisplayName: channel.DisplayName,
			SharePurpose:     channel.Purpose,
			ShareHeader:      channel.Header,
			CreatorId:        th.BasicUser.Id,
			RemoteId:         "",
		}
		_, err = th.App.ShareChannel(th.Context, sc)
		require.NoError(t, err)
		scr := &model.SharedChannelRemote{
			Id:                model.NewId(),
			ChannelId:         channel.Id,
			CreatorId:         th.BasicUser.Id,
			IsInviteAccepted:  true,
			IsInviteConfirmed: true,
			RemoteId:          selfCluster.RemoteId,
			LastPostUpdateAt:  model.GetMillis(),
		}
		_, err = ss.SharedChannel().SaveRemote(scr)
		require.NoError(t, err)
		postsBeforeRemove, appErr := th.App.GetPostsPage(th.Context, model.GetPostsOptions{
			ChannelId: channel.Id,
			Page:      0,
			PerPage:   10,
		})
		require.Nil(t, appErr)
		postCountBefore := len(postsBeforeRemove.Posts)
		err = th.App.checkChannelIsShared(channel.Id)
		require.NoError(t, err, "Channel should be shared initially")
		err = th.App.checkChannelIsShared(channel.Id)
		require.NoError(t, err, "Channel should be shared initially")
		syncMsg := model.NewSyncMsg(channel.Id)
		syncMsg.Posts = []*model.Post{{
			Id:        model.NewId(),
			ChannelId: channel.Id,
			UserId:    th.BasicUser.Id,
			Message:   "Test message after remote unshare",
			CreateAt:  model.GetMillis(),
		}}
		service.HandleChannelNotSharedErrorForTesting(syncMsg, selfCluster)
		err = th.App.checkChannelIsShared(channel.Id)
		assert.Error(t, err, "Channel should no longer be shared after error handling")
		postsAfterRemove, appErr := th.App.GetPostsPage(th.Context, model.GetPostsOptions{
			ChannelId: channel.Id,
			Page:      0,
			PerPage:   10,
		})
		require.Nil(t, appErr)
		assert.Equal(t, postCountBefore+1, len(postsAfterRemove.Posts), "There should be one new post")
		var systemPost *model.Post
		for _, p := range postsAfterRemove.Posts {
			if p.Type == model.PostTypeSystemGeneric {
				systemPost = p
				break
			}
		}
		require.NotNil(t, systemPost, "A system post should be created")
		assert.Equal(t, "This channel is no longer shared.", systemPost.Message, "Message should match unshare message")
	})
	t.Run("remote-initiated unshare with multiple remotes", func(t *testing.T) {
		EnsureCleanState(t, th, ss)
		var syncHandler1, syncHandler2 *SelfReferentialSyncHandler
		testServer1 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if syncHandler1 != nil {
				syncHandler1.HandleRequest(w, r)
			} else {
				writeOKResponse(w)
			}
		}))
		defer testServer1.Close()
		testServer2 := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if syncHandler2 != nil {
				syncHandler2.HandleRequest(w, r)
			} else {
				writeOKResponse(w)
			}
		}))
		defer testServer2.Close()
		selfCluster1 := &model.RemoteCluster{
			RemoteId:     model.NewId(),
			Name:         "test-remote-1",
			DisplayName:  "Test Remote 1",
			SiteURL:      testServer1.URL,
			Token:        model.NewId(),
			CreateAt:     model.GetMillis(),
			LastPingAt:   model.GetMillis(),
			CreatorId:    th.BasicUser.Id,
			RemoteTeamId: model.NewId(),
		}
		selfCluster1, err = ss.RemoteCluster().Save(selfCluster1)
		require.NoError(t, err)
		selfCluster2 := &model.RemoteCluster{
			RemoteId:     model.NewId(),
			Name:         "test-remote-2",
			DisplayName:  "Test Remote 2",
			SiteURL:      testServer2.URL,
			Token:        model.NewId(),
			CreateAt:     model.GetMillis(),
			LastPingAt:   model.GetMillis(),
			CreatorId:    th.BasicUser.Id,
			RemoteTeamId: model.NewId(),
		}
		selfCluster2, err = ss.RemoteCluster().Save(selfCluster2)
		require.NoError(t, err)
		syncHandler1 = NewSelfReferentialSyncHandler(t, service, selfCluster1)
		syncHandler2 = NewSelfReferentialSyncHandler(t, service, selfCluster2)
		channel := th.CreateChannel(t, th.BasicTeam)
		sc := &model.SharedChannel{
			ChannelId:        channel.Id,
			TeamId:           channel.TeamId,
			Home:             true,
			ReadOnly:         false,
			ShareName:        channel.Name,
			ShareDisplayName: channel.DisplayName,
			SharePurpose:     channel.Purpose,
			ShareHeader:      channel.Header,
			CreatorId:        th.BasicUser.Id,
			RemoteId:         "",
		}
		_, err = th.App.ShareChannel(th.Context, sc)
		require.NoError(t, err)
		scr1 := &model.SharedChannelRemote{
			Id:                model.NewId(),
			ChannelId:         channel.Id,
			CreatorId:         th.BasicUser.Id,
			IsInviteAccepted:  true,
			IsInviteConfirmed: true,
			RemoteId:          selfCluster1.RemoteId,
			LastPostUpdateAt:  model.GetMillis(),
		}
		_, err = ss.SharedChannel().SaveRemote(scr1)
		require.NoError(t, err)
		scr2 := &model.SharedChannelRemote{
			Id:                model.NewId(),
			ChannelId:         channel.Id,
			CreatorId:         th.BasicUser.Id,
			IsInviteAccepted:  true,
			IsInviteConfirmed: true,
			RemoteId:          selfCluster2.RemoteId,
			LastPostUpdateAt:  model.GetMillis(),
		}
		_, err = ss.SharedChannel().SaveRemote(scr2)
		require.NoError(t, err)
		hasRemote1, err := ss.SharedChannel().HasRemote(channel.Id, selfCluster1.RemoteId)
		require.NoError(t, err)
		require.True(t, hasRemote1, "Channel should be shared with remote 1")
		hasRemote2, err := ss.SharedChannel().HasRemote(channel.Id, selfCluster2.RemoteId)
		require.NoError(t, err)
		require.True(t, hasRemote2, "Channel should be shared with remote 2")
		err = th.App.checkChannelIsShared(channel.Id)
		require.NoError(t, err, "Channel should be shared initially")
		post := &model.Post{
			ChannelId: channel.Id,
			UserId:    th.BasicUser.Id,
			Message:   "Test message after remote 1 unshare",
		}
		_, _, appErr := th.App.CreatePost(th.Context, post, channel, model.CreatePostFlags{})
		require.Nil(t, appErr)
		postsBeforeRemove, appErr := th.App.GetPostsPage(th.Context, model.GetPostsOptions{
			ChannelId: channel.Id,
			Page:      0,
			PerPage:   10,
		})
		require.Nil(t, appErr)
		postCountBefore := len(postsBeforeRemove.Posts)
		syncMsg := model.NewSyncMsg(channel.Id)
		syncMsg.Posts = []*model.Post{{
			Id:        model.NewId(),
			ChannelId: channel.Id,
			UserId:    th.BasicUser.Id,
			Message:   "Test message after remote 1 unshare",
			CreateAt:  model.GetMillis(),
		}}
		service.HandleChannelNotSharedErrorForTesting(syncMsg, selfCluster1)
		remotes, err := ss.SharedChannel().GetRemotes(0, 10, model.SharedChannelRemoteFilterOpts{
			ChannelId: channel.Id,
		})
		require.NoError(t, err)
		require.Len(t, remotes, 1, "Expected 1 remote after removing remote 1")
		t.Logf("Number of remotes after unshare: %d", len(remotes))
		err = th.App.checkChannelIsShared(channel.Id)
		assert.NoError(t, err, "Channel should still be shared with other remotes")
		hasRemote1After, err := ss.SharedChannel().HasRemote(channel.Id, selfCluster1.RemoteId)
		require.NoError(t, err)
		require.False(t, hasRemote1After, "Channel should no longer be shared with remote 1")
		hasRemote2After, err := ss.SharedChannel().HasRemote(channel.Id, selfCluster2.RemoteId)
		require.NoError(t, err)
		assert.True(t, hasRemote2After, "Channel should still be shared with remote 2")
		postsAfterRemove, appErr := th.App.GetPostsPage(th.Context, model.GetPostsOptions{
			ChannelId: channel.Id,
			Page:      0,
			PerPage:   10,
		})
		require.Nil(t, appErr)
		assert.Equal(t, postCountBefore+1, len(postsAfterRemove.Posts), "There should be one new post")
		var systemPost *model.Post
		for _, p := range postsAfterRemove.Posts {
			if p.Type == model.PostTypeSystemGeneric {
				systemPost = p
				break
			}
		}
		require.NotNil(t, systemPost, "A system post should be created")
		assert.Equal(t, "This channel is no longer shared.", systemPost.Message, "Message should match unshare message")
	})
}
func TestSyncMessageErrChannelNotSharedResponse(t *testing.T) {
	th := setupSharedChannels(t).InitBasic(t)
	ss := th.App.Srv().Store()
	scsInterface := th.App.Srv().GetSharedChannelSyncService()
	service, ok := scsInterface.(*sharedchannel.Service)
	require.True(t, ok, "Expected sharedchannel.Service concrete type")
	channel := th.CreateChannel(t, th.BasicTeam)
	sc := &model.SharedChannel{
		ChannelId:        channel.Id,
		TeamId:           th.BasicTeam.Id,
		Home:             true,
		ShareName:        channel.Name,
		ShareDisplayName: channel.DisplayName,
		CreatorId:        th.BasicUser.Id,
		RemoteId:         "",
	}
	_, err := ss.SharedChannel().Save(sc)
	require.NoError(t, err)
	selfCluster := &model.RemoteCluster{
		RemoteId:     model.NewId(),
		Name:         "test-remote",
		DisplayName:  "Test Remote",
		SiteURL:      "https://test.example.com",
		Token:        model.NewId(),
		CreateAt:     model.GetMillis(),
		LastPingAt:   model.GetMillis(),
		CreatorId:    th.BasicUser.Id,
		RemoteTeamId: model.NewId(),
	}
	selfCluster, err = ss.RemoteCluster().Save(selfCluster)
	require.NoError(t, err)
	scr := &model.SharedChannelRemote{
		Id:                model.NewId(),
		ChannelId:         channel.Id,
		CreatorId:         th.BasicUser.Id,
		IsInviteAccepted:  true,
		IsInviteConfirmed: true,
		RemoteId:          selfCluster.RemoteId,
		LastPostCreateAt:  model.GetMillis(),
		LastPostUpdateAt:  model.GetMillis(),
	}
	_, err = ss.SharedChannel().SaveRemote(scr)
	require.NoError(t, err)
	hasRemote, err := ss.SharedChannel().HasRemote(channel.Id, selfCluster.RemoteId)
	require.NoError(t, err)
	require.True(t, hasRemote, "Channel should be shared with remote initially")
	syncMsg := model.NewSyncMsg(channel.Id)
	syncMsg.Posts = []*model.Post{{
		Id:        model.NewId(),
		ChannelId: channel.Id,
		UserId:    th.BasicUser.Id,
		Message:   "Test sync message",
		CreateAt:  model.GetMillis(),
	}}
	response := &remotecluster.Response{
		Status: "fail",
		Err:    "cannot process sync message; channel is no longer shared: " + channel.Id,
	}
	var callbackTriggered bool
	mockCallback := func(rcMsg model.RemoteClusterMsg, rc *model.RemoteCluster, rcResp *remotecluster.Response, errResp error) {
		callbackTriggered = true
		if rcResp != nil && !rcResp.IsSuccess() && strings.Contains(rcResp.Err, "channel is no longer shared") {
			service.HandleChannelNotSharedErrorForTesting(syncMsg, rc)
		}
	}
	mockCallback(model.RemoteClusterMsg{}, selfCluster, response, nil)
	require.True(t, callbackTriggered, "Callback should have been triggered")
	hasRemoteAfter, err := ss.SharedChannel().HasRemote(channel.Id, selfCluster.RemoteId)
	require.NoError(t, err)
	require.False(t, hasRemoteAfter, "Channel should no longer be shared with remote after error")
	posts, appErr := th.App.GetPostsPage(th.Context, model.GetPostsOptions{
		ChannelId: channel.Id,
		Page:      0,
		PerPage:   10,
	})
	require.Nil(t, appErr)
	var systemPost *model.Post
	for _, p := range posts.Posts {
		if p.Type == model.PostTypeSystemGeneric && p.Message == "This channel is no longer shared." {
			systemPost = p
			break
		}
	}
	require.NotNil(t, systemPost, "System message should be posted when channel becomes unshared")
}
func TestTransformMentionsOnReceive(t *testing.T) {
	mainHelper.Parallel(t)
	th := setupSharedChannels(t).InitBasic(t)
	sharedChannel := th.CreateChannel(t, th.BasicTeam)
	sc := &model.SharedChannel{
		ChannelId: sharedChannel.Id,
		TeamId:    th.BasicTeam.Id,
		Home:      true,
		ShareName: "testchannel",
		CreatorId: th.BasicUser.Id,
	}
	_, err := th.App.ShareChannel(th.Context, sc)
	require.NoError(t, err)
	remoteCluster := &model.RemoteCluster{
		RemoteId:    model.NewId(),
		Name:        "remote1",
		DisplayName: "Remote 1",
		SiteURL:     "http://remote1.example.com",
		Token:       model.NewId(),
		CreatorId:   th.BasicUser.Id,
		CreateAt:    model.GetMillis(),
		LastPingAt:  model.GetMillis(),
	}
	savedRemoteCluster, appErr := th.App.AddRemoteCluster(remoteCluster)
	require.Nil(t, appErr)
	scs := th.App.Srv().Platform().GetSharedChannelService()
	require.NotNil(t, scs)
	concreteScs, ok := scs.(*sharedchannel.Service)
	require.True(t, ok)
	createUser := func(username string, remoteId *string) *model.User {
		user := th.CreateUser(t)
		user.Username = username
		if remoteId != nil {
			user.RemoteId = remoteId
		}
		user, updateErr := th.App.UpdateUser(th.Context, user, false)
		require.Nil(t, updateErr)
		th.LinkUserToTeam(t, user, th.BasicTeam)
		th.AddUserToChannel(t, user, sharedChannel)
		return user
	}
	testTransformation := func(originalMessage string, mentionTransforms map[string]string, expectedMessage string, description string) {
		post := &model.Post{
			Id:        model.NewId(),
			ChannelId: sharedChannel.Id,
			UserId:    th.BasicUser.Id,
			Message:   originalMessage,
		}
		t.Logf("Testing: %s", description)
		t.Logf("  Original: %s", originalMessage)
		t.Logf("  Transforms: %v", mentionTransforms)
		concreteScs.TransformMentionsOnReceiveForTesting(th.Context, post, sharedChannel, savedRemoteCluster, mentionTransforms)
		t.Logf("  Result: %s", post.Message)
		t.Logf("  Expected: %s", expectedMessage)
		require.Equal(t, expectedMessage, post.Message, description)
	}
	t.Run("Scenario 1.1: Remote mentions local user (simple mention)", func(t *testing.T) {
		remoteUser := createUser("admin:remote1", &savedRemoteCluster.RemoteId)
		mentionTransforms := map[string]string{
			"admin": remoteUser.Id,
		}
		testTransformation(
			"Hello @admin, can you help?",
			mentionTransforms,
			"Hello @admin:remote1, can you help?",
			"Simple mention of synced remote user should use synced username",
		)
	})
	t.Run("Scenario 1.2: Remote mentions local user (different username)", func(t *testing.T) {
		remoteUser := createUser("user:remote1", &savedRemoteCluster.RemoteId)
		mentionTransforms := map[string]string{
			"user": remoteUser.Id,
		}
		testTransformation(
			"Hello @user, can you help?",
			mentionTransforms,
			"Hello @user:remote1, can you help?",
			"Simple mention of different synced remote user should use synced username",
		)
	})
	t.Run("Scenario 2.1: Remote mentions with colon (local user)", func(t *testing.T) {
		localUser := createUser("admin", nil)
		mentionTransforms := map[string]string{
			"admin:remote1": localUser.Id,
		}
		testTransformation(
			"Hello @admin:remote1, can you help?",
			mentionTransforms,
			"Hello @admin, can you help?",
			"Colon mention of local user should strip cluster suffix",
		)
	})
	t.Run("Scenario 2.2: Remote mentions with colon (different local user)", func(t *testing.T) {
		localUser := createUser("user", nil)
		mentionTransforms := map[string]string{
			"user:remote1": localUser.Id,
		}
		testTransformation(
			"Hello @user:remote1, can you help?",
			mentionTransforms,
			"Hello @user, can you help?",
			"Colon mention of different local user should strip cluster suffix",
		)
	})
	t.Run("Scenario A1: Name clash - remote user mention, local user exists", func(t *testing.T) {
		_ = createUser("alice", nil)
		remoteUser := createUser("alice:remote1", &savedRemoteCluster.RemoteId)
		mentionTransforms := map[string]string{
			"alice": remoteUser.Id,
		}
		testTransformation(
			"Hello @alice, can you help?",
			mentionTransforms,
			"Hello @alice:remote1, can you help?",
			"Matrix A1: Remote user mention with local name clash should add cluster suffix",
		)
	})
	t.Run("Scenario A2: Same user - previously synced", func(t *testing.T) {
		syncedUser := createUser("bob:remote1", &savedRemoteCluster.RemoteId)
		mentionTransforms := map[string]string{
			"bob": syncedUser.Id,
		}
		testTransformation(
			"Hello @bob, can you help?",
			mentionTransforms,
			"Hello @bob:remote1, can you help?",
			"Matrix A2: Previously synced user should display synced username",
		)
	})
	t.Run("Scenario A3: No user exists on receiver", func(t *testing.T) {
		nonExistentUserId := model.NewId()
		mentionTransforms := map[string]string{
			"charlie": nonExistentUserId,
		}
		testTransformation(
			"Hello @charlie, can you help?",
			mentionTransforms,
			"Hello @charlie:remote1, can you help?",
			"Matrix A3: Unknown user should get cluster suffix",
		)
	})
	t.Run("Scenario B1: User exists on origin with same ID", func(t *testing.T) {
		localUser := createUser("dave", nil)
		mentionTransforms := map[string]string{
			"dave:remote1": localUser.Id,
		}
		testTransformation(
			"Hello @dave:remote1, can you help?",
			mentionTransforms,
			"Hello @dave, can you help?",
			"Matrix B1: Remote mention of local user should strip cluster suffix",
		)
	})
	t.Run("Scenario B2: User does not exist on origin", func(t *testing.T) {
		nonExistentUserId := model.NewId()
		mentionTransforms := map[string]string{
			"eve:remote1": nonExistentUserId,
		}
		testTransformation(
			"Hello @eve:remote1, can you help?",
			mentionTransforms,
			"Hello @eve:remote1, can you help?",
			"Matrix B2: Unknown colon mention should remain unchanged",
		)
	})
	t.Run("Empty mentionTransforms", func(t *testing.T) {
		mentionTransforms := map[string]string{}
		testTransformation(
			"Hello @anyone, can you help?",
			mentionTransforms,
			"Hello @anyone, can you help?",
			"Message without transforms should remain unchanged",
		)
	})
	t.Run("Mixed scenarios in single message", func(t *testing.T) {
		localUser := createUser("frank", nil)
		remoteUser := createUser("george:remote1", &savedRemoteCluster.RemoteId)
		mentionTransforms := map[string]string{
			"frank:remote1": localUser.Id,
			"george":        remoteUser.Id,
		}
		testTransformation(
			"Hello @frank:remote1 and @george, let's collaborate!",
			mentionTransforms,
			"Hello @frank and @george:remote1, let's collaborate!",
			"Mixed mention types should transform correctly",
		)
	})
	t.Run("Colon mention of remote user", func(t *testing.T) {
		remoteUser := createUser("guest:remote1", &savedRemoteCluster.RemoteId)
		mentionTransforms := map[string]string{
			"guest:remote1": remoteUser.Id,
		}
		testTransformation(
			"Hello @guest:remote1, welcome!",
			mentionTransforms,
			"Hello @guest:remote1, welcome!",
			"Colon mention of remote user should use synced username",
		)
	})
	t.Run("Performance: Large message with many mentions", func(t *testing.T) {
		user1 := createUser("user1:remote1", &savedRemoteCluster.RemoteId)
		user2 := createUser("user2:remote1", &savedRemoteCluster.RemoteId)
		user3 := createUser("user3:remote1", &savedRemoteCluster.RemoteId)
		mentionTransforms := map[string]string{
			"user1": user1.Id,
			"user2": user2.Id,
			"user3": user3.Id,
		}
		testTransformation(
			"Meeting with @user1, @user2, and @user3 about @user1's proposal. @user2 will present, @user3 will take notes.",
			mentionTransforms,
			"Meeting with @user1:remote1, @user2:remote1, and @user3:remote1 about @user1:remote1's proposal. @user2:remote1 will present, @user3:remote1 will take notes.",
			"Multiple mentions should transform efficiently",
		)
	})
}