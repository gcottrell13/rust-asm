#![allow(non_snake_case, unused_imports)]

#[macro_use] 
extern crate lazy_static;

use std::env;
use std::fs::File;
use std::time::Duration;
use std::thread;
use std::io::{BufRead, BufReader};
use std::io::{self, Write};
use std::sync::Mutex;
use std::collections::{HashSet, HashMap};
use std::os::raw::{c_double, c_float, c_int};

enum StopCode {
	Pause,
	Halt,
	None,
}

enum ProcessorStatus {
	Paused,
	Halted,
	NotStarted,
	Running,
	Empty,
}

const MEM_SIZE: usize = 2048;

type storage = u32;
type location = u32;
type jsint = c_int;

extern "C" {
	fn js_syscall(code: jsint, argument: jsint) -> jsint;
}

#[no_mangle]
pub extern "C" fn r_SetBreakpoint(n: jsint) {
	SetBreakpoint(n as u32);
}

#[no_mangle]
pub extern "C" fn r_RemoveBreakpoint(n: jsint) {
	RemoveBreakpoint(n as u32);
}

#[no_mangle]
pub extern "C" fn r_Continue() {
	Continue();
}

#[no_mangle]
pub extern "C" fn r_StepOver() {
	StepOver();
}

#[no_mangle]
pub extern "C" fn r_Initialize() {
	let program = &mut MAIN_PROGRAM.lock().unwrap(); 
	program.Processor.add_region(MemoryBlock::new());
	program.Processor.status = ProcessorStatus::NotStarted;
}

#[no_mangle]
pub extern "C" fn r_GetInstructionPointer() -> jsint {
	let program = &mut MAIN_PROGRAM.lock().unwrap();
	return program.Processor.next as jsint;
}

#[no_mangle]
pub extern "C" fn r_GetProcessorStatus() -> jsint {
	let program = &mut MAIN_PROGRAM.lock().unwrap();
	return match program.Processor.status {
		ProcessorStatus::Paused => 0,
		ProcessorStatus::Halted => 1,
		ProcessorStatus::NotStarted => 2,
		ProcessorStatus::Running => 3,
		ProcessorStatus::Empty => 4,
	}
}

#[no_mangle]
pub extern "C" fn r_EnableBreakpoints() {
	let program = &mut MAIN_PROGRAM.lock().unwrap();
	program.DoBreakpoints = true;
}

#[no_mangle]
pub extern "C" fn r_DisableBreakpoints() {
	let program = &mut MAIN_PROGRAM.lock().unwrap();
	program.DoBreakpoints = false;
}

#[no_mangle]
pub extern "C" fn r_GetMemoryBlockSize() -> jsint {
	return MEM_SIZE as jsint;
}

#[no_mangle]
pub extern "C" fn r_GetWasmMemoryLocation(location: jsint) -> jsint {
	let program = &mut MAIN_PROGRAM.lock().unwrap();
	return program.Processor._get_pointer(location as u32);
}

lazy_static! {
	static ref MAIN_PROGRAM: Mutex<Program> = Mutex::new(Program::new());
}

fn run() {
	let program = &mut MAIN_PROGRAM.lock().unwrap();

	match program.Processor.status {
		ProcessorStatus::Halted => {},
		ProcessorStatus::Empty => {},
		_ => { // paused, not started, running
			program.Processor.status = ProcessorStatus::Running;
			while !step(program) {
			}
		},
	}
}

fn step(program: &mut Program) -> bool {

	if program.DoBreakpoints {
		if program.Breakpoints.contains(&program.Processor.next) {
			program.Processor.status = ProcessorStatus::Paused;
			return true;
		}
	} 

	let stopCode = program.Processor.step();

	match stopCode {
		StopCode::Halt => {
			return true;
		},
		StopCode::Pause => {
			return true;
		},
		StopCode::None => {
			// continue
		},
	}

	return false;
}

