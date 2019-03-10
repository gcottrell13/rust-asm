import { DslOpcodes as op } from './dslmachine';
import {
	OpcodeFactory,
	int,
	mode,
	getVariableParts,
	RestFnTo,
	AsmEmitter,
	machineOperation,
	DSLError,
	AsmToMachineCodes,
	OpcodeBoundWithData,
} from './dslaHelpers';
import { InitializeWindowBarrel } from '../windowBarrel';
import { isNullOrWhitespace } from '../stringUtils';
import _ from 'lodash';

// DSL-Assembly

export const DslaInstructionRegistration = {
	add: 'Add',
	addi: 'Add immediate',
	loadi: 'Load immediate',
	goto: 'Go to label',
	beq: 'Branch on equal',
	halt: 'Halt program',
};

//#region Helpers

const enforce = (...args: (string | undefined)[]) => {
	if (args.some(isNullOrWhitespace)) {
		throw new DSLError(`Args must contain valid text. Got '${args.map((x, i) => `[${i}]: ${x}`).join(', ')}'`);
	}
};

type get = (str: string) => OpcodeBoundWithData;
type label = (str: string) => () => number;

function GetValue(variable: string, v: RestFnTo<string, () => number>, l: RestFnTo<string, () => number>): OpcodeBoundWithData {
	const varParts = getVariableParts(variable);
	if (!varParts) {
		throw new DSLError(`Could not parse ${variable} to variable expression`);
	}

	const { variableOffset, constantOffset, name } = varParts;

	const [d] = v(name);

	if (constantOffset !== null) {
		// else this variable is a pointer, and add the constant as an offset
		return op.LoadWithConstantOffsetToBus.bind(d, () => constantOffset);
	}
	else if (variableOffset !== null) {
		const [offset] = v(variableOffset);
		return op.LoadWithVariableOffsetToBus.bind(d, offset);
	}
	else {
		// then we will use this variable directly
		return op.LoadValueAtAddressIntoBus.bind(d);
	}

}

function SaveValue(dest: string, v: RestFnTo<string, () => number>, l: RestFnTo<string, () => number>): OpcodeBoundWithData {
	const varParts = getVariableParts(dest);
	if (!varParts) {
		throw new DSLError(`Could not parse ${dest} to variable expression`);
	}

	const { variableOffset, constantOffset, name } = varParts;

	const [d] = v(name);

	if (constantOffset !== null) {
		// else this variable is a pointer, and add the constant as an offset
		return op.SaveFromBusWithConstantOffset.bind(d, () => constantOffset);
	}
	else if (variableOffset !== null) {
		const [offset] = v(variableOffset);
		return op.SaveFromBusWithVariableOffset.bind(d, offset);
	}
	else {
		// then we will use this variable directly
		return op.SaveValueInBusToLocation.bind(d);
	}
}

function GetLabel(label: string, l: RestFnTo<string, () => number>): () => number {
	const [_l] = l(label);
	return _l;
}

//#endregion
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------

type asmEmitterInternal = (
	/**
	 * the parameters that were supplied
	 */
	...parameters: string[]
) => OpcodeBoundWithData[];

type dsla = typeof DslaInstructionRegistration;
type dslaOpcodes = {
	[p in keyof dsla]: asmEmitterInternal;
};

const _opcodes = (Load: get, Save: get, Label: label): dslaOpcodes => ({
	add(_dest, _source1, _source2) {
		enforce(_dest, _source1, _source2);
		return [
			Load(_source1),
			op.AluPushFromBus.bind(),
			Load(_source2),
			op.AluDoAdd.bind(),
			op.AluHiToBus.bind(),
			Save(_dest),
		];
	},

	addi(_dest, _source, _imm) {
		enforce(_dest, _source, _imm);
		return [
			Load(_source),
			op.AluPushFromBus.bind(),
			op.LoadImmmediateToBus.bind(int(_imm)),
			op.AluDoAdd.bind(),
			op.AluHiToBus.bind(),
			Save(_dest),
		];
	},

	/**
	 * Load Immediate
	 */
	loadi(_dest, _imm) {
		enforce(_dest, _imm);
		return [
			op.LoadImmmediateToBus.bind(int(_imm)),
			Save(_dest),
		];
	},

	beq(_source1, _source2, _label) {
		return [
			Load(_source1),
			op.AluPushFromBus.bind(),
			Load(_source2),
			op.AluSetComparisonMode.bind(mode(0)),
			op.AluDoComparison.bind(),
			op.BranchTo.bind(Label(_label)),
		];
	},

	goto(_label) {
		return [
			op.LoadImmmediateToBus.bind(Label(_label)),
			op.JumpWithBusValueRelative.bind(),
		];
	},

	halt() {
		return [
			op.Halt.bind(),
		];
	},
});

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------

// returns emitted dsl
export const opcodes: OpcodeFactory = (v, l) => _.mapValues(
	_opcodes(
		(s: string) => GetValue(s, v, l),
		(s: string) => SaveValue(s, v, l),
		(s: string) => GetLabel(s, l)
	),
	(v, key) => (args: string[]) => ({
		operations: v(...args),
		generatingOperation: key + ' ' + args.join(' '),
	})
);

InitializeWindowBarrel('DSLA', {
	opcodes,
	enforce,
});