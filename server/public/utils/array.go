package utils
func FindExclusives[T comparable](arr1, arr2 []T) ([]T, []T, []T) {
	existsInArr1 := make(map[T]bool)
	existsInArr2 := make(map[T]bool)
	for _, elem := range arr1 {
		existsInArr1[elem] = true
	}
	for _, elem := range arr2 {
		existsInArr2[elem] = true
	}
	var uniqueToArr1 []T
	var uniqueToArr2 []T
	var common []T
	for elem := range existsInArr1 {
		if existsInArr2[elem] {
			common = append(common, elem)
		} else {
			uniqueToArr1 = append(uniqueToArr1, elem)
		}
	}
	for elem := range existsInArr2 {
		if !existsInArr1[elem] {
			uniqueToArr2 = append(uniqueToArr2, elem)
		}
	}
	return uniqueToArr1, uniqueToArr2, common
}