fn syscall(code: storage, arg: i32) -> i32 {
	unsafe {
		return js_syscall(code as jsint, arg);
	}
}

fn SetBreakpoint(point: u32) {
	let mut prog = MAIN_PROGRAM.lock().unwrap();
	if !prog.Breakpoints.contains(&point) {
		prog.Breakpoints.insert(point);
	}
}

fn RemoveBreakpoint(point: u32) {
	let mut prog = MAIN_PROGRAM.lock().unwrap();
	if prog.Breakpoints.contains(&point) {
		prog.Breakpoints.remove(&point);
	}
}

fn Continue() {
	run();
}

fn StepOver() {
	let program = &mut MAIN_PROGRAM.lock().unwrap();
	match program.Processor.status {
		ProcessorStatus::Paused => {
			step(program);
		},
		ProcessorStatus::NotStarted => {
			step(program);
			program.Processor.status = ProcessorStatus::Paused;
		}
		_ => {},
	}
}

struct Program {
	Processor: Processor,
	Breakpoints: HashSet<u32>,
	DoBreakpoints: bool,
}
impl Program {
	fn new() -> Program {
		let Processor = Processor::new();
		let Breakpoints = HashSet::new();
		let DoBreakpoints = false;
		Program {
			Processor,
			Breakpoints,
			DoBreakpoints,
		}
	}
}

struct Processor {
	bus: storage,
	alu: ALU,
	next: location,
	status: ProcessorStatus,
	regions: Vec<MemoryBlock>,

	perStepParamPointer: u32,
	perStepDontMove: bool,
}

impl Processor {
	fn new() -> Processor {
		let bus = 0;
		let alu = ALU::new();
		let next = 1;
		let status = ProcessorStatus::Empty;
		let mut regions: Vec<MemoryBlock> = Vec::new();
		regions.push(MemoryBlock::new());
		let perStepParamPointer = 0;
		let perStepDontMove = false;
		Processor {
			bus,
			alu,
			next,
			status,
			regions,
			perStepParamPointer,
			perStepDontMove,
		}
	}

	fn getParam(&mut self) -> storage {
		let n = self.next;
		let perStepParamPointer = self.perStepParamPointer + 1;
		let param: storage = self._get_memory_loc(n + perStepParamPointer);
		self.perStepParamPointer = perStepParamPointer;
		return param;
	}

	fn dontMoveParamPointer(&mut self) {
		self.perStepDontMove = true;
	}

