package platform
import (
	"testing"
	"github.com/mattermost/mattermost/server/public/model"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)
func TestMarshalAQ(t *testing.T) {
	ps := PlatformService{}
	events := []model.WebSocketMessage{
		model.NewWebSocketEvent(model.WebsocketEventPosted, "t1", "c1", "u1", nil, ""),
		model.NewWebSocketEvent(model.WebsocketEventReactionAdded, "t2", "c1", "u1", nil, ""),
		model.NewWebSocketEvent(model.WebsocketEventReactionRemoved, "t3", "c1", "u1", nil, ""),
		model.NewWebSocketResponse("hi", 10, nil),
	}
	aq := make(chan model.WebSocketMessage, 10)
	for _, ev := range events {
		aq <- ev
	}
	close(aq)
	queue, err := ps.marshalAQ(aq, "connID", "u1")
	require.NoError(t, err)
	assert.Len(t, queue, 4)
	var gotEvents []model.WebSocketMessage
	for _, item := range queue {
		msg, err := ps.UnmarshalAQItem(item)
		require.NoError(t, err)
		gotEvents = append(gotEvents, msg)
	}
	assert.Equal(t, events, gotEvents)
}
func TestMarshalDQ(t *testing.T) {
	ps := PlatformService{}
	got, err := ps.marshalDQ([]*model.WebSocketEvent{}, 0, 0)
	require.NoError(t, err)
	require.Nil(t, got)
	events := []*model.WebSocketEvent{
		model.NewWebSocketEvent(model.WebsocketEventPosted, "t1", "c1", "u1", nil, ""),
		model.NewWebSocketEvent(model.WebsocketEventReactionAdded, "t2", "c1", "u1", nil, "").SetSequence(1),
		model.NewWebSocketEvent(model.WebsocketEventReactionRemoved, "t3", "c1", "u1", nil, "").SetSequence(2),
		nil,
		nil,
	}
	got, err = ps.marshalDQ(events, 0, 3)
	require.NoError(t, err)
	require.Len(t, got, 3)
	gotEvents, dqPtr, err := ps.UnmarshalDQ(got)
	require.NoError(t, err)
	assert.Equal(t, 3, dqPtr)
	assert.Equal(t, events[:3], gotEvents[:3])
}
func TestUnmarshalDQFullBuffer(t *testing.T) {
	ps := PlatformService{}
	t.Run("dq full", func(t *testing.T) {
		events := make([]*model.WebSocketEvent, deadQueueSize)
		for i := range deadQueueSize {
			events[i] = model.NewWebSocketEvent(model.WebsocketEventPosted, "t1", "c1", "u1", nil, "").SetSequence(int64(i))
		}
		got, err := ps.marshalDQ(events, 0, 0)
		require.NoError(t, err)
		require.Len(t, got, deadQueueSize)
		gotEvents, dqPtr, err := ps.UnmarshalDQ(got)
		require.NoError(t, err)
		assert.Equal(t, 0, dqPtr, "dqPtr should be 0 for a full buffer (deadQueueSize % deadQueueSize = 0)")
		assert.Equal(t, events, gotEvents)
	})
	t.Run("dq rollover", func(t *testing.T) {
		events := make([]*model.WebSocketEvent, deadQueueSize)
		for i := range deadQueueSize {
			events[i] = model.NewWebSocketEvent(model.WebsocketEventPosted, "t1", "c1", "u1", nil, "").SetSequence(int64(i + 100))
		}
		got2, err := ps.marshalDQ(events, deadQueueSize-1, 0)
		require.NoError(t, err)
		require.Len(t, got2, 1)
		gotEvents2, dqPtr2, err := ps.UnmarshalDQ(got2)
		require.NoError(t, err)
		assert.Equal(t, 1, dqPtr2, "dqPtr should be 1 for a 1-element buffer (1 % deadQueueSize = 1)")
		assert.Equal(t, events[deadQueueSize-1], gotEvents2[0])
	})
}