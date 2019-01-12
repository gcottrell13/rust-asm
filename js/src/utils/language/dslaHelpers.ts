import { SMap } from '../utilTypes';
import { toInt } from '../generalUtils';
import { InitializeWindowBarrel } from '../windowBarrel';

type fnOf<T> = {
	[P in keyof T]: () => T[P];
};
type mapParts<T, to> = {
	[P in keyof T]: to;
};

export type changeParamTypes<T> = T extends (...args: infer InputTuple) => infer R ? (...args: fnOf<InputTuple>) => () => R : unknown;

export function transformer<Inputs extends any[], Return>(func: (...args: Inputs) => Return) {
	return (...args: fnOf<Inputs>) => () => func(...args.map(a => a()) as any);
}

export type RestFnTo<ArrItem, ReturnType> = <T extends ArrItem[]>(... items: T) => mapParts<T, ReturnType>;

export type OpcodeFactory = (
	/**
     * Returns the location of variables
     */
	varLocationGetter: RestFnTo<string, () => number>,

	/**
	 * Returns something that will return a number
	 */
	labelLocationGetter: RestFnTo<string, () => number>
) => SMap<AsmEmitterExt>;

export function enforceInt(str: string) {
	return toInt(str);
}

/**
 * the order of these declarations is very important
 * @param str 
 */
export function int(str: string): () => number;
export function int(...strings: string[]): () => number[];
export function int(...strings: string[]): () => (number | number[]) {
	if (strings.length === 1) {
		return () => enforceInt(strings[0]);
	}
	return () => strings.map(enforceInt);
}

export type AsmEmitter = (
	/**
     * the parameters that were supplied
     */
	...parameters: string[]
) => ((() => number[]) | (() => number[])[])[];
export type AsmEmitterExt = (
	/**
     * the parameters that were supplied
     */
	...parameters: string[]
) => (() => number[])[];

export const assemblerDirectives = {
	'.text'() {

	},

	'.data'() {

	},


};

/**
 * 
 * @param part1 already normalized
 */
export function isLabel(part1: string) {
	if (part1)
		return labelRegex.test(part1);
	return false;
}
const labelRegex = /^\w+:$/;


export function isComment(part1: string) {
	if (part1)
		return commentRegex.test(part1);
	return false;
}
const commentRegex = /^#/;

export function isVariable(varName: string) {
	if (varName)
		return varNameRegex.test(varName);
	return false;
}
const varNameRegex = /^[a-zA-Z_$][a-zA-Z_$\d]+([\+\-]\d+)?$/;

/**
 * Identifies if there is a constant added to the variable
 */
const varNameHasConstRegex = /^[a-zA-Z_$][a-zA-Z_$\d]+([\+\-]\d+)$/;
/**
 * Gets the name of the variable
 */
const varNameOnlyRegex = /^[a-zA-Z_$][a-zA-Z_$\d]+/;
/**
 * Gets the constant value after the variable (if it exists)
 */
const varNameConstOnlyRegex = /([\+\-]\d+)$/;

export type VariableParts = {
	name: string;
	constant: number;
	hasConstant: boolean;
};

function _getVariableParts(str: string): VariableParts {
	const hasConstant = varNameHasConstRegex.test(str);
	return {
		name: str.match(varNameOnlyRegex)![0],
		constant: hasConstant ? toInt(str.match(varNameConstOnlyRegex)![0]) : 0,
		hasConstant,
	};
}

export function getVariableParts<Ttuple extends string[]>(... strs: Ttuple): mapParts<Ttuple, VariableParts> {
	return strs.map(_getVariableParts) as mapParts<Ttuple, VariableParts>;
}

export class DSLError implements Error {
	name: string = 'DSLError';
	message: string;
	stack?: string | undefined;

	constructor(msg: string, name?: string) {
		this.message = msg;
		this.name = name || this.name;
	}
}

export function catchAndReportErrors<T>(list: T[], fn: (element: T, index: number, arr: T[]) => void) {
	const errors: string[] = [];

	list.forEach((element: T, index: number) => {
		try {
			fn(element, index, list);
		}
		catch (e) {
			errors.push(`${e.name} ${index}: ${e.message}`);
		}
	});

	return errors;
}






InitializeWindowBarrel('DSLAHelpers', {
	isLabel,
	isComment,
	isVariable,
	getVariableParts,
});