	// returns whether or not a breakpoint was hit
	fn step(&mut self) -> StopCode {
		let n = self.next;
		let mut stopCode = StopCode::None;

        self.perStepParamPointer = 0;

		let op = self._get_memory_loc(n);

		// 'parameter' is always an unsigned integer, and is type 'storage'
		// 'as' means 'transmute the bytes to'
		// 'current' is the current instruction pointer

		// Opcodes:
		//	0	NO-OP

		//	1	memory[parameter] -> bus
		//	2	bus -> memory[parameter]

		//	3	memory[current + parameter as int] -> bus
		//	4	bus -> memory[current + parameter as int]

        //  5   memory[bus] -> bus
        //  X 6   bus -> memory[bus]

        //  7   memory[current + bus as int] -> bus
        //  X 8   bus -> memory[current + bus as int]

		//	9	ALU.add
		//		result -> ALU.hi

		//	10	ALU.negate
		//		result -> ALU.hi

		//	11	ALU.multiply

		//	12	ALU.divide

		//	13	jump -> goto current + parameter as int
		//	14	jump bus > 0 -> goto current + parameter as int
		//	15	jump bus is 0 -> goto current + parameter as int

		//	16	ALU.hi -> bus
		//	17	ALU.lo -> bus

		//	18	ALU to int mode
		//	19	ALU to float mode

		//	20	new block, beginning address -> bus
		//	21	syscall with parameter as code and bus as argument
		//	22	halt
		//	23	pause

		//	24	parameter -> bus

        //  25  bus -> push onto ALU

		match op {
			0 => {},
            1 => {
                let param = self.getParam();
				self.load_location(param);
            },
			2 => {
				let param = self.getParam();
				self.set_location(param);
			},
			3 => {
				let param = self.getParam();
				self.load_location_relative(param);
			},
			4 => {
				let param = self.getParam();
				self.set_location_relative(param);
			},
			5 => {
				self.load_location_with_bus();
			},
			7 => {
				self.load_location_relative_with_bus();
			},
			9 => {
				self.add();
			},
			10 => {
				self.negate();
			},
			11 => {
				self.multiply();
			},
			12 => {
				self.divide();
			},
			13 => {
				self.jump();
				self.dontMoveParamPointer();
			},
			14 => {
				let param = self.getParam();
				match self.bgz(param) {
					0 => self.dontMoveParamPointer(),
					_ => {},
				}
			},
			15 => {
				let param = self.getParam();
				match self.bez(param) {
					0 => self.dontMoveParamPointer(),
					_ => {},
				}
			},
			16 => {
				self.get_hi();
			},
			17 => {
				self.get_lo();
			},
			18 => {
				self.alu_to_int();
			},
			19 => {
				self.alu_to_float();
			},
			20 => {
				let newblock = MemoryBlock::new();
				self.add_region(newblock);
			},
			21 => {
				let param = self.getParam();
				// syscall
				self.syscall(param);
			},
			22 => {
				stopCode = StopCode::Halt;
				self.status = ProcessorStatus::Halted;
			},
			23 => {
				stopCode = StopCode::Pause;
				self.status = ProcessorStatus::Paused;
			},
			24 => {
				let param = self.getParam();
				self.load_immediate(param);
			},
			25 => {
				self.push_to_alu();
			},
			_ => {
				stopCode = StopCode::Halt;
				self.status = ProcessorStatus::Halted;
			},
		};

		if !self.perStepDontMove {
			// perStepParamPointer represents how many parameters were used
			// by the operation, so we want to move perStepParamPointer + 1
			self.next += self.perStepParamPointer + 1;
		}
        else {
            self.perStepDontMove = false;
        }

		return stopCode;
	}

	// opcode 1
	// fn load_location_(&mut self, _offset: storage) {
	// 	let offset = bits_to_i32(_offset);
	// 	let next = self.next;
	// 	let value = self._r_get_memory(next, offset);
	// 	self.bus = value;
	// }

	// opcode 2
	// fn set_location_relative_pointer(&mut self, _offset: storage) {
	// 	let offset = bits_to_i32(_offset);
	// 	let next = self.next;
	// 	let value = self.bus;
	// 	self._r_set_memory(next, offset, value);
	// }

	// opcode 3
	fn load_location_relative(&mut self, _offset: storage) {
		let offset = bits_to_i32(_offset);
		let next = self.next;
		self.bus = self._get_memory_loc((offset + next as i32) as location);
	}

	// opcode 3
	fn load_location_relative_with_bus(&mut self) {
		let offset = bits_to_i32(self.bus);
		let next = self.next;
		self.bus = self._get_memory_loc((offset + next as i32) as location);
	}

	// opcode 4
	fn set_location_relative(&mut self, _offset: storage) {
		let offset = bits_to_i32(_offset);
		let value = self.bus;
		let next = self.next;
		self._set_memory_loc((offset + next as i32) as u32, value);
	}

	// opcode 5
	fn push_to_alu(&mut self) {
		self.alu.push_value(bits_to_i32(self.bus));
	}

	// opcode 6
	// call add on the ALU and put the result on the bus
	fn add(&mut self) {
		self.alu.add();
	}

	// opcode 7
	fn negate(&mut self) {
		self.alu.negate();
	}

	// opcode 8
	fn multiply(&mut self) {
		self.alu.multiply();
	}

	// opcode 9
	fn divide(&mut self) {
		// self.alu.invert();
		self.alu.divide();
	}

