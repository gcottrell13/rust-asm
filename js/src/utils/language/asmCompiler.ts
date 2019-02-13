import { SMap } from '../utilTypes';
import {
	AsmEmitter,
	OpcodeFactory,
	isLabel,
	isComment,
	DSLError,
	catchAndReportErrors,
	isVariable,
	AsmEmitterExt,
	DSLAggregateError, machineOperation,
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
}

class VarDeclaration extends Element {
	name: string;
	declaration: string[];

	constructor(location: number, name: string, declaration: string[]) {
		super(location);
		this.name = name;
		this.declaration = declaration;
	}
}

class LabelDeclaration extends Element {
	name: string;

	constructor(location: number, name: string) {
		super(location);
		this.name = name;
	}
}

class AsmDeclaration extends Element {
	operations: machineOperation[];
	op: string;
	constructor(location: number, op: string, operations: machineOperation[]) {
		super(location);
		this.op = op;
		this.operations = operations;
	}
}

class GlobalVariableDeclaration extends Element {
	name: string;
	typeName: string;
	value: string;

	complete: boolean = false;
	size: number = 0;

	constructor(location: number, name: string, typeName: string, value: string) {
		super(location);
		this.name = name;
		this.typeName = typeName;
		this.value = value;
	}
}

export class AsmCompiler {

	// [varname] = variable information;
	private readonly variables: SMap<VarDeclaration>;
	private readonly labels: SMap<LabelDeclaration>;
	private readonly opcodes: SMap<AsmEmitterExt>;

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

	private makeVariable(str: string, ...value: string[]) {
		if (str in this.variables) {
			throw new DSLError(`Already have a variable '${str}'`);
		}
		else {
			const v = new VarDeclaration(this.getNextElementIndex(), str, value);
			this.insertElement(v);
			this.variables[str] = v;
		}
	}

	private makeAsmStatement(op: string, params: machineOperation[]) {
		const a = new AsmDeclaration(this.getNextElementIndex(), op, params);
		this.insertElement(a);
	}

	private makeGlobal(line: string) {
		const a = lineStartGlobalDeclaration(line);
		this.globalsIndex.push(a);
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
			const norm = line.trim().replace(spaceRegex, ' ').split(' ');

			if (norm.length === 0)
				return;

			const [first, ...rest] = norm;

			if (section === SECTION.none) {
				if (first === '.text') {
					section = SECTION.text;
				}
				else if (first === '.data') {
					section = SECTION.data;
				}
				throw new DSLError('.text or .data must be first in program');
			}
			else if (section === SECTION.data) {
				if (first === '.text') {
					section = SECTION.text;
				}

				// variable declaration
				const lastVar = this.getLastDeclaredGlobal();
				if (lastVar && !lastVar.complete) {
					lineContinueGlobalDeclaration(line, lastVar);
				}
				else {
					this.makeGlobal(line);
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

			//#region Variable Declaration
			else if (first === 'let' && rest.length >= 1 && isVariable(rest[0])) {
				const [varName, declaration] = [...rest];
				this.makeVariable(varName, ...declaration);
			}
			//#endregion

			//#region Other Statements
			else {
				const okOpcode = first in this.opcodes;
				const okRest = rest.map(isAcceptable).every(v => v);

				if (!okOpcode) {
					throw new DSLError(`Invalid operation: ${first}`);
				}

				if (!okRest) {
					throw new DSLError(`Invalid parameters: ${rest.join(' ')}`);
				}

				const opcode = this.opcodes[first];
				const r = opcode(...rest);
				this.makeAsmStatement(first, r);
			}

			//#endregion

		});

		if (errors.length === 0) {

			// move all global variable declarations to the top
			// flatten all statements into giant array of callbacks
			// invoke each callback to generate values
			// return
			const codes: number[] = [];

			return codes.join('\n');
		}
		else {
			// errors.forEach(error => console.error(error.message));
			throw new DSLAggregateError(errors);
		}
	};

}

function lineStartGlobalDeclaration(line: string): GlobalVariableDeclaration {
	const dec = new GlobalVariableDeclaration(0, '', '', '');
	dec.complete = false;
	return dec;
}

function lineContinueGlobalDeclaration(line: string, dec: GlobalVariableDeclaration) {

	dec.complete = true;
}

InitializeWindowBarrel('ASMCompiler', {
	AsmCompiler,
	isAcceptable,
	spaceRegex,
	acceptableNumberRegex,
	acceptableVariableRegex,
});