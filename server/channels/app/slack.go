package app
import (
	"bytes"
	"fmt"
	"image"
	"mime/multipart"
	"regexp"
	"strings"
	"time"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/request"
	"github.com/mattermost/mattermost/server/v8/channels/store"
	"github.com/mattermost/mattermost/server/v8/platform/services/slackimport"
)
func (a *App) SlackImport(rctx request.CTX, fileData multipart.File, fileSize int64, teamID string) (*model.AppError, *bytes.Buffer) {
	actions := slackimport.Actions{
		UpdateActive: func(user *model.User, active bool) (*model.User, *model.AppError) {
			return a.UpdateActive(rctx, user, active)
		},
		AddUserToChannel: a.AddUserToChannel,
		JoinUserToTeam: func(team *model.Team, user *model.User, userRequestorId string) (*model.TeamMember, *model.AppError) {
			return a.JoinUserToTeam(rctx, team, user, userRequestorId)
		},
		CreateDirectChannel: a.createDirectChannel,
		CreateGroupChannel:  a.createGroupChannel,
		CreateChannel: func(channel *model.Channel, addMember bool) (*model.Channel, *model.AppError) {
			return a.CreateChannel(rctx, channel, addMember)
		},
		DoUploadFile: func(now time.Time, rawTeamId string, rawChannelId string, rawUserId string, rawFilename string, data []byte) (*model.FileInfo, *model.AppError) {
			return a.DoUploadFile(rctx, now, rawTeamId, rawChannelId, rawUserId, rawFilename, data, true)
		},
		GenerateThumbnailImage: a.generateThumbnailImage,
		GeneratePreviewImage:   a.generatePreviewImage,
		InvalidateAllCaches:    func() *model.AppError { return a.ch.srv.platform.InvalidateAllCaches() },
		MaxPostSize:            func() int { return a.ch.srv.platform.MaxPostSize() },
		SendPasswordReset: func(email string) (bool, *model.AppError) {
			sent, err := a.SendPasswordReset(rctx, email, a.GetSiteURL())
			if err != nil {
				return false, err
			}
			return sent, nil
		},
		PrepareImage: func(fileData []byte) (image.Image, string, func(), error) {
			img, imgType, release, err := prepareImage(rctx, a.ch.imgDecoder, bytes.NewReader(fileData))
			if err != nil {
				return nil, "", nil, err
			}
			return img, imgType, release, err
		},
	}
	isAdminImport := false
	if rctx.Session() == nil {
		isAdminImport = true
		rctx.Logger().Info("Slack import initiated via CLI, treating as admin import")
	} else if rctx.Session().UserId != "" {
		if user, err := a.GetUser(rctx.Session().UserId); err == nil {
			isAdminImport = user.IsSystemAdmin()
		}
	}
	importer := slackimport.NewWithAdminFlag(a.Srv().Store(), actions, a.Config(), isAdminImport)
	return importer.SlackImport(rctx, fileData, fileSize, teamID)
}
func (a *App) ProcessSlackText(rctx request.CTX, text string) string {
	text = expandAnnouncement(text)
	text = replaceUserIds(rctx, a.Srv().Store().User(), text)
	return text
}
func (a *App) ProcessMessageAttachments(rctx request.CTX, attachments []*model.MessageAttachment) []*model.MessageAttachment {
	var nonNilAttachments = model.StringifyMessageAttachmentFieldValue(attachments)
	for _, attachment := range attachments {
		attachment.Pretext = a.ProcessSlackText(rctx, attachment.Pretext)
		attachment.Text = a.ProcessSlackText(rctx, attachment.Text)
		attachment.Title = a.ProcessSlackText(rctx, attachment.Title)
		for _, field := range attachment.Fields {
			if field != nil && field.Value != nil {
				field.Value = a.ProcessSlackText(rctx, fmt.Sprintf("%v", field.Value))
			}
		}
	}
	return nonNilAttachments
}
func expandAnnouncement(text string) string {
	a1 := [3]string{"<!channel>", "<!here>", "<!all>"}
	a2 := [3]string{"@channel", "@here", "@all"}
	for i, a := range a1 {
		text = strings.Replace(text, a, a2[i], -1)
	}
	return text
}
func replaceUserIds(rctx request.CTX, userStore store.UserStore, text string) string {
	rgx, err := regexp.Compile("<@([a-zA-Z0-9]+)>")
	if err == nil {
		userIDs := make([]string, 0)
		matches := rgx.FindAllStringSubmatch(text, -1)
		for _, match := range matches {
			userIDs = append(userIDs, match[1])
		}
		if users, err := userStore.GetProfileByIds(rctx, userIDs, nil, true); err == nil {
			for _, user := range users {
				text = strings.Replace(text, "<@"+user.Id+">", "@"+user.Username, -1)
			}
		}
	}
	return text
}