	// opcode 10
	fn jump(&mut self) {
		let relative = bits_to_i32(self.bus);
		self.next = ((self.next as i32) + relative) as u32;
	}

	// opcode 11
	fn bgz(&mut self, relative: storage) -> u32 {
		self.alu.cmp();
		if self.alu.compare_result > 0
		{
			self.next = ((self.next as i32) + bits_to_i32(relative)) as u32;
			0
		}
		else {
			2
		}
	}

	// opcode 12
	// fn blz(&mut self, relative: storage) -> u32 {
	// 	self.alu.cmp();
	// 	if self.alu.compare_result < 0
	// 	{
	// 		self.next = ((self.next as i32) + bits_to_i32(relative)) as u32;
	// 		0
	// 	}
	// 	else {
	// 		2
	// 	}
	// }

	// opcode 13
	fn bez(&mut self, relative: storage) -> u32 {
		self.alu.cmp();
		if self.alu.compare_result == 0
		{
			self.next = ((self.next as i32) + bits_to_i32(relative)) as u32;
			0
		}
		else {
			2
		}
	}

	// opcode 14
	// add a memory region to the processor
	// takes ownership of the region
	fn add_region(&mut self, region: MemoryBlock) {
		self.regions.push(region);
	}

	// opcode 15
	fn syscall(&mut self, param: storage) {
		let code = self.bus;
		self.bus = i32_to_bits(syscall(code, bits_to_i32(param)));
	}

	// opcode 1
	fn load_location(&mut self, location: location) {
		self.bus = self._get_memory_loc(location);
	}

	// opcode 2
	fn set_location(&mut self, location: location) {
		let value = self.bus;
		self._set_memory_loc(location, value);
	}

	fn load_location_with_bus(&mut self) {
		let location = self.bus;
		self.load_location(location);
	}

	// opcode 20
	fn load_immediate(&mut self, value: storage) {
		self.bus = value;
	}

	// opcode 21
	fn alu_to_float(&mut self) {
		self.alu.mode_float_save_bits();
	}

	// opcode 22
	fn alu_to_int(&mut self) {
		self.alu.mode_int_save_bits();
	}

	fn get_lo(&mut self) {
		self.bus = self.alu.lo;
	}

	fn get_hi(&mut self) {
		self.bus = self.alu.hi;
	}

	// fn print(&mut self, location: u32) {
	//	let mut l = location;
	//	let mut sanity = 0;
	//	while sanity < MEM_SIZE {
	//		let value = self._get_memory_loc(l);
	//		if value == 0 
	//		{
	//			break;
	//		}
	//		else 
	//		{
	//			io::stdout().write(&[value as u8]).unwrap();
	//		}
	//		l += 1;
	//		sanity += 1;
	//	} 
	//	io::stdout().flush().unwrap();
	// }

	// fn print_pointer_relative(&mut self) {
	//	let l = self.bus as u32;
	//	self.print(l);
	// }

	// fn print_pointer_number_relative(&mut self) {
	//	let offset = self.bus as i32;
	//	let next = self.next;
	//	println!("{}", self._get_memory_loc((offset + next as i32) as u32));
	// }

	// fn open_file(&mut self, pointer_location: u32) {
	//	let filename = self._read_location_as_string();
	//	let contents = open_file(filename.clone());
	//	if contents[0] == 1 {
	//		// create new memory blocks
	//		let blocks_needed = (contents[2] as f64 / MEM_SIZE as f64).ceil() as i32;
	//		let mut i = 0;
	//		let bytes_loaded = contents[1];
	//		let mut bytes_transferred = 0;
	//		let mut content_index = 0;
	//		let mut memory_index = 0;
	//		let file_pointer = self.regions.len() * MEM_SIZE;
	//		while i < blocks_needed {
	//			let mut mem: MemoryBlock = MemoryBlock::new();
	//			i += 1;

