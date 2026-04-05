package shared
import (
	"sort"
	"github.com/mattermost/mattermost/server/public/model"
)
type UserType string
const (
	User UserType = "user"
	Bot  UserType = "bot"
)
type PostExport struct {
	model.MessageExport
	UserType            UserType
	UpdatedType PostUpdatedType
	UpdateAt    int64
	EditedNewMsgId    string
	Message           string
	PreviewsPost      string
	AttachmentCreates []*FileUploadStartExport
	AttachmentDeletes []PostExport
	FileInfo          *model.FileInfo
}
type FileUploadStartExport struct {
	model.MessageExport
	UserEmail           string
	UploadStartTime     int64
	FileInfo            *model.FileInfo
}
type FileUploadStopExport struct {
	model.MessageExport
	UserEmail           string
	UploadStopTime      int64
	Status              string
	FileInfo            *model.FileInfo
}
type ChannelExport struct {
	ChannelId    string
	ChannelType  model.ChannelType
	ChannelName  string
	DisplayName  string
	StartTime    int64
	EndTime      int64
	Posts        []PostExport
	Files        []*model.FileInfo
	DeletedFiles []PostExport
	UploadStarts []*FileUploadStartExport
	UploadStops  []*FileUploadStopExport
	JoinEvents   []JoinExport
	LeaveEvents  []LeaveExport
	TeamId          string
	TeamName        string
	TeamDisplayName string
}
type JoinExport struct {
	UserId    string
	Username  string
	UserEmail string
	UserType  UserType
	JoinTime  int64
	LeaveTime int64
}
type LeaveExport struct {
	UserId    string
	Username  string
	UserEmail string
	UserType  UserType
	LeaveTime int64
	ClosedOut bool
}
type GenericExportData struct {
	Exports  []ChannelExport
	Metadata Metadata
	Results  RunExportResults
}
func GetGenericExportData(p ExportParams) (GenericExportData, error) {
	postAuthorsByChannel := make(map[string]map[string]ChannelMember)
	metadata := Metadata{
		Channels:         p.ChannelMetadata,
		MessagesCount:    0,
		AttachmentsCount: 0,
		StartTime:        p.BatchStartTime,
		EndTime:          p.BatchEndTime,
	}
	var results RunExportResults
	channelsInThisBatch := make(map[string]bool)
	postsByChannel := make(map[string][]PostExport)
	filesByChannel := make(map[string][]*model.FileInfo)
	uploadStartsByChannel := make(map[string][]*FileUploadStartExport)
	uploadStopsByChannel := make(map[string][]*FileUploadStopExport)
	deletedFilesByChannel := make(map[string][]PostExport)
	processPostAttachments := func(post *model.MessageExport, postExport PostExport, originalPostThatWillBeDeletedLater bool) error {
		channelId := *post.ChannelId
		uploadedFiles, startUploads, stopUploads, deleteFileMessages, err :=
			postToAttachmentsEntries(post, p.Db, originalPostThatWillBeDeletedLater)
		if err != nil {
			return err
		}
		uploadStartsByChannel[channelId] = append(uploadStartsByChannel[channelId], startUploads...)
		uploadStopsByChannel[channelId] = append(uploadStopsByChannel[channelId], stopUploads...)
		deletedFilesByChannel[channelId] = append(deletedFilesByChannel[channelId], deleteFileMessages...)
		filesByChannel[channelId] = append(filesByChannel[channelId], uploadedFiles...)
		postExport.AttachmentCreates = startUploads
		postExport.AttachmentDeletes = deleteFileMessages
		postsByChannel[channelId] = append(postsByChannel[channelId], postExport)
		results.UploadedFiles += len(startUploads)
		results.DeletedFiles += len(deleteFileMessages)
		if err := metadata.UpdateCounts(channelId, 1, len(startUploads)); err != nil {
			return err
		}
		return nil
	}
	for _, post := range p.Posts {
		channelId := *post.ChannelId
		channelsInThisBatch[channelId] = true
		if IsDeletedMsg(post) && !isEditedOriginalMsg(post) && *post.PostCreateAt >= p.JobStartTime {
			results.CreatedPosts++
			postExport := createdPostToExportEntry(post)
			if err := processPostAttachments(post, postExport, true); err != nil {
				return GenericExportData{}, err
			}
		}
		var postExport PostExport
		postExport, results = getPostExport(post, results)
		if err := processPostAttachments(post, postExport, false); err != nil {
			return GenericExportData{}, err
		}
		if _, ok := postAuthorsByChannel[channelId]; !ok {
			postAuthorsByChannel[channelId] = make(map[string]ChannelMember)
		}
		postAuthorsByChannel[channelId][*post.UserId] = ChannelMember{
			UserId:   *post.UserId,
			Email:    *post.UserEmail,
			Username: *post.Username,
			IsBot:    post.IsBot,
		}
	}
	for id := range p.ChannelMetadata {
		if !channelsInThisBatch[id] {
			if ChannelHasActivity(p.ChannelMemberHistories[id], p.BatchStartTime, p.BatchEndTime) {
				channelsInThisBatch[id] = true
			}
		}
	}
	channelExports := make([]ChannelExport, 0, len(channelsInThisBatch))
	for id := range channelsInThisBatch {
		c := metadata.Channels[id]
		joinEvents, leaveEvents := getJoinsAndLeaves(p.BatchStartTime, p.BatchEndTime,
			p.ChannelMemberHistories[id], postAuthorsByChannel[id])
		var teamName, teamDisplayName string
		if posts, ok := postsByChannel[id]; ok {
			if len(posts) > 0 {
				teamName = model.SafeDereference(posts[0].TeamName)
				teamDisplayName = model.SafeDereference(posts[0].TeamDisplayName)
			}
		}
		channelExports = append(channelExports, ChannelExport{
			ChannelId:       c.ChannelId,
			ChannelType:     c.ChannelType,
			ChannelName:     c.ChannelName,
			DisplayName:     c.ChannelDisplayName,
			StartTime:       p.BatchStartTime,
			EndTime:         p.BatchEndTime,
			Posts:           postsByChannel[id],
			Files:           filesByChannel[id],
			DeletedFiles:    deletedFilesByChannel[id],
			UploadStarts:    uploadStartsByChannel[id],
			UploadStops:     uploadStopsByChannel[id],
			JoinEvents:      joinEvents,
			LeaveEvents:     leaveEvents,
			TeamId:          model.SafeDereference(c.TeamId),
			TeamName:        teamName,
			TeamDisplayName: teamDisplayName,
		})
		results.Joins += len(joinEvents)
		results.Leaves += len(leaveEvents)
	}
	return GenericExportData{channelExports, metadata, results}, nil
}
func postToAttachmentsEntries(post *model.MessageExport, db MessageExportStore, ignoreDeleted bool) (
	uploadedFiles []*model.FileInfo, startUploads []*FileUploadStartExport, stopUploads []*FileUploadStopExport, deleteFileMessages []PostExport, err error) {
	if len(post.PostFileIds) == 0 {
		return
	}
	uploadedFiles, err = db.FileInfo().GetForPost(*post.PostId, true, true, false)
	if err != nil {
		return
	}
	for _, fileInfo := range uploadedFiles {
		if fileInfo.DeleteAt > 0 && !ignoreDeleted {
			deleteFileMessages = append(deleteFileMessages, deleteFileToExportEntry(post, fileInfo))
			if IsDeletedMsg(post) {
				continue
			}
		}
		startUploads = append(startUploads, &FileUploadStartExport{
			MessageExport:   *post,
			UserEmail:       *post.UserEmail,
			UploadStartTime: *post.PostCreateAt,
			FileInfo:        fileInfo,
		})
		stopUploads = append(stopUploads, &FileUploadStopExport{
			MessageExport:  *post,
			UserEmail:      *post.UserEmail,
			UploadStopTime: *post.PostCreateAt,
			Status:         "Completed",
			FileInfo:       fileInfo,
		})
	}
	return
}
func getPostExport(post *model.MessageExport, results RunExportResults) (PostExport, RunExportResults) {
	if isEditedOriginalMsg(post) {
		results.EditedOrigMsgPosts++
		return editedOriginalMsgToExportEntry(post), results
	} else if IsDeletedMsg(post) {
		results.DeletedPosts++
		return deletedPostToExportEntry(post, "delete "+*post.PostMessage), results
	} else if *post.PostUpdateAt > *post.PostCreateAt {
		if model.SafeDereference(post.PostEditAt) > 0 {
			results.EditedNewMsgPosts++
			return editedNewMsgToExportEntry(post), results
		}
		results.UpdatedPosts++
		return updatedPostToExportEntry(post), results
	}
	results.CreatedPosts++
	return createdPostToExportEntry(post), results
}
func getJoinsAndLeaves(startTime int64, endTime int64, channelMembersHistory []*model.ChannelMemberHistoryResult,
	postAuthors map[string]ChannelMember) ([]JoinExport, []LeaveExport) {
	var leaveEvents []LeaveExport
	joins, leaves := GetJoinsAndLeavesForChannel(startTime, endTime, channelMembersHistory, postAuthors)
	joinsById := make(map[string]JoinExport, len(joins))
	type StillMemberInfo struct {
		time     int64
		userType UserType
		userId   string
		username string
	}
	stillMember := map[string]StillMemberInfo{}
	for _, join := range joins {
		userType := User
		if join.IsBot {
			userType = Bot
		}
		joinsById[join.UserId] = JoinExport{
			UserId:    join.UserId,
			Username:  join.Username,
			UserEmail: join.Email,
			JoinTime:  join.Datetime,
			UserType:  userType,
			LeaveTime: endTime,
		}
		if value, ok := stillMember[join.Email]; !ok {
			stillMember[join.Email] = StillMemberInfo{time: join.Datetime, userType: userType, userId: join.UserId, username: join.Username}
		} else if join.Datetime > value.time {
			stillMember[join.Email] = StillMemberInfo{time: join.Datetime, userType: userType, userId: join.UserId, username: join.Username}
		}
	}
	for _, leave := range leaves {
		userType := User
		if leave.IsBot {
			userType = Bot
		}
		leaveEvents = append(leaveEvents, LeaveExport{
			UserId:    leave.UserId,
			Username:  leave.Username,
			UserEmail: leave.Email,
			LeaveTime: leave.Datetime,
			UserType:  userType,
		})
		if leave.Datetime > stillMember[leave.Email].time {
			delete(stillMember, leave.Email)
		}
		if join, ok := joinsById[leave.UserId]; ok {
			join.LeaveTime = leave.Datetime
			joinsById[leave.UserId] = join
		}
	}
	for email := range stillMember {
		leaveEvents = append(leaveEvents, LeaveExport{
			UserId:    stillMember[email].userId,
			Username:  stillMember[email].username,
			LeaveTime: endTime,
			UserEmail: email,
			UserType:  stillMember[email].userType,
			ClosedOut: true,
		})
	}
	joinEvents := make([]JoinExport, 0, len(joinsById))
	for _, v := range joinsById {
		joinEvents = append(joinEvents, v)
	}
	sort.Slice(joinEvents, func(i, j int) bool {
		if joinEvents[i].JoinTime == joinEvents[j].JoinTime {
			return joinEvents[i].UserEmail < joinEvents[j].UserEmail
		}
		return joinEvents[i].JoinTime < joinEvents[j].JoinTime
	})
	sort.Slice(leaveEvents, func(i, j int) bool {
		if leaveEvents[i].LeaveTime == leaveEvents[j].LeaveTime {
			return leaveEvents[i].UserEmail < leaveEvents[j].UserEmail
		}
		return leaveEvents[i].LeaveTime < leaveEvents[j].LeaveTime
	})
	return joinEvents, leaveEvents
}
func isEditedOriginalMsg(post *model.MessageExport) bool {
	return model.SafeDereference(post.PostDeleteAt) > 0 && model.SafeDereference(post.PostOriginalId) != ""
}
func createdPostToExportEntry(post *model.MessageExport) PostExport {
	userType := User
	if post.IsBot {
		userType = Bot
	}
	return PostExport{
		MessageExport: *post,
		Message:       *post.PostMessage,
		UserType:      userType,
		PreviewsPost:  post.PreviewID(),
	}
}
func deletedPostToExportEntry(post *model.MessageExport, newMsg string) PostExport {
	userType := User
	if post.IsBot {
		userType = Bot
	}
	return PostExport{
		MessageExport: *post,
		UpdateAt:      *post.PostDeleteAt,
		UpdatedType:   Deleted,
		Message:       newMsg,
		UserType:      userType,
		PreviewsPost:  post.PreviewID(),
	}
}
func editedOriginalMsgToExportEntry(post *model.MessageExport) PostExport {
	userType := User
	if post.IsBot {
		userType = Bot
	}
	return PostExport{
		MessageExport:  *post,
		UpdateAt:       *post.PostUpdateAt,
		UpdatedType:    EditedOriginalMsg,
		Message:        *post.PostMessage,
		UserType:       userType,
		PreviewsPost:   post.PreviewID(),
		EditedNewMsgId: *post.PostOriginalId,
	}
}
func editedNewMsgToExportEntry(post *model.MessageExport) PostExport {
	userType := User
	if post.IsBot {
		userType = Bot
	}
	return PostExport{
		MessageExport: *post,
		UpdateAt:      *post.PostUpdateAt,
		UpdatedType:   EditedNewMsg,
		Message:       *post.PostMessage,
		UserType:      userType,
		PreviewsPost:  post.PreviewID(),
	}
}
func updatedPostToExportEntry(post *model.MessageExport) PostExport {
	userType := User
	if post.IsBot {
		userType = Bot
	}
	return PostExport{
		MessageExport: *post,
		UpdateAt:      *post.PostUpdateAt,
		UpdatedType:   UpdatedNoMsgChange,
		Message:       *post.PostMessage,
		UserType:      userType,
		PreviewsPost:  post.PreviewID(),
	}
}
func deleteFileToExportEntry(post *model.MessageExport, fileInfo *model.FileInfo) PostExport {
	userType := User
	if post.IsBot {
		userType = Bot
	}
	return PostExport{
		MessageExport: *post,
		UpdateAt:      fileInfo.DeleteAt,
		UpdatedType:   FileDeleted,
		Message:       "delete " + fileInfo.Path,
		UserType:      userType,
		PreviewsPost:  post.PreviewID(),
		FileInfo:      fileInfo,
	}
}
func UploadStartToExportEntry(u *FileUploadStartExport) PostExport {
	userType := User
	if u.IsBot {
		userType = Bot
	}
	return PostExport{
		MessageExport: u.MessageExport,
		UpdateAt:      u.FileInfo.UpdateAt,
		UserType:      userType,
		FileInfo:      u.FileInfo,
	}
}