import { SMap } from '../utilTypes';
import { AsmEmitter, OpcodeFactory, isLabel, isComment, DSLError, catchAndReportErrors, isVariable } from './dslaHelpers';
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
	constructor(location: number, name: string) {
		super(location);
		this.name = name;
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
	params: (() => number[])[];
	constructor(location: number, params: (() => number[])[]) {
		super(location);
		this.params = params;
	}
}

class DirectiveDeclaration extends Element {

}

export class AsmCompiler {

	// [varname] = variable information;
	private readonly variables: SMap<VarDeclaration>;
	private readonly labels: SMap<LabelDeclaration>;
	private readonly opcodes: SMap<AsmEmitter>;

	private readonly elementIndex: Element[];

	constructor(opcodes: OpcodeFactory) {
		this.variables = {};
		this.labels = {};
		this.elementIndex = [];
		this.opcodes = opcodes(this.varGetter, this.labelGetter);
	}

	private varGetter = (... strings: string[]) => {
		return strings.map(str => () => {
			if (str in this.variables) {
				return this.variables[str].location;
			}
			throw new Error(`Cannot find variable '${str}'`);
		});
	};

	private labelGetter = (... strings: string[]) => {
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

	private makeVariable(str: string) {
		if (str in this.variables) {
			throw new DSLError(`Already have a variable '${str}'`);
		}
		else {
			const v = new VarDeclaration(this.getNextElementIndex(), str);
			this.insertElement(v);
			this.variables[str] = v;
		}
	}

	private makeAsmStatement(op: string, params: (() => number[])[]) {
		const a = new AsmDeclaration(this.getNextElementIndex(), params);
		this.insertElement(a);
	}

	emit = (text: string[]): string => {
		const codes: number[] = [];

		const errors = catchAndReportErrors(text, (line) => {
			// normalize the line
			const norm = line.trim().replace(spaceRegex, ' ').split(' ');

			if (norm.length === 0) 
				return;
			
			const [first, ...rest] = norm;
			
			//#region Comments
			if (isComment(first)) {
				console.log('Comment:', line);
			}
			//#endregion

			//#region Text
			else if (first === '.text') {

			}
			//#endregion

			//#region Data
			else if (first === '.data') {

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
			else if (first === 'dec' && rest.length >= 1 && isVariable(rest[0])) {
				this.makeVariable(rest[0]);
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
				const r = opcode(... rest);
				this.makeAsmStatement(first, r);
			}

			//#endregion

		});

		if (errors.length === 0) {
			return codes.join('\n');
		}
		else {
			errors.forEach(error => console.error(error));
			throw new Error();
		}
	};

}

InitializeWindowBarrel('ASMCompiler', {
	AsmCompiler,
	isAcceptable,
	spaceRegex,
	acceptableNumberRegex,
	acceptableVariableRegex,
});