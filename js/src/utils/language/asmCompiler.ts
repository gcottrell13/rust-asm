import { SMap } from '../utilTypes';
import {
	AsmEmitter,
	OpcodeFactory,
	isLabel,
	isComment,
	DSLError,
	catchAndReportErrors,
	isVariable,
	DSLAggregateError,
	machineOperation,
	startGlobalDeclaration,
	acceptableVarTypes,
	continueGlobalDeclaration,
	parseArguments, AsmToMachineCodes,
} from './dslaHelpers';
import { InitializeWindowBarrel } from '../windowBarrel';

const spaceRegex = / +/g;
const acceptableVariableRegex = /^[a-zA-Z]\w+$/;
const acceptableNumberRegex = /^\d+$/;
const isAcceptable = (s: string) => acceptableVariableRegex.test(s) || acceptableNumberRegex.test(s);

abstract class Element {
	protected _location: number = 0;

	constructor(location: number) {
		this._location = location;
	}

	get location() {
		return this._location;
	}

	abstract emit(): number[];
}

class LabelDeclaration extends Element {
	name: string;

	constructor(location: number, name: string) {
		super(location);
		this.name = name;
	}

	emit(): number[] {
		return [];
	}
}

class AsmDeclaration extends Element {
	operations: AsmToMachineCodes;
	op: string;
	constructor(location: number, op: string, operations: AsmToMachineCodes) {
		super(location);
		this.op = op;
		this.operations = operations;
	}

	emit(): number[] {
		return [];
	}
}

class GlobalVariableDeclaration extends Element {
	name: string;
	typeName: string;
	value: acceptableVarTypes;

	complete: boolean = false;

	constructor(location: number, name: string, typeName: string, value: acceptableVarTypes) {
		super(location);
		this.name = name;
		this.typeName = typeName;
		this.value = value;
	}

	emit(): number[] {
		return Array.isArray(this.value) ? this.value : [this.value];
	}

}

export class AsmCompiler {

	// [varname] = variable information;
	private readonly variables: SMap<GlobalVariableDeclaration>;
	private readonly labels: SMap<LabelDeclaration>;
	private readonly opcodes: SMap<AsmEmitter>;

	private readonly elementIndex: Element[];

	private readonly globalsIndex: GlobalVariableDeclaration[];

	constructor(opcodes: OpcodeFactory) {
		this.variables = {};
		this.labels = {};
		this.elementIndex = [];
		this.globalsIndex = [];
		this.opcodes = opcodes(this.varGetter, this.labelGetter);
	}

	private varGetter = (...strings: string[]): any => {
		return strings.map(str => () => {
			if (str in this.variables) {
				return this.variables[str].location;
			}
			throw new Error(`Cannot find variable '${str}'`);
		});
	};

	private labelGetter = (...strings: string[]): any => {
		return strings.map(str => () => {
			if (str in this.labels) {
				return this.labels[str].location;
			}
			throw new Error(`Cannot find label '${str}'`);
		});
	};

	private getNextElementIndex(): number {
		return this.elementIndex.length;
	}

	private insertElement(e: Element) {
		this.elementIndex.push(e);
	}

	private makeLabel(str: string) {
		if (str in this.labels) {
			throw new DSLError(`Already have a label '${str}'`);
		}
		else {
			const l = new LabelDeclaration(this.getNextElementIndex(), str);
			this.insertElement(l);
			this.labels[str] = l;
		}
	}

	private makeAsmStatement(op: string, params: AsmToMachineCodes) {
		const a = new AsmDeclaration(this.getNextElementIndex(), op, params);
		this.insertElement(a);
	}

	private makeGlobal(line: string) {
		const a = lineStartGlobalDeclaration(line);
		if (a.name in this.variables) {
			throw new DSLError(`Already have a variable '${a.name}'`);
		}
		else {
			this.variables[a.name] = a;
			this.globalsIndex.push(a);
		}
	}

	private getLastDeclaredGlobal() {
		return this.globalsIndex[this.globalsIndex.length - 1];
	}

	emit = (text: string[]): string => {

		enum SECTION {
			data,
			text,
			none,
		}

		let section: SECTION = SECTION.none;

		const errors = catchAndReportErrors(text, (line) => {
			// normalize the line
			line = line.trim();
			if (line.length === 0) {
				return;
			}

			const norm = line.replace(spaceRegex, ' ').split(' ');

			if (norm.length === 0)
				return;

			const [first, ...rest] = norm;

			if (section === SECTION.none) {
				if (first === '.text') {
					section = SECTION.text;
					return;
				}
				else if (first === '.data') {
					section = SECTION.data;
					return;
				}
				else {
					throw new DSLError('.text or .data must be first in program');
				}
			}
			else if (section === SECTION.data) {
				if (first === '.text') {
					const lastVar = this.getLastDeclaredGlobal();
					if (!lastVar.complete) {
						throw new DSLError(`Incomplete data definition for ${lastVar.name}`);
					}

					section = SECTION.text;
					return;
				}
				else {
					// variable declaration
					const lastVar = this.getLastDeclaredGlobal();
					if (lastVar && !lastVar.complete) {
						lineContinueGlobalDeclaration(line, lastVar);
					}
					else {
						this.makeGlobal(line);
					}
				}
				return;
			}

			//#region Comments
			if (isComment(first)) {
				console.log('Comment:', line);
			}
			//#endregion

			//#region Data
			else if (first === '.data') {
				section = SECTION.data;
			}
			//#endregion

			//#region Label
			else if (isLabel(first)) {
				if (rest.length === 0) {
					this.makeLabel(first.replace(':', ''));
					console.log('Label:', line);
				}
				else {
					throw new DSLError(`Label '${first}' must not have anything else on the same line.`);
				}
			}
			//#endregion

			//#region Other Statements
			else {
				if (!(first in this.opcodes)) {
					throw new DSLError(`Invalid operation: ${first}`);
				}

				const restString = rest.join(' ');
				const args = parseArguments(restString);

				const opcode = this.opcodes[first];
				const r = opcode(args);
				this.makeAsmStatement(first, r);
			}

			//#endregion

		});

		if (errors.length === 0) {

			// move all global variable declarations to the top
			// flatten all statements into giant array of callbacks
			// invoke each callback to generate values
			// return
			let codes: (string | number)[] = [];

			this.globalsIndex.forEach((gvd: GlobalVariableDeclaration) => {
				codes.push(`#${gvd.name}: ${gvd.typeName}`);
				codes = codes.concat(gvd.emit());
			});

			return codes.join('\n');
		}
		else {
			// errors.forEach(error => console.error(error.message));
			throw new DSLAggregateError(errors);
		}
	};

}

function lineStartGlobalDeclaration(line: string): GlobalVariableDeclaration {
	const start = startGlobalDeclaration(line);
	const dec = new GlobalVariableDeclaration(0, start.name, start.type, start.value);
	dec.complete = start.complete;
	return dec;
}

function lineContinueGlobalDeclaration(line: string, dec: GlobalVariableDeclaration) {
	if (!Array.isArray(dec.value))
		throw new DSLError(`Cannot continue on type ${dec.typeName}`);
	const { value, complete } = continueGlobalDeclaration(line);
	dec.complete = complete;
	dec.value = dec.value.concat(value);
}

InitializeWindowBarrel('ASMCompiler', {
	AsmCompiler,
	isAcceptable,
	spaceRegex,
	acceptableNumberRegex,
	acceptableVariableRegex,

	lineStartGlobalDeclaration,
	lineContinueGlobalDeclaration,
});