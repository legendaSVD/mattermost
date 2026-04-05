import hoistStatics from 'hoist-non-react-statics';
import React from 'react';
type DeferredRenderWrapperState = {
    shouldRender: boolean;
}
export default function deferComponentRender<ComponentProps>(WrappedComponent: React.ComponentType<ComponentProps>, PreRenderComponent: React.ReactNode = null) {
    class DeferredRenderWrapper extends React.PureComponent<ComponentProps, DeferredRenderWrapperState> {
        mounted = false;
        constructor(props: ComponentProps) {
            super(props);
            this.state = {
                shouldRender: false,
            };
        }
        componentDidMount() {
            this.mounted = true;
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                    if (this.mounted) {
                        this.setState({shouldRender: true});
                    }
                });
            });
        }
        componentWillUnmount() {
            this.mounted = false;
        }
        render() {
            return this.state.shouldRender ? <WrappedComponent {...this.props}/> : PreRenderComponent;
        }
    }
    return hoistStatics(DeferredRenderWrapper, WrappedComponent);
}