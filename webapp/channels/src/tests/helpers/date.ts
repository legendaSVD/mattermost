export const fakeDate = (expected: Date): () => void => {
    const OGDate = Date;
    function MockDate(mockOverride?: Date | number) {
        return new OGDate(mockOverride || expected);
    }
    MockDate.UTC = OGDate.UTC;
    MockDate.parse = OGDate.parse;
    MockDate.now = () => expected.getTime();
    MockDate.prototype = OGDate.prototype;
    global.Date = MockDate as any;
    return () => {
        global.Date = OGDate;
    };
};
export const unixTimestampFromNow = (daysFromNow: number) => {
    const now = new Date();
    return Math.ceil(new Date(now.getTime() + (daysFromNow * 24 * 60 * 60 * 1000)).getTime());
};