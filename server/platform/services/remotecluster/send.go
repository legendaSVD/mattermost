package remotecluster
import (
	"context"
	"hash/fnv"
)
func (rcs *Service) enqueueTask(ctx context.Context, remoteId string, task any) error {
	if ctx == nil {
		ctx = context.Background()
	}
	h := hash(remoteId)
	idx := h % uint32(len(rcs.send))
	select {
	case rcs.send[idx] <- task:
		return nil
	case <-ctx.Done():
		return NewBufferFullError(cap(rcs.send))
	}
}
func hash(s string) uint32 {
	h := fnv.New32a()
	h.Write([]byte(s))
	return h.Sum32()
}
func (rcs *Service) sendLoop(idx int, done chan struct{}) {
	for {
		select {
		case t := <-rcs.send[idx]:
			switch task := t.(type) {
			case sendMsgTask:
				rcs.sendMsg(task)
			case sendFileTask:
				rcs.sendFile(task)
			case sendProfileImageTask:
				rcs.sendProfileImage(task)
			}
		case <-done:
			return
		}
	}
}