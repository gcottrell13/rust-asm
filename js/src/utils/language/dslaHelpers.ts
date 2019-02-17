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

export type RestFnTo<ArrItem, ReturnType> = <T extends ArrItem[]>(...items: T) => mapParts<T, ReturnType>;

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

export type machineOperation = () => number[];

export type AsmEmitter = (
	/**
	 * the parameters that were supplied
	 */
	...parameters: string[]
) => (machineOperation | machineOperation[])[];
export type AsmEmitterExt = (
	/**
	 * the parameters that were supplied
	 */
	...parameters: string[]
) => machineOperation[];

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

const varNameRegex = /^[a-zA-Z_$][a-zA-Z_$\d]*([\+\-]\d+)?$/;

/**
 * Identifies if there is a constant added to the variable
 */
const varNameHasConstRegex = /^[a-zA-Z_$][a-zA-Z_$\d]*([\+\-]\d+)$/;
/**
 * Gets the name of the variable
 */
const varNameOnlyRegex = /^[a-zA-Z_$][a-zA-Z_$\d]*/;
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

export function getVariableParts<Ttuple extends string[]>(...strs: Ttuple): mapParts<Ttuple, VariableParts> {
	return strs.map(_getVariableParts) as mapParts<Ttuple, VariableParts>;
}


function skipChars(str: string, cmp: string | RegExp) {
	let i = 0;
	let head = str[0];
	while (head && head.match(cmp)) {
		head = str[++i];
	}
	return str.substring(i);
}

const skipWs = (str: string) => skipChars(str, /\s/);

function getChars(str: string, cmp: string | RegExp): [string, string] {
	let i = 0;
	let head = str[0];
	while (head && head.match(cmp)) {
		head = str[++i];
	}
	return [str.substring(0, i), str.substring(i)];
}

function getNextToken(str: string, pattern?: RegExp): [string, string] {
	if (pattern) {
		str = skipWs(str);
		const match = pattern.exec(str);
		if (match && str.startsWith(match[0])) {
			return [match[1] || match[0], str.substring(match[0].length)];
		}
		throw new DSLError(`Could not match pattern '${pattern}' at beginning of string: ${str}`);
	}
	return getChars(
		skipWs(str),
		/[^\s]/
	);
}

function expectNextToken(str: string, toBe: string | RegExp | string[]): [string, string] {
	if (Array.isArray(toBe)) {
		const [token, rest] = getNextToken(str);
		if (!toBe.includes(token)) {
			throw new DSLError(`Expected one of: '${toBe.join(',')}' but got ${token}`);
		}
		return [token, rest];
	}
	else if (toBe instanceof RegExp) {
		return getNextToken(str, toBe);
	}
	else {
		const [token, rest] = getNextToken(str);
		if (token !== toBe) {
			throw new DSLError(`Error: expected '${toBe}' but got '${token}'`);
		}
		return [token, rest];
	}
}

/**
 * declare a : string = "hello"; // semicolon must be on the same line
 * declare a : number = 0; // semicolon must be on the same line
 * declare a : number[] = 0 1 2 3 4;
 * declare a : number[] =   // if semicolon is not on the same line for array, assume incomplete definition
 *    0 0 0 0
 *    0 1 1 0
 *    0 1 1 0
 * ;
 */
const stringDeclarationRegex = new RegExp(/"(.*)"/);
const numberDeclarationRegex = new RegExp(/\d+/);
const arrayDeclarationRegex = new RegExp(/\d+/);

export type acceptableVarTypes = number | number[];

export type startGlobalDeclaration = {
	name: string;
	type: 'unit';
	value: number;
	complete: true;
} | {
	name: string;
	type: 'array';
	value: number[];
	complete: boolean;
};

export function startGlobalDeclaration(line: string): startGlobalDeclaration {
	let name: string, type: string, value: string;
	[, line] = expectNextToken(line, 'declare');
	[name, line] = expectNextToken(line, varNameOnlyRegex);
	[, line] = expectNextToken(line, /:/);
	[type, line] = expectNextToken(line, /string|number|array/);
	[, line] = expectNextToken(line, /=/);
	line = skipWs(line);

	switch (type) {
		case 'string':
			[value, line] = expectNextToken(line, stringDeclarationRegex);
			expectNextToken(line, ';');
			return {
				name,
				type: 'array',
				value: [...value].map(x => x.charCodeAt(0)),
				complete: true,
			};
		case 'number':
			[value, line] = expectNextToken(line, numberDeclarationRegex);
			expectNextToken(line, ';');
			return {
				name,
				type: 'unit',
				value: toInt(value),
				complete: true,
			};
		case 'array':
			const complete = line.trim().endsWith(';');
			const arr: number[] = [];
			while (true) {
				if (line === '') {
					break;
				}
				[value, line] = expectNextToken(line, arrayDeclarationRegex);
				arr.push(toInt(value));
			}

			return {
				name,
				type: 'array',
				value: arr,
				complete,
			};
		default:
			throw new DSLError('');
	}
}

export function continueGlobalDeclaration(line: string): {
	value: number[],
	complete: boolean;
} {
	let value: string;
	const complete = line.trim().endsWith(';');
	const arr: number[] = [];
	while (true) {
		if (line === '') {
			break;
		}
		[value, line] = expectNextToken(line, arrayDeclarationRegex);
		arr.push(toInt(value));
	}

	return {
		value: arr,
		complete,
	};
}

//#region DSL Error

export class DSLError extends Error {
	message: string;

	constructor(msg: string) {
		super(msg);
		this.message = msg;
	}
}

export class DSLAggregateError extends Error {
	constructor(errors: Error[]) {
		super(errors.map(e => e.message).join('\n'));
	}
}

export function catchAndReportErrors<T>(list: T[], fn: (element: T, index: number, arr: T[]) => void) {
	const errors: Error[] = [];

	list.forEach((element: T, index: number) => {
		try {
			fn(element, index, list);
		}
		catch (e) {
			errors.push(new Error(`${e.name} ${index}: ${e.message}`));
		}
	});

	return errors;
}

//#endregion

InitializeWindowBarrel('DSLAHelpers', {
	isLabel,
	isComment,
	isVariable,
	getVariableParts,
	getNextToken,
	expectNextToken,
});