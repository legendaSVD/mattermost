beforeAll(() => {
    process.on('unhandledRejection', (reason) => {
        throw reason;
    });
});
describe('Sanity test', () => {
    it('Promise', (done) => {
        Promise.resolve(true).then(() => {
            done();
        }).catch((err) => {
            done(err);
        });
    });
    it('async/await', async () => {
        await Promise.resolve(true);
    });
    it('fetch', (done) => {
        fetch('http://example.com').then(() => {
            done();
        }).catch(() => {
            done();
        });
    });
});