	//			while bytes_transferred < bytes_loaded + 3 && memory_index < MEM_SIZE {
	//				mem.set_value(memory_index, contents[content_index]);
	//				memory_index += 1;
	//				content_index += 1;
	//				bytes_transferred += 1;
	//			}
	//			memory_index = 0;

	//			self.add_region(mem);
	//		}

	//		// println!("loaded {} bytes from `{}` into location {} with {} blocks created.", bytes_transferred, filename, pointer_location, blocks_needed);
	//		self._set_memory_loc(pointer_location, file_pointer as i32);
	//	}
	//	else {
	//		panic!("Could not find file: `{}`", filename);
	//	}
	// }

	// fn dump (&mut self) {
	//	let mut nulls_encountered = 0;
	//	for i in 0 .. (MEM_SIZE * self.regions.len()) {
	//		let byte = self._get_memory_loc(i as u32);
	//		if byte == 0 {
	//			nulls_encountered += 1;
	//		}
	//		else {
	//			nulls_encountered = 0;
	//		}

	//		if nulls_encountered < 2 {
	//			println!("{}: {} | {}", i, byte, byte as u8 as char);
	//		}
	//		else if nulls_encountered == 2 {
	//			println!("...");
	//		}
	//	}
	// }

	fn _r_get_memory(&mut self, location: location, offset: i32) -> storage {
		let newLocation = (location as i32 + offset) as u32;
		return self._get_memory_loc(newLocation);
	}

	fn _r_set_memory(&mut self, location: location, offset: i32, value: storage) {
		let newLocation = (location as i32 + offset) as u32;
		self._set_memory_loc(newLocation, value);
	}

	// helper
	fn _get_memory_loc(&self, location: location) -> storage {
		let offset = location as usize % MEM_SIZE;
		let region_num = (location as f64 / MEM_SIZE as f64).floor() as usize;

		if region_num < self.regions.len() {
			return self.regions[region_num].memory[offset];
		}

		return 0;
	}

	// helper
	fn _set_memory_loc(&mut self, location: location, value: storage) {
		let offset = location as usize % MEM_SIZE;
		let region_num = (location as f64 / MEM_SIZE as f64).floor() as usize;

		self.regions[region_num].memory[offset] = value;
	}

	// used only for JS to get memory from wasm
	fn _get_pointer(&self, location: location) -> i32 {
		let offset = location as usize % MEM_SIZE;
		let region_num = (location as f64 / MEM_SIZE as f64).floor() as usize;

		if region_num < self.regions.len() {
			let a = &self.regions[region_num].memory[offset] as *const storage;
			return a as i32;
		}

		return 0;
	}
}

enum ALUMode {
	int,
	float
}

struct ALU {
	value_a_int: i32, // recent value
	value_b_int: i32, // oldest value
	value_a_float: f32,
	value_b_float: f32,

	compare_result: i32,
	hi: u32,
	lo: u32,
	mode: ALUMode,
}
impl ALU {
	fn new() -> ALU {
		ALU {
			value_a_int: 0,
			value_b_int: 0,
			value_a_float: 0.0,
			value_b_float: 0.0,

			compare_result: 0,
			hi: 0,
			lo: 0,
			mode: ALUMode::int,
		}
	}

	fn mode_int_save_value(&mut self) {
		self.mode = ALUMode::int;

		self.value_a_int = self.value_a_float as i32;
		self.value_b_int = self.value_b_float as i32;
	}

	fn mode_float_save_value(&mut self) {
		self.mode = ALUMode::float;

		self.value_a_float = self.value_a_int as f32;
		self.value_b_float = self.value_b_int as f32;
	}

	fn mode_int_save_bits(&mut self) {
		self.mode = ALUMode::int;

		self.value_a_int = bits_to_i32(self.value_a_float.to_bits());
		self.value_b_int = bits_to_i32(self.value_b_float.to_bits());
	}

	fn mode_float_save_bits(&mut self) {
		self.mode = ALUMode::float;

		self.value_a_float = f32::from_bits(i32_to_bits(self.value_a_int));
		self.value_b_float = f32::from_bits(i32_to_bits(self.value_b_int));
	}

