package utils
func Pager[T any](fetch func(page int) ([]T, error), perPage int) ([]T, error) {
	var list []T
	var page int
	for {
		fetched, err := fetch(page)
		if err != nil {
			return list, err
		}
		list = append(list, fetched...)
		if len(fetched) < perPage {
			break
		}
		page++
	}
	return list, nil
}