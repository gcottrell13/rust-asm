import { SMap } from '../utilTypes';
import { toInt, toIntOrNull } from '../generalUtils';
import { InitializeWindowBarrel } from '../windowBarrel';
import { isNullOrWhitespace } from '../stringUtils';

type keysToFunctions<T> = {
	[P in keyof T]: () => T[P];
};
type mapParts<T, to> = {
	[P in keyof T]: to;
};

type opcodeInfoBindType<T> =
	T extends (... args: number[]) => number[] ?
		(... args: argsToFunctions<T>) => OpcodeBoundWithData
	: unknown;

export interface OpcodeInformation<T> {
	bind: opcodeInfoBindType<T>;
	// call: argsAndReturnToFunctions<T>;
	name: string;
}

export interface OpcodeBoundWithData {
	call: () => number[];
	info: OpcodeInformation<any>;
}

type argsToFunctions<T> =
	T extends (... args: infer InputTuple) => any ?
		keysToFunctions<InputTuple> : [];

export type argsAndReturnToFunctions<T> =
	T extends (...args: infer InputTuple) => infer R ?
	(...args: keysToFunctions<InputTuple>) => () => R :
		() => () => [];

export function transformer<Inputs extends number[]>(func: (...args: Inputs) => number[]): OpcodeInformation<(... args: Inputs) => number[]> {
	const info = {
		bind: (...args: argsToFunctions<typeof func>) => ({
			call: () => func(...args.map(a => a()) as any),
			info,
		}),
		name: func.name,
	};
	return info as any;
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
) => SMap<AsmEmitter>;

/**
 * the order of these declarations is very important
 * @param str
 */
export function int(str: string): () => number;
export function int(...strings: string[]): () => number[];
export function int(...strings: string[]): () => (number | number[]) {
	const ints = strings.map(toInt);
	if (strings.length === 1) {
		return () => ints[0];
	}
	return () => ints;
}

export function mode(i: number): () => number {
	return () => i;
}

export type machineOperation = () => number[];
export interface AsmToMachineCodes {
	operations: OpcodeBoundWithData[];
	generatingOperation: string;
}


/**
 * @param parameters The parameters that were supplied
 */
export type AsmEmitter = (
	parameters: string[]
) => AsmToMachineCodes;

export const assemblerDirectives = {
	'.text'() {

	},

	'.data'() {

	},


};

/**
 *
 * @param part1 already normalized
 * returns label name
 */
export function getLabel(part1: string): string {
	const result = labelRegex.exec(part1);
	if (result) {
		return result[1] || result[0];
	}
	return part1;
}
export function isLabel(str: string): boolean {
	return labelRegex.exec(str) !== null;
}

export const labelRegex = /^@([\w$_][\w\d$_\-]+)$/;


export function isComment(part1: string) {
	if (part1)
		return commentRegex.test(part1);
	return false;
}

const commentRegex = /^\/\//;

export function isVariable(varName: string) {
	if (varName)
		return varNameRegex.test(varName);
	return false;
}

//#region variable parsing

/**
 */
const variableRegex = /(([a-zA-Z_$][a-zA-Z_$\d]*)(\[[ \t]*(([+\-]?\d+)|([a-zA-Z_$][a-zA-Z_$\d]*))[ \t]*\])?)/;

const constantRegex = /[+\-]?\d+/;

/**
 * Evaluated variable expressions can take many forms
 *
 * myVar
 * myVar +1
 * myVar +otherVar
 *
 */
/**
 * Gets the name of the variable
 */
const varNameRegex = /[a-zA-Z_$][a-zA-Z_$\d]*/;

export type VariableParts = {
	name: string;
	constantOffset: number | null;
	variableOffset: string | null;
};

function _getVariableParts(str: string): VariableParts | null {
	const result = variableRegex.exec(str);
	if (!result) {
		return null;
	}
	const [/*zero*/, /*one*/, varName, /*three*/, /*four*/, constantOffset, variableOffset] = result;

	const varParts = {
		name: varName,
		constantOffset: toIntOrNull(constantOffset),
		variableOffset: isNullOrWhitespace(variableOffset) ? null : variableOffset,
	};

	if (varParts.constantOffset === null && varParts.variableOffset === null && varParts.name.length !== str.length) {
		throw new DSLError(`Could not parse offset of '${str}'`);
	}

	return varParts;
}

export function getVariableParts(str: string): VariableParts | null;
export function getVariableParts<Ttuple extends string[]>(...strs: Ttuple): mapParts<Ttuple, VariableParts | null>;
export function getVariableParts<Ttuple extends string[]>(...strs: Ttuple): VariableParts | null | mapParts<Ttuple, VariableParts | null> {
	if (strs.length === 1) {
		return _getVariableParts(strs[0]);
	}
	return strs.map(_getVariableParts) as mapParts<Ttuple, VariableParts | null>;
}

