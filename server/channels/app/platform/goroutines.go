package platform
import "sync/atomic"
func (ps *PlatformService) Go(f func()) {
	atomic.AddInt32(&ps.goroutineCount, 1)
	go func() {
		f()
		atomic.AddInt32(&ps.goroutineCount, -1)
		select {
		case ps.goroutineExitSignal <- struct{}{}:
		default:
		}
	}()
}
func (ps *PlatformService) waitForGoroutines() {
	for atomic.LoadInt32(&ps.goroutineCount) != 0 {
		<-ps.goroutineExitSignal
	}
}
func (ps *PlatformService) GoBuffered(f func()) {
	ps.goroutineBuffered <- struct{}{}
	atomic.AddInt32(&ps.goroutineCount, 1)
	go func() {
		f()
		atomic.AddInt32(&ps.goroutineCount, -1)
		select {
		case ps.goroutineExitSignal <- struct{}{}:
		default:
		}
		<-ps.goroutineBuffered
	}()
}