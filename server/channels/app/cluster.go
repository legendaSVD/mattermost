package app
func (s *Server) AddClusterLeaderChangedListener(listener func()) string {
	return s.platform.AddClusterLeaderChangedListener(listener)
}
func (s *Server) RemoveClusterLeaderChangedListener(id string) {
	s.platform.RemoveClusterLeaderChangedListener(id)
}
func (s *Server) InvokeClusterLeaderChangedListeners() {
	s.platform.InvokeClusterLeaderChangedListeners()
}