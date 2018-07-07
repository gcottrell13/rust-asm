import * as React from 'react';

interface listeners<K> {
    [p: string]: K;
}

export interface EventFunction {
    (t: string): void;
}

export interface EventListenerProps<
    U,
    T extends EventFunction
> {
    attach: (key: U, fn: T) => void;
    detach: (key: U, fn: T) => void;
    listeners: listeners<T>;
}

export class EventListener<
    U,
    T extends EventFunction
> extends React.Component<EventListenerProps<U, T>> {

    componentDidMount() {
        for(var l in this.props.listeners) {
            let listener = this.props.listeners[l];
            this.props.attach(l as any, listener);
        }
    }

    componentWillUnmount() {
        for(var l in this.props.listeners) {
            let listener = this.props.listeners[l];
            this.props.detach(l as any, listener);
        }
    }

    render() {
        return null;
    }
}