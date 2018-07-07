import { SMap } from "./utilTypes";

export enum ControlKeys {
    TAB = "TAB",
    BACKSPACE = "BACKSPACE",
    RETURN = "RETURN",
    ESCAPE = "ESCAPE",
    PAGE_UP = "PAGE_UP",
    PAGE_DOWN = "PAGE_DOWN",
    END = "END",
    LEFT = "LEFT",
    UP = "UP",
    RIGHT = "RIGHT",
    DOWN = "DOWN",
}

export const KeyCodes: SMap<number> = {
    [ControlKeys.TAB]: 9,
    [ControlKeys.BACKSPACE]: 8,
    [ControlKeys.RETURN]: 13,
    [ControlKeys.ESCAPE]: 27,
    [ControlKeys.PAGE_UP]: 33,
    [ControlKeys.PAGE_DOWN]: 34,
    [ControlKeys.END]: 35,
    [ControlKeys.LEFT]: 37,
    [ControlKeys.UP]: 38,
    [ControlKeys.RIGHT]: 39,
    [ControlKeys.DOWN]: 40,
}