import React from 'react';
import PDFPreview from 'components/pdf_preview';
import type {Props} from 'components/pdf_preview';
import {render, renderWithContext, waitFor} from 'tests/react_testing_utils';
import {TestHelper} from 'utils/test_helper';
const mockGetDocument = jest.fn();
jest.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
    getDocument: (params: unknown) => mockGetDocument(params),
}));
jest.mock('pdfjs-dist/build/pdf.worker.min.mjs', () => ({}));
describe('component/PDFPreview', () => {
    const requiredProps: Props = {
        fileInfo: TestHelper.getFileInfoMock({extension: 'pdf'}),
        fileUrl: 'https://pre-release.mattermost.com/api/v4/files/ips59w4w9jnfbrs3o94m1dbdie',
        scale: 1,
        handleBgClose: jest.fn(),
    };
    beforeEach(() => {
        mockGetDocument.mockReset();
        mockGetDocument.mockReturnValue({
            promise: Promise.resolve({
                numPages: 3,
                getPage: (i: number) => Promise.resolve({
                    pageIndex: i,
                    getViewport: () => ({height: 100, width: 100}),
                    render: () => ({promise: Promise.resolve()}),
                }),
            }),
        });
    });
    test('should match snapshot, loading', () => {
        const {container} = render(
            <PDFPreview {...requiredProps}/>,
        );
        expect(container).toMatchSnapshot();
    });
    test('should match snapshot, not successful', async () => {
        mockGetDocument.mockReturnValue({
            promise: Promise.reject(new Error('Failed to load PDF')),
        });
        const {container} = renderWithContext(
            <PDFPreview {...requiredProps}/>,
        );
        await waitFor(() => {
            expect(container.querySelector('.view-image__loading')).not.toBeInTheDocument();
        });
        expect(container).toMatchSnapshot();
    });
    test('should update state with new value from props when prop changes', async () => {
        const {container, rerender} = render(
            <PDFPreview {...requiredProps}/>,
        );
        await waitFor(() => {
            expect(container.querySelector('.post-code')).toBeInTheDocument();
        });
        const newFileUrl = 'https://some-new-url';
        rerender(
            <PDFPreview
                {...requiredProps}
                fileUrl={newFileUrl}
            />,
        );
        expect(container.querySelector('.view-image__loading')).toBeInTheDocument();
        await waitFor(() => {
            expect(container.querySelector('.post-code')).toBeInTheDocument();
        });
        expect(mockGetDocument).toHaveBeenLastCalledWith(
            expect.objectContaining({url: newFileUrl}),
        );
    });
    test('should return correct state when onDocumentLoad is called', async () => {
        mockGetDocument.mockReturnValueOnce({
            promise: Promise.resolve({
                numPages: 0,
                getPage: jest.fn(),
            }),
        });
        const {container, rerender} = render(
            <PDFPreview {...requiredProps}/>,
        );
        await waitFor(() => {
            expect(container.querySelector('.view-image__loading')).not.toBeInTheDocument();
        });
        expect(container.querySelectorAll('canvas')).toHaveLength(0);
        mockGetDocument.mockReturnValueOnce({
            promise: Promise.resolve({
                numPages: 100,
                getPage: (i: number) => Promise.resolve({
                    pageIndex: i,
                    getViewport: () => ({height: 100, width: 100}),
                    render: () => ({promise: Promise.resolve()}),
                }),
            }),
        });
        const newFileUrl = 'https://another-url';
        rerender(
            <PDFPreview
                {...requiredProps}
                fileUrl={newFileUrl}
            />,
        );
        await waitFor(() => {
            expect(container.querySelector('.post-code')).toBeInTheDocument();
        });
        expect(container.querySelectorAll('canvas')).toHaveLength(100);
    });
});