import { Line, LineSegment, Point2d, Scalar } from './math';
import { InitializeWindowBarrel } from './windowBarrel';

let onFrame: (timestamps: number) => void;

let ctx: CanvasRenderingContext2D;
let layers: CanvasRenderingContext2D[] = [];

let width: number;
let height: number;

// controls how things are drawn onto the screen
let dx: number = 0;
let dy: number = 0;
let r: number = 0;
let sx: number = 1;
let sy: number = 1;

let animatingId: number | null = null;

/*
 * Initialization
 *
 *
 */

export function GetCanvas(id: string): [HTMLCanvasElement, CanvasRenderingContext2D] {
	let canvas = document.getElementById(id) as HTMLCanvasElement;
	let _ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	ctx = _ctx;
	return [canvas, ctx];
}

export function SetCanvasAsLayer(ctx: CanvasRenderingContext2D, layer: number) {
	layers[layer] = ctx;
}

export function SetCurrentLayer(n: number) {
	ctx = layers[n] || ctx;
}

export function SetOnFrame(o: (timestamp: number) => void) {
	onFrame = o;
}

export function SetDimensions(w: number, h: number) {
	width = w;
	height = h;
}

/*
 * Functions to control animation
 *
 *
 */

export function StartAnimation() {
	if (animatingId === null) {
		animatingId = window.requestAnimationFrame(animate);
	}
}
export function StopAnimation() {
	if (animatingId !== null) {
		window.cancelAnimationFrame(animatingId);
		animatingId = null;
	}
}
export function IsAnimationRunning() {
	return animatingId !== null;
}

function animate(timestamp: number) {
	ctx.clearRect(0, 0, width, height);
	Begin();
	onFrame(timestamp);
	Flush();
	animatingId = window.requestAnimationFrame(animate);
}

/**
 * Functions for transforming the drawing canvas
 *
 *
 *
*/

// affine transformations

export function ClearTransforms() {
	dx = 0;
	dy = 0;
	sx = 1;
	sy = 1;
	r = 0;
}

export function Translate(x: number, y: number) {
	dx = x;
	dy = y;
}

// color transformations

export function SetRGBArray(c: [number, number, number]) {
	SetColorRGBA(c[0], c[1], c[2], 255);
}

export function SetColorRGBA(r: number, g: number, b: number, a?: number) {
	if (a !== undefined) {
		ctx.strokeStyle = ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
	}
	else {
		ctx.strokeStyle = ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
	}
}
export function SetColorStr(str: string) {
	ctx.strokeStyle = ctx.fillStyle = str;
}

/*
 * Functions for drawing shapes
 */

export function Flush() {
	ctx.stroke();
}
export function Begin() {
	ctx.beginPath();
}

export function DrawSegment(line: LineSegment) {
	if (line.slope === null) {
		ctx.moveTo(line.intercept + dx, line.boundA + dy);
		ctx.lineTo(line.intercept + dx, line.boundB + dy);
	}
	else {
		let ep1x = line.boundA;
		let ep1y = line.boundA * line.slope + line.intercept;
		let ep2x = line.boundB;
		let ep2y = line.boundB * line.slope + line.intercept;
		ctx.moveTo(ep1x + dx, ep1y + dy);
		ctx.lineTo(ep2x + dx, ep2y + dy);
	}
}

export function DrawCircle(x: Scalar, y: Scalar, radius: Scalar) {
	ctx.moveTo(x + radius + dx, y + dy);
	ctx.arc(x + dx, y + dy, radius, 0, Math.PI * 2, true);
}

export function DrawRectSolid(x: Scalar, y: Scalar, width: Scalar, height: Scalar) {
	ctx.fillRect(x + dx, y + dy, width, height);
}

export function DrawRectEmptyOuterWidth(x: Scalar, y: Scalar, width: Scalar, height: Scalar) {
	ctx.rect(x + dx + 0.5, y + dy + 0.5, width - 1, height - 1);
}

export function DrawRectEmptyInnerWidth(x: Scalar, y: Scalar, width: Scalar, height: Scalar) {
	ctx.rect(x + dx + 0.5, y + dy + 0.5, width + 1, height + 1);
}

InitializeWindowBarrel('drawing', {
	DrawCircle,
	DrawRectEmptyOuterWidth,
	DrawRectEmptyInnerWidth,
	DrawRectSolid,
	DrawSegment,
	Begin,
	Flush,
	SetCanvasAsLayer,
	SetColorRGBA,
	SetColorStr,
	SetCurrentLayer,
	SetRGBArray,
});