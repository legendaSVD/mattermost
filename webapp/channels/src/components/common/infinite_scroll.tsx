import debounce from 'lodash/debounce';
import React from 'react';
import type {CSSProperties} from 'react';
import LoadingScreen from 'components/loading_screen';
const SCROLL_BUFFER = 100;
const DEBOUNCE_WAIT_TIME = 200;
type Props = {
    children: React.ReactNode;
    callBack: () => void;
    endOfDataMessage?: string;
    styleClass?: string;
    bufferValue: number;
    totalItems: number;
    itemsPerPage: number;
    pageNumber: number;
    loaderStyle?: CSSProperties;
};
type State = {
    isFetching: boolean;
    isEndofData: boolean;
};
export default class InfiniteScroll extends React.PureComponent<Props, State> {
    node: React.RefObject<HTMLDivElement>;
    static defaultProps = {
        bufferValue: SCROLL_BUFFER,
        endOfDataMessage: '',
        styleClass: '',
        loaderStyle: {},
    };
    constructor(props: Props) {
        super(props);
        this.state = {
            isFetching: false,
            isEndofData: false,
        };
        this.node = React.createRef();
    }
    componentDidMount(): void {
        this.node.current?.addEventListener('scroll', this.debounceHandleScroll);
    }
    componentWillUnmount(): void {
        this.node.current?.removeEventListener('scroll', this.debounceHandleScroll);
    }
    validateBuffer = (buffer: number): number => {
        if (buffer < SCROLL_BUFFER) {
            return SCROLL_BUFFER;
        }
        return Math.abs(buffer);
    };
    getAmountOfPages = (total: number, freq: number): number => {
        return Math.ceil(total / freq);
    };
    handleScroll = (): void => {
        const {isFetching, isEndofData} = this.state;
        const {callBack, bufferValue, totalItems, itemsPerPage, pageNumber} = this.props;
        const node = this.node.current;
        const validBuffer = this.validateBuffer(bufferValue);
        const toScroll = node!.scrollHeight - node!.clientHeight - validBuffer;
        const nearBottom = node!.scrollTop > toScroll;
        if (nearBottom && !isEndofData && !isFetching) {
            this.setState({isFetching: true},
                async () => {
                    await callBack();
                    this.setState({
                        isFetching: false,
                    });
                    if (totalItems === 0) {
                        this.setState({
                            isEndofData: true,
                        });
                        return;
                    }
                    const amountOfPages = this.getAmountOfPages(totalItems, itemsPerPage);
                    if (pageNumber === amountOfPages) {
                        this.setState({
                            isEndofData: true,
                        });
                    }
                });
        }
    };
    debounceHandleScroll = debounce(this.handleScroll, DEBOUNCE_WAIT_TIME);
    render(): React.ReactNode {
        const {children, endOfDataMessage, styleClass, loaderStyle} = this.props;
        const {isEndofData, isFetching} = this.state;
        const showLoader = !isEndofData && isFetching;
        return (
            <>
                <div
                    className={`infinite-scroll ${styleClass}`}
                    ref={this.node}
                >
                    {children}
                    {showLoader && (
                        <LoadingScreen
                            style={loaderStyle}
                            message=' '
                        />
                    )}
                    {!showLoader && endOfDataMessage}
                </div>
            </>
        );
    }
}