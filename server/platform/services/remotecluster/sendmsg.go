package remotecluster
import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path"
	"time"
	"github.com/wiggin77/merror"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/shared/mlog"
)
type SendMsgResultFunc func(msg model.RemoteClusterMsg, rc *model.RemoteCluster, resp *Response, err error)
type sendMsgTask struct {
	rc  *model.RemoteCluster
	msg model.RemoteClusterMsg
	f   SendMsgResultFunc
}
func (rcs *Service) BroadcastMsg(ctx context.Context, msg model.RemoteClusterMsg, f SendMsgResultFunc) error {
	filter := model.RemoteClusterQueryFilter{
		Topic: msg.Topic,
	}
	list, err := rcs.server.GetStore().RemoteCluster().GetAll(0, 999999, filter)
	if err != nil {
		return err
	}
	errs := merror.New()
	for _, rc := range list {
		if err := rcs.SendMsg(ctx, msg, rc, f); err != nil {
			errs.Append(err)
		}
	}
	return errs.ErrorOrNil()
}
func (rcs *Service) SendMsg(ctx context.Context, msg model.RemoteClusterMsg, rc *model.RemoteCluster, f SendMsgResultFunc) error {
	task := sendMsgTask{
		rc:  rc,
		msg: msg,
		f:   f,
	}
	return rcs.enqueueTask(ctx, rc.RemoteId, task)
}
func (rcs *Service) sendMsg(task sendMsgTask) {
	var errResp error
	var response Response
	defer func() {
		if errResp != nil {
			response.Err = errResp.Error()
		}
		if task.f != nil {
			task.f(task.msg, task.rc, &response, errResp)
		}
	}()
	frame := &model.RemoteClusterFrame{
		RemoteId: task.rc.RemoteId,
		Msg:      task.msg,
	}
	u, err := url.Parse(task.rc.SiteURL)
	if err != nil {
		rcs.server.Log().Log(mlog.LvlRemoteClusterServiceError, "Invalid siteURL while sending message to remote",
			mlog.String("remote", task.rc.DisplayName),
			mlog.String("msgId", task.msg.Id),
			mlog.Err(err),
		)
		errResp = err
		return
	}
	u.Path = path.Join(u.Path, SendMsgURL)
	respJSON, err := rcs.sendFrameToRemote(SendTimeout, task.rc, frame, u.String())
	if err != nil {
		rcs.server.Log().Log(mlog.LvlRemoteClusterServiceError, "Remote Cluster send message failed",
			mlog.String("remote", task.rc.DisplayName),
			mlog.String("msgId", task.msg.Id),
			mlog.Err(err),
		)
		errResp = err
	} else {
		rcs.server.Log().Log(mlog.LvlRemoteClusterServiceDebug, "Remote Cluster message sent successfully",
			mlog.String("remote", task.rc.DisplayName),
			mlog.String("msgId", task.msg.Id),
		)
		if err = json.Unmarshal(respJSON, &response); err != nil {
			rcs.server.Log().Error("Invalid response sending message to remote cluster",
				mlog.String("remote", task.rc.DisplayName),
				mlog.Err(err),
			)
			errResp = err
		}
	}
}
func (rcs *Service) sendFrameToRemote(timeout time.Duration, rc *model.RemoteCluster, frame *model.RemoteClusterFrame, url string) ([]byte, error) {
	body, err := json.Marshal(frame)
	if err != nil {
		return nil, err
	}
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	req, err := http.NewRequest("POST", url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(model.HeaderRemoteclusterId, rc.RemoteId)
	req.Header.Set(model.HeaderRemoteclusterToken, rc.RemoteToken)
	resp, err := rcs.httpClient.Do(req.WithContext(ctx))
	if metrics := rcs.server.GetMetrics(); metrics != nil {
		if err != nil || resp.StatusCode != http.StatusOK {
			metrics.IncrementRemoteClusterMsgErrorsCounter(frame.RemoteId, os.IsTimeout(err))
		} else {
			metrics.IncrementRemoteClusterMsgSentCounter(frame.RemoteId)
		}
	}
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	body, err = io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return body, fmt.Errorf("unexpected response: %d - %s", resp.StatusCode, resp.Status)
	}
	return body, nil
}