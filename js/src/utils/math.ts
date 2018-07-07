
export type Scalar = number;

export interface Line {
	slope: Scalar | null;
	intercept: Scalar;
}
export interface LineSegment extends Line {
	// boundA <= boundB
	boundA: Scalar;
	boundB: Scalar;
}
export interface Point2d {
	x: Scalar;
	y: Scalar;
}