import { DslOpcodes as op } from './dslmachine';
import { OpcodeFactory, int, getVariableParts, RestFnTo, AsmEmitter, machineOperation, DSLError, AsmToMachineCodes } from './dslaHelpers';
import { InitializeWindowBarrel } from '../windowBarrel';
import { isNullOrWhitespace } from '../stringUtils';
import _ from 'lodash';

// DSL-Assembly

export const DslaInstructionRegistration = {
	add: 'Add',
	addi: 'Add immediate',
	loadi: 'Load immediate',
};

//#region Helpers

const enforce = (...args: (string | undefined)[]) => {
	if (args.some(isNullOrWhitespace)) {
		throw new DSLError(`Args must contain valid text. Got '${args.map((x, i) => `[${i}]: ${x}`).join(', ')}'`);
	}
};

type get = (str: string) => machineOperation;

function GetValue(variable: string, v: RestFnTo<string, () => number>, l: RestFnTo<string, () => number>): machineOperation {
	const varParts = getVariableParts(variable);
	if (!varParts) {
		throw new DSLError(`Could not parse ${variable} to variable expression`);
	}

	const { variableOffset, constantOffset, name } = varParts;

	const [d] = v(name);

	if (constantOffset !== null) {
		// else this variable is a pointer, and add the constant as an offset
		return op.LoadWithConstantOffsetToBus(d, () => constantOffset);
	}
	else if (variableOffset !== null) {
		const [offset] = v(variableOffset);
		return op.LoadWithVariableOffsetToBus(d, offset);
	}
	else {
		// then we will use this variable directly
		return op.LoadValueAtAddressIntoBus(d);
	}

}

function SaveValue(dest: string, v: RestFnTo<string, () => number>, l: RestFnTo<string, () => number>): machineOperation {
	const varParts = getVariableParts(dest);
	if (!varParts) {
		throw new DSLError(`Could not parse ${dest} to variable expression`);
	}

	const { variableOffset, constantOffset, name } = varParts;

	const [d] = v(name);

	if (constantOffset !== null) {
		// else this variable is a pointer, and add the constant as an offset
		return op.SaveFromBusWithConstantOffset(d, () => constantOffset);
	}
	else if (variableOffset !== null) {
		const [offset] = v(variableOffset);
		return op.SaveFromBusWithVariableOffset(d, offset);
	}
	else {
		// then we will use this variable directly
		return op.SaveValueInBusToLocation(d);
	}
}

//#endregion
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------

type asmEmitterInternal = (
	/**
	 * the parameters that were supplied
	 */
	...parameters: string[]
) => machineOperation[];

type dsla = typeof DslaInstructionRegistration;
type dslaOpcodes = {
	[p in keyof dsla]: asmEmitterInternal;
};

const _opcodes = (Load: get, Save: get): dslaOpcodes => ({
	add(_dest, _source1, _source2) {
		enforce(_dest, _source1, _source2);
		return [
			Load(_source1),
			op.AluPushFromBus(),
			Load(_source2),
			op.AluPushFromBus(),
			op.AluDoAdd(),
			op.AluHiToBus(),
			Save(_dest),
		];
	},

	addi(_dest, _source, _imm) {
		enforce(_dest, _source, _imm);
		return [
			Load(_source),
			op.AluPushFromBus(),
			op.LoadImmmediateToBus(int(_imm)),
			op.AluPushFromBus(),
			op.AluDoAdd(),
			op.AluHiToBus(),
			Save(_dest),
		];
	},

	/**
	 * Load Immediate
	 */
	loadi() {
		return [];
	},

});

// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------

// returns emitted dsl
export const opcodes: OpcodeFactory = (v, l) => _.mapValues(
	_opcodes(
		(s: string) => GetValue(s, v, l),
		(s: string) => SaveValue(s, v, l)
	),
	v => (args: string[]) => ({
		operations: v(...args),
		generatingOperation: args.join(' '),
	})
);

InitializeWindowBarrel('DSLA', {
	opcodes,
	enforce,
});