import { DslOpcodes as op } from './dslmachine';
import * as _ from 'lodash';
import { OpcodeFactory, int, getVariableParts, RestFnTo, AsmEmitter } from './dslaHelpers';
import { InitializeWindowBarrel } from '../windowBarrel';
import { SMap } from '../utilTypes';
import { isArray } from 'util';

// DSL-Assembly

//#region Helpers
type get = (str: string) => (() => number[])[];

function GetValue(variable: string, v: RestFnTo<string, () => number>, l: RestFnTo<string, () => number>): (() => number[])[] {
	const [varParts] = getVariableParts(variable);

	if (varParts.hasConstant === false) {
		// then we will use this variable directly
		const [d] = v(varParts.name);
		return [
			op.LoadValueAtAddressIntoBus(d),
		];
	}

	// else this variable is a pointer, and add the constant as an offset
	const [d] = v(varParts.name);

	return [
		op.LoadValueAtAddressIntoBus(d),
		op.AluPushFromBus(),
		op.LoadImmmediateToBus(() => varParts.constant),
		op.AluDoAdd(),
		op.AluHiToBus(),
		op.LoadMemBusToBus(),
	];
}

function SaveValue(dest: string, v: RestFnTo<string, () => number>, l: RestFnTo<string, () => number>): (() => number[])[] {
	const [varParts] = getVariableParts(dest);
	if (varParts.hasConstant === false) {
		const [d] = v(varParts.name);
		return [
			op.SaveValueInBusToLocation(d),
		];
	}

	const [d] = v(varParts.name);

	return [
		op.LoadValueAtAddressIntoBus(d),
		op.AluPushFromBus(),
		op.LoadImmmediateToBus(() => varParts.constant),
		op.AluDoAdd(),
		op.AluHiToBus(),
		op.SaveBusToMemBus(),
	];
}
//#endregion
// ------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------

const _opcodes = (Load: get, Save: get): SMap<AsmEmitter> => ({
	add(_dest, _source1, _source2) {
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
	v => (...rest: any[]) => _.flatten(v(...rest))
);

InitializeWindowBarrel('DSLA', {
	opcodes,
});