	fn push_value(&mut self, value: i32) {
		match self.mode {
			ALUMode::int => self.push_int(value),
			ALUMode::float => self.push_float(value),
		}
	}

	fn add(&mut self) {
		match self.mode {
			ALUMode::int => self.add_int(),
			ALUMode::float => self.add_float(),
		}
	}

	fn negate(&mut self) {
		match self.mode {
			ALUMode::int => self.negate_int(),
			ALUMode::float => self.negate_float(),
		}
	}

	fn multiply(&mut self) {
		match self.mode {
			ALUMode::int => self.multiply_int(),
			ALUMode::float => self.multiply_float(),
		}
	}

	fn divide(&mut self) {
		match self.mode {
			ALUMode::int => self.divide_int(),
			ALUMode::float => self.divide_float(),
		}
	}

	fn cmp(&mut self) {
		match self.mode {
			ALUMode::int => self.cmp_int(),
			ALUMode::float => self.cmp_float(),
		}
	}


	fn push_int(&mut self, value: i32) {
		self.value_b_int = self.value_a_int;
		self.value_a_int = value;
	}

	fn push_float(&mut self, value: i32) {
		self.value_b_float = self.value_a_float;
		self.value_a_float = f32::from_bits(i32_to_bits(value));
	}


	fn add_int(&mut self) {
		self.hi = (self.value_a_int + self.value_b_int) as u32;
		self.lo = 0;
	}

	fn add_float(&mut self) {
		self.hi = (self.value_a_float + self.value_b_float).to_bits();
		self.lo = 0;
	}

	fn negate_int(&mut self) {
	}

	fn negate_float(&mut self) {
		// self.hi = -self.value_a;
		// self.lo = 0;
	}

	fn multiply_int(&mut self) {
		let bits = i64_to_bits(
			self.value_a_int as i64 * self.value_b_int as i64
		);

		let loMask = 0x00000000ffffffff;
		let hiMask = 0xffffffff00000000;
		
		self.hi = (hiMask & bits) as u32;
		self.lo = (loMask & bits) as u32;
	}

	fn multiply_float(&mut self) {
		let value: f64 = (self.value_a_float * self.value_b_float).into();
		let bits = value.to_bits();

		let loMask = 0x00000000ffffffff;
		let hiMask = 0xffffffff00000000;

		self.hi = ((hiMask & bits) >> 32) as u32;
		self.lo = (loMask & bits) as u32;
	}

	fn divide_int(&mut self) {
		self.hi = i32_to_bits(self.value_a_int / self.value_b_int);
		self.lo = 0;
	}

	fn divide_float(&mut self) {
		let value: f64 = (self.value_a_float / self.value_b_float).into();
		let bits = value.to_bits();

		let loMask = 0x00000000ffffffff;
		let hiMask = 0xffffffff00000000;

		self.hi = ((hiMask & bits) >> 32) as u32;
		self.lo = (loMask & bits) as u32;
	}

	fn cmp_int(&mut self) {

	}

	fn cmp_float(&mut self) {

	}

}

struct MemoryBlock {
	memory: [storage; MEM_SIZE],
}
impl MemoryBlock {
	fn new() -> MemoryBlock {
		let memory = [0; MEM_SIZE];
		MemoryBlock {
			memory,
		}
	}

	// fn set_value(&mut self, location: usize, value: i32) {
	//	self.memory[location] = value;
	// }
}

fn i32_to_bits(v: i32) -> u32 {
	unsafe {
		return std::mem::transmute(v);
	}
}

fn bits_to_i32(v: u32) -> i32 {
	unsafe {
		return std::mem::transmute(v);
	}
}

fn i64_to_bits(v: i64) -> u64 {
	unsafe {
		return std::mem::transmute(v);
	}
}

fn bits_to_i64(v: u64) -> i64 {
	unsafe {
		return std::mem::transmute(v);
	}
}