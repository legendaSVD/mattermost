package sharedchannel
import (
	"net/url"
	"regexp"
	"strings"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/i18n"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
	"github.com/mattermost/mattermost/server/public/shared/request"
)
var (
	permaLinkRegex       = regexp.MustCompile(`https?://[0-9.\-A-Za-z]+/[a-z0-9]+([a-z\-0-9]+|(__)?)[a-z0-9]+/pl/([a-zA-Z0-9]+)`)
	permaLinkSharedRegex = regexp.MustCompile(`https?://[0-9.\-A-Za-z]+/[a-z0-9]+([a-z\-0-9]+|(__)?)[a-z0-9]+/plshared/([a-zA-Z0-9]+)`)
)
const (
	permalinkMarker = "plshared"
)
func (scs *Service) processPermalinkToRemote(p *model.Post) string {
	rctx := request.EmptyContext(scs.server.Log())
	var sent bool
	return permaLinkRegex.ReplaceAllStringFunc(p.Message, func(msg string) string {
		lastSlash := strings.LastIndexByte(msg, '/')
		postID := msg[lastSlash+1:]
		opts := model.GetPostsOptions{
			SkipFetchThreads: true,
		}
		postList, err := scs.server.GetStore().Post().Get(rctx, postID, opts, "", map[string]bool{})
		if err != nil {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceWarn, "Unable to get post during replacing permalinks", mlog.Err(err))
			return msg
		}
		if len(postList.Order) == 0 {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceWarn, "No post found for permalink", mlog.String("postID", postID))
			return msg
		}
		if postList.Posts[postList.Order[0]].ChannelId != p.ChannelId {
			if !sent {
				scs.sendEphemeralPost(p.ChannelId, p.UserId, i18n.T("sharedchannel.permalink.not_found"))
				sent = true
			}
			return msg
		}
		return strings.Replace(msg, "/pl/", "/"+permalinkMarker+"/", 1)
	})
}
func (scs *Service) processPermalinkFromRemote(p *model.Post, team *model.Team) string {
	return permaLinkSharedRegex.ReplaceAllStringFunc(p.Message, func(remoteLink string) string {
		parsed, err := url.Parse(remoteLink)
		if err != nil {
			scs.server.Log().Log(mlog.LvlSharedChannelServiceWarn, "Unable to parse the remote link during replacing permalinks", mlog.Err(err))
			return remoteLink
		}
		parsed.Scheme = scs.siteURL.Scheme
		parsed.Host = scs.siteURL.Host
		teamEnd := strings.Index(parsed.Path, "/"+permalinkMarker)
		parsed.Path = "/" + team.Name + parsed.Path[teamEnd:]
		return strings.Replace(parsed.String(), "/"+permalinkMarker+"/", "/pl/", 1)
	})
}