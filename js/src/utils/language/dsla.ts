import { DslOpcodes as op } from './dslmachine';
import { OpcodeFactory, int } from './dslaHelpers';
import { InitializeWindowBarrel } from '../windowBarrel';

// DSL-Assembly

// returns emitted dsl
export const opcodes: OpcodeFactory = (v, l) => ({
	add(_dest, _source1, _source2) {
		const [dest, source1, source2] = v(_dest, _source1, _source2);

		return [
			op.AddrToBus(source1),
			op.AluPushFromBus(),
			op.AddrToBus(source2),
			op.AluPushFromBus(),
			op.AluDoAdd(),
			op.AluHiToBus(),
			op.BusToAddr(dest),
		];
	},

	addi(_dest, _source, _imm) {
		const [dest, source] = v(_dest, _source);
		const imm = int(_imm);

		return [
			op.AddrToBus(source),
			op.AluPushFromBus(),
			op.ImmToBus(imm),
			op.AluPushFromBus(),
			op.AluDoAdd(),
			op.AluHiToBus(),
			op.BusToAddr(dest),
		];
	},

	/**
     * Load Immediate
     */
	loadi() {
		return [];
	},

});

InitializeWindowBarrel('DSLA', {
	opcodes,
});