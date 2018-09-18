import { SMap } from "./utilTypes";
import { Events } from "./enums/Events";

export interface Listener {
    (data?: any): void;
}

const listeners: SMap<Listener[]> = {};

export function AddListener(e: Events, fn: Listener) {
    if (!listeners[e]) {
        listeners[e] = [];
    }
    
    let index = listeners[e].indexOf(fn);
    if (index === -1) {
        listeners[e].push(fn);
    }
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
        listeners[e] = listeners[e].filter(x => x != fn);
    }
}