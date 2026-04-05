package api4
import (
	"context"
	"testing"
	"time"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/v8/channels/utils/testutils"
)
func TestUpsertDraft(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	th.App.UpdateConfig(func(cfg *model.Config) { *cfg.ServiceSettings.AllowSyncedDrafts = true })
	client := th.Client
	channel := th.BasicChannel
	user := th.BasicUser
	draft := &model.Draft{
		CreateAt:  12345,
		UpdateAt:  12345,
		UserId:    user.Id,
		ChannelId: channel.Id,
		Message:   "original",
	}
	draftResp, _, err := client.UpsertDraft(context.Background(), draft)
	require.NoError(t, err)
	assert.Equal(t, draft.UserId, draftResp.UserId)
	assert.Equal(t, draft.Message, draftResp.Message)
	assert.Equal(t, draft.ChannelId, draftResp.ChannelId)
	sent, err := testutils.ReadTestFile("test.png")
	require.NoError(t, err)
	fileResp, _, err := client.UploadFile(context.Background(), sent, channel.Id, "test.png")
	require.NoError(t, err)
	draftWithFiles := draft
	draftWithFiles.FileIds = []string{fileResp.FileInfos[0].Id}
	draftResp, _, err = client.UpsertDraft(context.Background(), draftWithFiles)
	require.NoError(t, err)
	assert.Equal(t, draftWithFiles.UserId, draftResp.UserId)
	assert.Equal(t, draftWithFiles.Message, draftResp.Message)
	assert.Equal(t, draftWithFiles.ChannelId, draftResp.ChannelId)
	assert.ElementsMatch(t, draftWithFiles.FileIds, draftResp.FileIds)
	draftInvalidChannel := draft
	draftInvalidChannel.ChannelId = "12345"
	_, resp, err := client.UpsertDraft(context.Background(), draft)
	require.Error(t, err)
	CheckForbiddenStatus(t, resp)
	th.App.UpdateConfig(func(cfg *model.Config) { *cfg.ServiceSettings.AllowSyncedDrafts = false })
	_, resp, err = client.UpsertDraft(context.Background(), draft)
	require.Error(t, err)
	CheckNotImplementedStatus(t, resp)
}
func TestGetDrafts(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	th.App.UpdateConfig(func(cfg *model.Config) { *cfg.ServiceSettings.AllowSyncedDrafts = true })
	client := th.Client
	channel1 := th.BasicChannel
	channel2 := th.BasicChannel2
	user := th.BasicUser
	team := th.BasicTeam
	draft1 := &model.Draft{
		CreateAt:  00001,
		UserId:    user.Id,
		ChannelId: channel1.Id,
		Message:   "draft1",
	}
	draft2 := &model.Draft{
		CreateAt:  11111,
		UserId:    user.Id,
		ChannelId: channel2.Id,
		Message:   "draft2",
	}
	th.App.UpdateConfig(func(cfg *model.Config) { *cfg.ServiceSettings.AllowSyncedDrafts = true })
	_, _, err := client.UpsertDraft(context.Background(), draft1)
	require.NoError(t, err)
	time.Sleep(100 * time.Millisecond)
	_, _, err = client.UpsertDraft(context.Background(), draft2)
	require.NoError(t, err)
	draftResp, _, err := client.GetDrafts(context.Background(), user.Id, team.Id)
	require.NoError(t, err)
	assert.Equal(t, draft2.UserId, draftResp[0].UserId)
	assert.Equal(t, draft2.Message, draftResp[0].Message)
	assert.Equal(t, draft2.ChannelId, draftResp[0].ChannelId)
	assert.Equal(t, draft1.UserId, draftResp[1].UserId)
	assert.Equal(t, draft1.Message, draftResp[1].Message)
	assert.Equal(t, draft1.ChannelId, draftResp[1].ChannelId)
	assert.Len(t, draftResp, 2)
	_, resp, err := client.GetDrafts(context.Background(), user.Id, "12345")
	require.Error(t, err)
	CheckForbiddenStatus(t, resp)
	th.App.UpdateConfig(func(cfg *model.Config) { *cfg.ServiceSettings.AllowSyncedDrafts = false })
	_, resp, err = client.GetDrafts(context.Background(), user.Id, team.Id)
	require.Error(t, err)
	CheckNotImplementedStatus(t, resp)
}
func TestDeleteDraft(t *testing.T) {
	mainHelper.Parallel(t)
	th := Setup(t).InitBasic(t)
	th.App.UpdateConfig(func(cfg *model.Config) { *cfg.ServiceSettings.AllowSyncedDrafts = true })
	client := th.Client
	channel1 := th.BasicChannel
	channel2 := th.BasicChannel2
	user := th.BasicUser
	team := th.BasicTeam
	draft1 := &model.Draft{
		CreateAt:  00001,
		UserId:    user.Id,
		ChannelId: channel1.Id,
		Message:   "draft1",
		RootId:    "",
	}
	draft2 := &model.Draft{
		CreateAt:  11111,
		UserId:    user.Id,
		ChannelId: channel2.Id,
		Message:   "draft2",
		RootId:    model.NewId(),
	}
	_, _, err := client.UpsertDraft(context.Background(), draft1)
	require.NoError(t, err)
	time.Sleep(100 * time.Millisecond)
	_, _, err = client.UpsertDraft(context.Background(), draft2)
	require.NoError(t, err)
	draftResp, _, err := client.GetDrafts(context.Background(), user.Id, team.Id)
	require.NoError(t, err)
	assert.Equal(t, draft2.UserId, draftResp[0].UserId)
	assert.Equal(t, draft2.Message, draftResp[0].Message)
	assert.Equal(t, draft2.ChannelId, draftResp[0].ChannelId)
	assert.Equal(t, draft1.UserId, draftResp[1].UserId)
	assert.Equal(t, draft1.Message, draftResp[1].Message)
	assert.Equal(t, draft1.ChannelId, draftResp[1].ChannelId)
	_, _, err = client.DeleteDraft(context.Background(), user.Id, channel1.Id, draft1.RootId)
	require.NoError(t, err)
	draftResp, _, err = client.GetDrafts(context.Background(), user.Id, team.Id)
	require.NoError(t, err)
	assert.Equal(t, draft2.UserId, draftResp[0].UserId)
	assert.Equal(t, draft2.Message, draftResp[0].Message)
	assert.Equal(t, draft2.ChannelId, draftResp[0].ChannelId)
	assert.Len(t, draftResp, 1)
}