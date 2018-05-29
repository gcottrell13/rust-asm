import { ReadFromBuffer } from "./language/syscalls";


let screenBuffer: number[] = [];

const EMPTY_COLOR = [0, 0, 0];
let colorPalette: [number, number, number][] = [];

let width: number = 4;
let height: number = 4;


/**
 * To be called via syscall
 */
export function SyscallSwapScreenBuffer() {
    let newContents = ReadFromBuffer(2) || [];

    newContents.forEach((value, index) => {
        if (value != screenBuffer[index]) {
            DrawPixel(index, value);
        }
    });

}

function DrawPixel(index: number, paletteId: number) {
    let x = index % width;
    let y = Math.floor(index / width);

    if (y < height) {
        let paletteColor = colorPalette[paletteId] || EMPTY_COLOR;
        // do drawing
    }
}

/**
 * Refreshes the color palette (does not trigger a re draw)
 */
export function ReadColorPalette() {

}