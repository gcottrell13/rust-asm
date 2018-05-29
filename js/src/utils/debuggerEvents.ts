import { NMap } from "./utilTypes";
import { Events } from "./enums/Events";

export interface Listener {
    (data?: any): void;
}

const listeners: NMap<Listener[]> = {};

export function AddListener(e: Events, fn: Listener) {
    if (!listeners[e]) {
        listeners[e] = [];
    }

    listeners[e].push(fn);
}

export function Trigger(e: Events, data?: any) {
    setTimeout(() => {
        if (listeners[e]) {
            listeners[e].forEach(l => l(data));
        }
    }, 1);
}

export function RemoveListener(e: Events, fn: Listener) {
    if (listeners[e]) {
        let index = listeners[e].indexOf(fn);
        listeners[e] = listeners[e].splice(index, 1);
    }
}