//#endregion

//#region token parsing

function skipChars(str: string, cmp: string | RegExp) {
	let i = 0;
	let head = str[0];
	while (head && head.match(cmp)) {
		head = str[++i];
	}
	return str.substring(i);
}

const skipWs = (str: string) => skipChars(str, /\s/);
function expectEOL(str: string) {
	if (skipWs(str) !== '') throw new DSLError(`Expected the EOL, but got ${str}`);
}

function getChars(str: string, cmp: string | RegExp): [string, string] {
	let i = 0;
	let head = str[0];
	while (head && head.match(cmp)) {
		head = str[++i];
	}
	return [str.substring(0, i), str.substring(i)];
}

function getNextToken(str: string): [string, string];
function getNextToken(str: string, pattern: RegExp): [string, string] | null;
function getNextToken(str: string, pattern?: RegExp): [string, string] | null {
	if (pattern) {
		str = skipWs(str);
		const match = pattern.exec(str);
		if (match && str.startsWith(match[0])) {
			return [match[1] || match[0], str.substring(match[0].length)];
		}
		return null;
	}
	return getChars(
		skipWs(str),
		/[^\s]/
	);
}

function expectNextToken(str: string, toBe: string | RegExp | string[], customError?: string): [string, string] {
	if (Array.isArray(toBe)) {
		const [token, rest] = getNextToken(str);
		if (!toBe.includes(token)) {
			throw new DSLError(customError || `Expected one of: '${toBe.join(',')}' but got ${token}`);
		}
		return [token, rest];
	}
	else if (toBe instanceof RegExp) {
		const token = getNextToken(str, toBe);
		if (!token) throw new DSLError(customError || `Could not match pattern`);
		return token;
	}
	else {
		const [token, rest] = getNextToken(str);
		if (token !== toBe) {
			throw new DSLError(customError || `Error: expected '${toBe}' but got '${token}'`);
		}
		return [token, rest];
	}
}

//#endregion

//#region global declaration parsing

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


export enum VariableType {
	Unit = 'Unit',
	Array = 'Array',
}

export type startGlobalDeclaration = {
	name: string;
	type: VariableType.Unit;
	value: number;
} | {
	name: string;
	type: VariableType.Array;
	value: number[];
};

export function startGlobalDeclaration(line: string): startGlobalDeclaration {
	let name: string, type: string, value: string;
	[, line] = expectNextToken(line, 'var', `Expected 'var'`);
	[name, line] = expectNextToken(line, varNameRegex, `Expected a variable name after 'var'`);
	[type, line] = expectNextToken(line, /string|number|array/, 'Expected either string, number, or array for declaration type');
	line = skipWs(line);

	switch (type) {
		case 'string':
			[value, line] = expectNextToken(line, stringDeclarationRegex);
			expectEOL(line);
			return {
				name,
				type: VariableType.Array,
				value: [...value].map(x => x.charCodeAt(0)),
			};
		case 'number':
			[value, line] = expectNextToken(line, numberDeclarationRegex);
			expectEOL(line);
			return {
				name,
				type: VariableType.Unit,
				value: toInt(value),
			};
		case 'array':
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
				type: VariableType.Array,
				value: arr,
			};
		default:
			throw new DSLError('');
	}
}

export function continueGlobalDeclaration(line: string): number[] {
	let value: string;

	const arr: number[] = [];
	while (true) {
		if (line === '') {
			break;
		}
		[value, line] = expectNextToken(line, arrayDeclarationRegex);
		arr.push(toInt(value));
	}

	return arr;
}

//#endregion

//#region dsl argument parsing

export function parseArguments(_line: string): string[] {
	let line = _line;
	let value: string = '';
	const args: string[] = [];

	while (true) {
		const token = getNextToken(line, variableRegex) || getNextToken(line, constantRegex);

		if (token) {
			[value, line] = token;
			args.push(value);
			continue;
		}
		else if (isNullOrWhitespace(line)) {
			break;
		}

		throw new DSLError(`Could not get a parameter from line segment ${line}`);
	}

	return args;
}

//#endregion

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

export function catchAndReportErrors<T>(list: T[], fn: (element: T, index: number) => void) {
	const errors: Error[] = [];

	for (let index = 0; index < list.length; index++) {
		const element = list[index];
		try {
			fn(element, index);
		}
		catch (e) {
			errors.push(new Error(`${e.name} ${index}: ${e.message}`));
		}
	}

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
	startGlobalDeclaration,
	continueGlobalDeclaration,
	parseArguments,
});