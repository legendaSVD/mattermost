export function fileSizeToString(bytes) {
    if (bytes > 1024 ** 4) {
        if (bytes < (1024 ** 4) * 10) {
            return (Math.round((bytes / (1024 ** 4)) * 10) / 10) + 'TB';
        }
        return Math.round(bytes / (1024 ** 4)) + 'TB';
    } else if (bytes > 1024 ** 3) {
        if (bytes < (1024 ** 3) * 10) {
            return (Math.round((bytes / (1024 ** 3)) * 10) / 10) + 'GB';
        }
        return Math.round(bytes / (1024 ** 3)) + 'GB';
    } else if (bytes > 1024 ** 2) {
        if (bytes < (1024 ** 2) * 10) {
            return (Math.round((bytes / (1024 ** 2)) * 10) / 10) + 'MB';
        }
        return Math.round(bytes / (1024 ** 2)) + 'MB';
    } else if (bytes > 1024) {
        return Math.round(bytes / 1024) + 'KB';
    }
    return bytes + 'B';
}