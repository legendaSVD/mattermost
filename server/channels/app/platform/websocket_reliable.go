package platform
import (
	"bytes"
	"encoding/json"
	"fmt"
	"github.com/mattermost/mattermost/server/public/model"
)
func (ps *PlatformService) GetWSQueues(userID, connectionID string, seqNum int64) (*model.WSQueues, error) {
	hub := ps.GetHubForUserId(userID)
	if hub == nil {
		return nil, nil
	}
	connRes := hub.CheckConn(userID, connectionID)
	if connRes == nil {
		return nil, nil
	}
	aq := connRes.ActiveQueue
	dq := connRes.DeadQueue
	dqPtr := connRes.DeadQueuePointer
	if dq[0] == nil {
		return nil, nil
	}
	if perfectMatch := !_hasMsgLoss(dq, dqPtr, seqNum); perfectMatch {
		close(aq)
		aqSlice, err := ps.marshalAQ(aq, connectionID, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to get from active queue: %w", err)
		}
		return &model.WSQueues{
			ActiveQ:    aqSlice,
			ReuseCount: connRes.ReuseCount,
		}, nil
	}
	if ok, index := _isInDeadQueue(dq, seqNum); ok {
		close(aq)
		aqSlice, err := ps.marshalAQ(aq, connectionID, userID)
		if err != nil {
			return nil, fmt.Errorf("failed to get from active queue: %w", err)
		}
		dqSlice, err := ps.marshalDQ(dq, index, dqPtr)
		if err != nil {
			return nil, fmt.Errorf("failed to get from dead queue: %w", err)
		}
		return &model.WSQueues{
			ActiveQ:    aqSlice,
			DeadQ:      dqSlice,
			ReuseCount: connRes.ReuseCount,
		}, nil
	}
	return nil, nil
}
func (ps *PlatformService) marshalAQ(aq <-chan model.WebSocketMessage, connID, userID string) ([]model.ActiveQueueItem, error) {
	aqSlice := make([]model.ActiveQueueItem, 0)
	for msg := range aq {
		evtType := model.WebSocketMsgTypeResponse
		_, evtOk := msg.(*model.WebSocketEvent)
		if evtOk {
			evtType = model.WebSocketMsgTypeEvent
		}
		buf, err := msg.ToJSON()
		if err != nil {
			return nil, fmt.Errorf("failed to marshal websocket event: %w, connection_id=%s, user_id=%s", err, connID, userID)
		}
		aqSlice = append(aqSlice, model.ActiveQueueItem{
			Buf:  json.RawMessage(buf),
			Type: evtType,
		})
	}
	return aqSlice, nil
}
func (ps *PlatformService) UnmarshalAQItem(aqItem model.ActiveQueueItem) (model.WebSocketMessage, error) {
	var item model.WebSocketMessage
	var err error
	if aqItem.Type == model.WebSocketMsgTypeEvent {
		item, err = model.WebSocketEventFromJSON(bytes.NewReader(aqItem.Buf))
	} else if aqItem.Type == model.WebSocketMsgTypeResponse {
		item, err = model.WebSocketResponseFromJSON(bytes.NewReader(aqItem.Buf))
	} else {
		return nil, fmt.Errorf("unknown websocket message type: %q", aqItem.Type)
	}
	return item, err
}
func (ps *PlatformService) marshalDQ(dq []*model.WebSocketEvent, index, dqPtr int) ([]json.RawMessage, error) {
	if len(dq) == 0 || dq[0] == nil {
		return nil, nil
	}
	dqSlice := make([]json.RawMessage, 0)
	var buf bytes.Buffer
	enc := json.NewEncoder(&buf)
	if dq[dqPtr] == nil {
		for i := index; i < dqPtr; i++ {
			buf.Reset()
			err := dq[i].Encode(enc, &buf)
			if err != nil {
				return nil, fmt.Errorf("error in encoding websocket message in dead queue: %w", err)
			}
			dqSlice = append(dqSlice, bytes.Clone(buf.Bytes()))
		}
		return dqSlice, nil
	}
	currPtr := index
	for {
		buf.Reset()
		err := dq[currPtr].Encode(enc, &buf)
		if err != nil {
			return nil, fmt.Errorf("error in encoding websocket message in dead queue: %w", err)
		}
		dqSlice = append(dqSlice, bytes.Clone(buf.Bytes()))
		oldSeq := dq[currPtr].GetSequence()
		currPtr = (currPtr + 1) % deadQueueSize
		newSeq := dq[currPtr].GetSequence()
		if oldSeq > newSeq {
			break
		}
	}
	return dqSlice, nil
}
func (ps *PlatformService) UnmarshalDQ(buf []json.RawMessage) ([]*model.WebSocketEvent, int, error) {
	dqPtr := 0
	dq := make([]*model.WebSocketEvent, deadQueueSize)
	for _, dqItem := range buf {
		item, err := model.WebSocketEventFromJSON(bytes.NewReader(dqItem))
		if err != nil {
			return nil, 0, err
		}
		dq[dqPtr] = item
		dqPtr = (dqPtr + 1) % deadQueueSize
	}
	return dq, dqPtr, nil
}