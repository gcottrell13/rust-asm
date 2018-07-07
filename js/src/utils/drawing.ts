import { Line, LineSegment, Point2d, Scalar } from './math';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let onFrame: (timestamp?: number) => void;

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
    canvas = document.getElementById(id) as HTMLCanvasElement;
    ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    return [canvas, ctx];
}

export function SetCanvasAsLayer(ctx: CanvasRenderingContext2D, layer: number) {
    layers[layer] = ctx;
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
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
	}
    else {
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    }
}
export function SetColorStr(str: string) {
    ctx.fillStyle = str;
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

export function DrawCircle(center: Point2d, radius: Scalar) {
	ctx.moveTo(center.x + radius + dx, center.y + dy);
    ctx.arc(center.x + dx, center.y + dy, radius, 0, Math.PI * 2, true);
}

export function DrawRectSolid(start: Point2d, width: Scalar, height: Scalar) {
    ctx.fillRect(start.x + dx, start.y + dy, width, height);
}

export function DrawRectEmpty(start: Point2d, width: Scalar, height: Scalar) {
    ctx.rect(start.x + dx, start.y + dy, width, height);
}