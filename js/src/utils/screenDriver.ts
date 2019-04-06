import { ReadFromBuffer, GetBufferOfType, BufferType } from './wasmWorker/syscalls';
import { compose, Maybe, collapse } from './utilTypes';
import * as d from './drawing';
import { group } from './generalUtils';
import { InitializeWindowBarrel } from './windowBarrel';

export type PaletteColor = [number, number, number];

let screenBuffer: number[] = [];

const EMPTY_COLOR: PaletteColor = [0, 0, 0];
let colorPalette: PaletteColor[] = [];

let width: number = 4;
let height: number = 4;

const pixelWidth: number = 5;
const pixelHeight: number = 5;

let DEBUG: boolean = false;
const debugColor: PaletteColor = [0, 255, 0];

export function SetDebugMode(tf: boolean) {
	DEBUG = tf;
}

/**
 * To be called via syscall
 */
export function RefreshScreen() {
	d.Begin();
	let newBuffer: number[] = [];

	d.SetCurrentLayer(1);

	const changed: number[] = [];

	GetBufferOfType(BufferType.OUTPUT_SCREEN)
		.prop('id')
		.map(ReadFromBuffer)
		.map(collapse)
		.map(b => b.forEach((value, index) => {
			newBuffer.push(value);
			if (value !== screenBuffer[index]) {
				DrawPixel(index, value);
				changed.push(index);
			}
		}));

	d.Flush();

	if (DEBUG) {
		// if debug, draw outlines around each changed pixel
		// onto the debug layer
		d.SetCurrentLayer(2);
		d.SetRGBArray(debugColor);

		changed.forEach((index) => {
			let x = index % width;
			let y = Math.floor(index / width);
			d.DrawRectEmptyOuterWidth(x, y, pixelWidth, pixelHeight);
		});

		d.Flush();
	}

	screenBuffer = newBuffer;
}

function DrawPixel(index: number, paletteId: number) {
	let x = index % width;
	let y = Math.floor(index / width);

	if (y < height) {
		Maybe(colorPalette[paletteId])
			.else(() => EMPTY_COLOR)
			.map(d.SetRGBArray);

		// do drawing
		d.DrawRectSolid(
			x * pixelWidth,
			y * pixelHeight,
			pixelWidth,
			pixelHeight
		);
	}
}

/**
 * Refreshes the color palette (does not trigger a re draw)
 */
export function ReadColorPalette() {
	GetBufferOfType(BufferType.OUTPUT_PALETTE)
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

InitializeWindowBarrel('screenDriver', {
	DrawPixel,
	SetDebugMode,
	ReadColorPalette,
	RefreshScreen,
});