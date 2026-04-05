package printer
const (
	ArrowLeft  = rune(KeyCtrlB)
	ArrowRight = rune(KeyCtrlF)
	ArrowUp    = rune(KeyCtrlP)
	ArrowDown  = rune(KeyCtrlN)
	Space      = ' '
	Enter      = '\r'
	NewLine    = '\n'
	Backspace  = rune(KeyCtrlH)
	Backspace2 = rune(KeyDEL)
)
type Key int16
const (
	KeyCtrlSpace      Key = iota
	KeyCtrlA
	KeyCtrlB
	KeyCtrlC
	KeyCtrlD
	KeyCtrlE
	KeyCtrlF
	KeyCtrlG
	KeyCtrlH
	KeyCtrlI
	KeyCtrlJ
	KeyCtrlK
	KeyCtrlL
	KeyCtrlM
	KeyCtrlN
	KeyCtrlO
	KeyCtrlP
	KeyCtrlQ
	KeyCtrlR
	KeyCtrlS
	KeyCtrlT
	KeyCtrlU
	KeyCtrlV
	KeyCtrlW
	KeyCtrlX
	KeyCtrlY
	KeyCtrlZ
	KeyESC
	KeyCtrlBackslash
	KeyCtrlRightSq
	KeyCtrlCarat
	KeyCtrlUnderscore
	KeyDEL            = 0x7F
)