package utils
import (
	"fmt"
	"reflect"
)
type StructFieldFilter func(structField reflect.StructField, base reflect.Value, patch reflect.Value) bool
type MergeConfig struct {
	StructFieldFilter StructFieldFilter
}
func Merge[T any](base T, patch T, mergeConfig *MergeConfig) (T, error) {
	commonType := reflect.TypeOf(base)
	baseVal := reflect.ValueOf(base)
	patchVal := reflect.ValueOf(patch)
	ret := reflect.New(commonType)
	val, ok := merge(baseVal, patchVal, mergeConfig)
	if ok {
		ret.Elem().Set(val)
	}
	r, ok := ret.Elem().Interface().(T)
	if !ok {
		return r, fmt.Errorf(
			"Unexpected type of return element, expected %s, is %s",
			commonType,
			reflect.TypeOf(r),
		)
	}
	return r, nil
}
func merge(base, patch reflect.Value, mergeConfig *MergeConfig) (reflect.Value, bool) {
	commonType := base.Type()
	switch commonType.Kind() {
	case reflect.Struct:
		merged := reflect.New(commonType).Elem()
		for i := 0; i < base.NumField(); i++ {
			if !merged.Field(i).CanSet() {
				continue
			}
			if mergeConfig != nil && mergeConfig.StructFieldFilter != nil {
				if !mergeConfig.StructFieldFilter(commonType.Field(i), base.Field(i), patch.Field(i)) {
					merged.Field(i).Set(base.Field(i))
					continue
				}
			}
			val, ok := merge(base.Field(i), patch.Field(i), mergeConfig)
			if ok {
				merged.Field(i).Set(val)
			}
		}
		return merged, true
	case reflect.Ptr:
		mergedPtr := reflect.New(commonType.Elem())
		if base.IsNil() && patch.IsNil() {
			return mergedPtr, false
		}
		if base.IsNil() {
			val, _ := merge(patch.Elem(), patch.Elem(), mergeConfig)
			mergedPtr.Elem().Set(val)
		} else if patch.IsNil() {
			val, _ := merge(base.Elem(), base.Elem(), mergeConfig)
			mergedPtr.Elem().Set(val)
		} else {
			val, _ := merge(base.Elem(), patch.Elem(), mergeConfig)
			mergedPtr.Elem().Set(val)
		}
		return mergedPtr, true
	case reflect.Slice:
		if base.IsNil() && patch.IsNil() {
			return reflect.Zero(commonType), false
		}
		if !patch.IsNil() {
			merged := reflect.MakeSlice(commonType, 0, patch.Len())
			for i := 0; i < patch.Len(); i++ {
				val, _ := merge(patch.Index(i), patch.Index(i), mergeConfig)
				merged = reflect.Append(merged, val)
			}
			return merged, true
		}
		merged := reflect.MakeSlice(commonType, 0, base.Len())
		for i := 0; i < base.Len(); i++ {
			val, _ := merge(base.Index(i), base.Index(i), mergeConfig)
			merged = reflect.Append(merged, val)
		}
		return merged, true
	case reflect.Map:
		if base.IsNil() && patch.IsNil() {
			return reflect.Zero(commonType), false
		}
		merged := reflect.MakeMap(commonType)
		mapPtr := base
		if !patch.IsNil() {
			mapPtr = patch
		}
		for _, key := range mapPtr.MapKeys() {
			val, ok := merge(mapPtr.MapIndex(key), mapPtr.MapIndex(key), mergeConfig)
			if !ok {
				val = reflect.New(mapPtr.MapIndex(key).Type()).Elem()
			}
			merged.SetMapIndex(key, val)
		}
		return merged, true
	case reflect.Interface:
		var val reflect.Value
		if base.IsNil() && patch.IsNil() {
			return reflect.Zero(commonType), false
		}
		if base.IsNil() {
			val, _ = merge(patch.Elem(), patch.Elem(), mergeConfig)
		} else if patch.IsNil() {
			val, _ = merge(base.Elem(), base.Elem(), mergeConfig)
		} else {
			val, _ = merge(base.Elem(), patch.Elem(), mergeConfig)
		}
		return val, true
	default:
		return patch, true
	}
}