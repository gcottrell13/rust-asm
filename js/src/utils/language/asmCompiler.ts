import { SMap } from '../utilTypes';
import {
	AsmEmitter,
	InstructionFactory,
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
	parseArguments, AsmToMachineCodes, VariableType, getLabel, InstructionBoundWithData,
} from './dslaHelpers';
import { InitializeWindowBarrel } from '../windowBarrel';
import { _DslOpcodes, DslCodeToComment, DslOpcodeParamCounts } from './dslmachine';
import { isNullOrWhitespace } from '../stringUtils';

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

	set location(value: number) {
		this._location = value;
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
	typeName: VariableType;
	value: acceptableVarTypes;

	constructor(location: number, name: string, typeName: VariableType, value: acceptableVarTypes) {
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
	private readonly instructions: SMap<AsmEmitter>;

	private readonly elementIndex: Element[];

	private readonly globalsIndex: GlobalVariableDeclaration[];

	constructor(instructions: InstructionFactory) {
		this.variables = {};
		this.labels = {};
		this.elementIndex = [];
		this.globalsIndex = [];
		this.instructions = instructions(this.varGetter, this.labelGetter);
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
			const label = new LabelDeclaration(this.getNextElementIndex(), str);
			this.insertElement(label);
			this.labels[str] = label;
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
					section = SECTION.text;
					return;
				}
				else if (isComment(first)) {
					console.log('Comment:', line);
				}
				else {
					// variable declaration
					const lastVar = this.getLastDeclaredGlobal();
					if (doesLineStartNewGlobal(line)) {
						this.makeGlobal(line);
					}
					else if (lastVar) {
						lineContinueGlobalDeclaration(line, lastVar);
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
					const label = getLabel(first);
					this.makeLabel(label);
					console.log('Label:', label);
				}
				else {
					throw new DSLError(`Label '${first}' must not have anything else on the same line.`);
				}
			}
			//#endregion

			//#region Other Statements
			else {
				if (!(first in this.instructions)) {
					throw new DSLError(`Invalid operation: ${first}`);
				}

				const restString = rest.join(' ');
				const args = parseArguments(restString);

				const opcode = this.instructions[first];
				const r = opcode(args);
				this.makeAsmStatement(first, r);
			}

			//#endregion

		});

		this.makeAsmStatement('halt', this.instructions['halt']([]));

		if (errors.length === 0) {

			// move all global variable declarations to the top
			// flatten all statements into giant array of callbacks
			// invoke each callback to generate values
			// return
			let codes: (string | number)[] = [];

			this.globalsIndex.forEach((gvd: GlobalVariableDeclaration) => {
				const comment = `#${gvd.typeName} ${gvd.name}`;
				const emitted = gvd.emit();
				if (emitted.length > 0) {
					gvd.location = codes.length + 1 + 3;
					const [head, ... tail] = emitted;
					codes.push(`${head} ${comment}`);
					codes = codes.concat(tail);
					if (gvd.typeName === VariableType.Array)
						codes.push(`0 # null terminate ${gvd.name}`);
				}
			});

			// TODO: insert jump point at beginning of program
			codes.unshift(
				... _DslOpcodes.LoadImmmediateToBus(codes.length + 4),
				... _DslOpcodes.JumpWithBusValueRelative()
			);

			let expanded: InstructionBoundWithData[] = [];
			let expandedWithParamCount = 0;
			const paramCountCache: SMap<number> = {};
			const comments = makeCommentTracker();

			this.elementIndex.forEach((e: Element) => {
				if (e instanceof AsmDeclaration) {
					e.location = expandedWithParamCount + codes.length;
					comments.setInstructionComment(expanded.length, e.operations.generatingInstruction);
					expanded = expanded.concat(e.operations.opcodes);

					// count actual memory spaces taken up by this instruction
					let cache = paramCountCache[e.operations.instructionName];
					if (cache === undefined) {
						cache = 0;
						e.operations.opcodes.forEach((o) => {
							const count = DslOpcodeParamCounts[o.info.name];
							cache += count + 1;
						});
						paramCountCache[e.operations.instructionName] = cache;
					}

					expandedWithParamCount += cache;
				}
				else if (e instanceof LabelDeclaration) {
					e.location = expandedWithParamCount + codes.length + 1;
					comments.setLabelComment(expanded.length, e.name);
				}
			});

			expanded.forEach((mOp, index) => {
				const emitted = mOp.call();
				let dslCodeComment = DslCodeToComment[emitted[0]];
				if (dslCodeComment) {
					const comment = comments.formatComment(index, dslCodeComment);
					const [head, ... tail] = emitted;
					codes.push(`${head} # ${comment}`);
					codes = codes.concat(tail);
				}
				else {
					codes.push(... emitted);
				}
			});

			return codes.join('\n');
		}
		else {
			// errors.forEach(error => console.error(error.message));
			throw new DSLAggregateError(errors);
		}
	};

}

/**
 * Makes an object that keeps track of comments
 */
function makeCommentTracker() {

	interface comment {
		label: string;
		instruction: string;
	}

	const commentIndex: SMap<comment> = {};

	function setLabelComment(index: number, label: string) {
		if (commentIndex[index]) {
			commentIndex[index].label = label;
		}
		else {
			commentIndex[index] = {
				label,
				instruction: '',
			};
		}
	}
	function setInstructionComment(index: number, inst: string) {
		if (commentIndex[index]) {
			commentIndex[index].instruction = inst;
		}
		else {
			commentIndex[index] = {
				label: '',
				instruction: inst,
			};
		}
	}
	function formatComment(index: number, dslCodeComment: string | undefined): string {
		const comment = commentIndex[index];
		if (!comment) return dslCodeComment || '';
		return [isNullOrWhitespace(comment.label) ? null : `@${comment.label}`, comment.instruction, dslCodeComment]
			.filter(x => !isNullOrWhitespace(x))
			.join(' -- ');
	}

	return {
		setLabelComment,
		setInstructionComment,
		formatComment,
	};
}

function doesLineStartNewGlobal(line: string): boolean {
	return line.startsWith('var');

}

function lineStartGlobalDeclaration(line: string): GlobalVariableDeclaration {
	const start = startGlobalDeclaration(line);
	return new GlobalVariableDeclaration(0, start.name, start.type, start.value);
}

function lineContinueGlobalDeclaration(line: string, dec: GlobalVariableDeclaration): GlobalVariableDeclaration {
	if (!Array.isArray(dec.value) || dec.typeName !== VariableType.Array)
		throw new DSLError(`Cannot continue on type ${dec.typeName} with value of type ${typeof dec.value}`);
	const value = continueGlobalDeclaration(line);
	dec.value = dec.value.concat(value);
	return dec;
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