import { ReadFromBuffer, GetBufferOfType, BufferType } from "./language/syscalls";
import { compose, Maybe, collapse } from "./utilTypes";
import * as d from './drawing';
import { group } from "./generalUtils";

export type PaletteColor = [number, number, number];

let screenBuffer: number[] = [];

const EMPTY_COLOR: PaletteColor = [0, 0, 0];
let colorPalette: PaletteColor[] = [];

let width: number = 4;
let height: number = 4;

let pixelWidth: number = 0;
let pixelHeight: number = 0;

let DEBUG: boolean = false;

export function SetDebugMode(tf: boolean) {
    DEBUG = tf;
}

/**
 * To be called via syscall
 */
export function RefreshScreen() {
    d.Begin();
    let newBuffer: number[] = [];

    GetBufferOfType(BufferType.FROM_WASM_DRAWING)
        .prop('id')
        .map(ReadFromBuffer)
        .map(collapse)
        .map(b => b.forEach((value, index) => {
            newBuffer.push(value);
            if (value != screenBuffer[index]) {
                DrawPixel(index, value);
            }
        }));
    
    if (DEBUG) {
        // if debug, draw outlines around each changed pixel
        // onto the debug layer
    }
    
    d.Flush();

    screenBuffer = newBuffer;
}

function DrawPixel(index: number, paletteId: number) {
    let x = index % width;
    let y = Math.floor(index / width);

    if (y < height) {
        Maybe(colorPalette[paletteId])
            .def(() => EMPTY_COLOR)
            .map(d.SetRGBArray);

        // do drawing
        d.DrawRectSolid({
            x: x * pixelWidth,
            y: y * pixelHeight,
        }, pixelWidth, pixelHeight);
    }
}

/**
 * Refreshes the color palette (does not trigger a re draw)
 */
export function ReadColorPalette() {
    GetBufferOfType(BufferType.FROM_WASM_PALETTE)
        .prop('id')
        .map(ReadFromBuffer)
        .map(collapse)
        .map(b => group(3, b))
        .match({
            Just(p) {
                colorPalette = p as any as PaletteColor[];
            },
        });
}

(window as any).ScreenDriver = {
    SetDebugMode,
};