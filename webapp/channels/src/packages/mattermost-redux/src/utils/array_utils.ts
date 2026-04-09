export function insertWithoutDuplicates<T>(array: T[], item: T, newIndex: number) {
    const index = array.indexOf(item);
    if (newIndex === index) {
        return array;
    }
    const newArray = [...array];
    if (index !== -1) {
        newArray.splice(index, 1);
    }
    newArray.splice(newIndex, 0, item);
    return newArray;
}
export function insertMultipleWithoutDuplicates<T>(array: T[], items: T[], newIndex: number) {
    let newArray = [...array];
    items.forEach((item) => {
        newArray = removeItem(newArray, item);
    });
    newArray.splice(newIndex, 0, ...items);
    return newArray;
}
export function removeItem<T>(array: T[], item: T) {
    const index = array.indexOf(item);
    if (index === -1) {
        return array;
    }
    const result = [...array];
    result.splice(index, 1);
    return result;
}