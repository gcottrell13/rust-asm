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

extern "C" {
    fn js_syscall(code: c_int, argument: c_int) -> c_int;
}

#[no_mangle]
pub extern "C" fn r_SetBreakpoint(n: c_int) {
    SetBreakpoint(n as u32);
}

#[no_mangle]
pub extern "C" fn r_RemoveBreakpoint(n: c_int) {
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
pub extern "C" fn r_GetInstructionPointer() -> c_int {
    let program = &mut MAIN_PROGRAM.lock().unwrap();
    return program.Processor.next as c_int;
}

#[no_mangle]
pub extern "C" fn r_GetProcessorStatus() -> c_int {
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
pub extern "C" fn r_GetMemoryBlockSize() -> c_int {
    return MEM_SIZE as c_int;
}

#[no_mangle]
pub extern "C" fn r_GetWasmMemoryLocation(location: c_int) -> c_int {
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
            let mut count = 0;
            while count < 1000 && !step(program) {
                count += 1;
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

fn syscall(code: i32, arg: i32) -> i32 {
    unsafe {
        return js_syscall(code, arg);
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

// fn GetMemoryByBlock(blockNum: u32) -> Vec<f32> {
//     let mem = MAIN_PROGRAM.lock().unwrap()
//             .Processor.regions[blockNum as usize].memory;
//     let mut y: Vec<f32> = Vec::new();
//     for item in mem.iter() {
//         y.push(*item as f32);
//     }
//     return y;
// }

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
    bus: i32,
    alu: ALU,
    next: u32,
    status: ProcessorStatus,
    regions: Vec<MemoryBlock>,
}

impl Processor {
    fn new() -> Processor {
        let bus = 0;
        let alu = ALU::new();
        let next = 1;
        let status = ProcessorStatus::Empty;
        let mut regions: Vec<MemoryBlock> = Vec::new();
        regions.push(MemoryBlock::new());
        Processor {
            bus,
            alu,
            next,
            status,
            regions,
        }
    }

    // returns whether or not a breakpoint was hit
    fn step(&mut self) -> StopCode {
        let n = self.next;
        let mut stopCode = StopCode::None;

        let op = self._get_memory_loc(n);
        let param = self._get_memory_loc(n+1);

        // Opcodes:
        // 0    NO-OP
        // 1    load memory location (param relative pointer to location) => bus
        //          points to an absolute address
        // 2    bus => set memory location (param relative pointer to location)
        //          points to an absolute address
        // 3    load relative memory (param offset) => bus
        // 4    bus => set relative memory (param offset)
        // 5    bus => alu
        // 6    add => bus and keep in alu
        // 7    negate => bus and keep in alu
        // 8    multiply => bus and keep in alu
        // 9    invert (1/x) => bus and keep in alu
        // 10   jump relative from bus
        // 11   bgz value from bus, jump relative (param offset)
        // 12   blz value from bus, jump relative (param offset)
        // 13   bez value from bus, jump relative (param offset)
        // 14   allocate new block, put address
        // 15   syscall (code from bus)
        // 16   halt
        // 17   pause (halts but also advances 1 step)
        // 18   load memory location (param location) => bus
        // 19   bus => set memory location (param location)
        // 20   load immediate to bus (param value)

        // syscalls:
        // 1 - init new buffer with ID from bus (so JS can reference buffer with given ID)
        //      [follow with syscall 2, syscall 3, and syscall 4 or 5]
        //      IDs are NOT shared between inputs and outputs
        // 2 - initialize newest buffer start (param address)
        // 3 - initialize newest buffer length (param length)
        // 4 - set buffer with ID from bus as input (JS puts key presses in all input buffers)
        // 5 - set buffer with ID from bus as output (JS will take output and apply to whatever it likes)
        // 6 - set newest output buffer type:
        //      1 - terminal output
        //      2 - drawing output
        //      3 - file output
        //      4 - set color palette (up to 256 * 3 [768] length)
        //      5 - changed memory locations
        // 7 - clear buffer with ID from bus (JS drops buffer)
        // 8 - reset buffer with ID from bus (moves JS buffer head back to start)
        // 9 - ready file with filename pointer (param address) 
        //      [follow with syscall 9]
        // 10 - load file contents into buffer with ID from bus (must be an input buffer)
        // 11 - sleep (param ms time)
        // 12 - flush buffer with ID from bus to JS (JS will not automatically refresh buffers)

        let advance = match op {
            0 => {
                1
            },
            1 => {
                self.load_location_relative_pointer(param);
                2
            },
            2 => {
                self.set_location_relative_pointer(param);
                2
            },
            3 => {
                self.load_location_relative(param);
                2
            },
            4 => {
                self.set_location_relative(param);
                2
            },
            5 => {
                self.push_to_alu();
                1
            },
            6 => {
                self.add();
                1
            },
            7 => {
                self.negate();
                1
            },
            8 => {
                self.multiply();
                1
            },
            9 => {
                self.invert();
                1
            },
            10 => {
                self.jump();
                0
            },
            11 => {
                self.bgz(param)
            },
            12 => {
                self.blz(param)
            },
            13 => {
                self.bez(param)
            },
            14 => {
                let newblock = MemoryBlock::new();
                self.add_region(newblock);
                1
            },
            15 => {
                // syscall
                self.syscall(param);
                2
            },
            16 => {
                stopCode = StopCode::Halt;
                self.status = ProcessorStatus::Halted;
                0
            },
            17 => {
                stopCode = StopCode::Pause;
                self.status = ProcessorStatus::Paused;
                1
            },
            18 => {
                self.load_location(param as u32);
                2
            },
            19 => {
                self.set_location(param as u32);
                2
            },
            20 => {
                self.load_immediate(param);
                2
            },
            _ => {
                stopCode = StopCode::Halt;
                self.status = ProcessorStatus::Halted;
                0
            },
        };

        self.next += advance;
        return stopCode;
    }

    // opcode 1
    fn load_location_relative_pointer(&mut self, pointer: i32) {
        let next = self.next;
        let value = self._r_get_memory(next, pointer);
        self.bus = value;
    }

    // opcode 2
    fn set_location_relative_pointer(&mut self, pointer: i32) {
        let next = self.next;
        let value = self.bus;
        self._r_set_memory(next, pointer, value);
    }

    // opcode 3
    fn load_location_relative(&mut self, offset: i32) {
        let next = self.next;
        self.bus = self._get_memory_loc((offset + next as i32) as u32);
    }

    // opcode 4
    fn set_location_relative(&mut self, offset: i32) {
        let value = self.bus;
        let next = self.next;
        self._set_memory_loc((offset + next as i32) as u32, value);
    }

    // opcode 5
    fn push_to_alu(&mut self) {
        self.alu.push_value(self.bus);
    }

    // opcode 6
    // call add on the ALU and put the result on the bus
    fn add(&mut self) {
        self.bus = self.alu.add();
    }

    // opcode 7
    fn negate(&mut self) {
        self.bus = self.alu.negate();
    }

    // opcode 8
    fn multiply(&mut self) {
        self.bus = self.alu.multiply();
    }

    // opcode 9
    fn invert(&mut self) {
        self.bus = self.alu.invert();
    }

    // opcode 10
    fn jump(&mut self) {
        let relative = self.bus;
        self.next = ((self.next as i32) + relative) as u32;
    }

    // opcode 11
    fn bgz(&mut self, relative: i32) -> u32 {
        self.alu.cmp();
        if self.alu.compare_result > 0
        {
            self.next = ((self.next as i32) + relative) as u32;
            0
        }
        else {
            2
        }
    }

    // opcode 12
    fn blz(&mut self, relative: i32) -> u32 {
        self.alu.cmp();
        if self.alu.compare_result < 0
        {
            self.next = ((self.next as i32) + relative) as u32;
            0
        }
        else {
            2
        }
    }

    // opcode 13
    fn bez(&mut self, relative: i32) -> u32 {
        self.alu.cmp();
        if self.alu.compare_result == 0
        {
            self.next = ((self.next as i32) + relative) as u32;
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
    fn syscall(&mut self, param: i32) {
        let code = self.bus;
        self.bus = syscall(code, param) as i32;
    }

    // opcode 18
    fn load_location(&mut self, location: u32) {
        self.bus = self._get_memory_loc(location);
    }

    // opcode 10
    fn set_location(&mut self, location: u32) {
        let value = self.bus;
        self._set_memory_loc(location, value);
    }

    // opcode 20
    fn load_immediate(&mut self, value: i32) {
        self.bus = value;
    }

    // fn print(&mut self, location: u32) {
    //     let mut l = location;
    //     let mut sanity = 0;
    //     while sanity < MEM_SIZE {
    //         let value = self._get_memory_loc(l);
    //         if value == 0 
    //         {
    //             break;
    //         }
    //         else 
    //         {
    //             io::stdout().write(&[value as u8]).unwrap();
    //         }
    //         l += 1;
    //         sanity += 1;
    //     } 
    //     io::stdout().flush().unwrap();
    // }

    // fn print_pointer_relative(&mut self) {
    //     let l = self.bus as u32;
    //     self.print(l);
    // }

    // fn print_pointer_number_relative(&mut self) {
    //     let offset = self.bus as i32;
    //     let next = self.next;
    //     println!("{}", self._get_memory_loc((offset + next as i32) as u32));
    // }

    // fn open_file(&mut self, pointer_location: u32) {
    //     let filename = self._read_location_as_string();
    //     let contents = open_file(filename.clone());
    //     if contents[0] == 1 {
    //         // create new memory blocks
    //         let blocks_needed = (contents[2] as f64 / MEM_SIZE as f64).ceil() as i32;
    //         let mut i = 0;
    //         let bytes_loaded = contents[1];
    //         let mut bytes_transferred = 0;
    //         let mut content_index = 0;
    //         let mut memory_index = 0;
    //         let file_pointer = self.regions.len() * MEM_SIZE;
    //         while i < blocks_needed {
    //             let mut mem: MemoryBlock = MemoryBlock::new();
    //             i += 1;

    //             while bytes_transferred < bytes_loaded + 3 && memory_index < MEM_SIZE {
    //                 mem.set_value(memory_index, contents[content_index]);
    //                 memory_index += 1;
    //                 content_index += 1;
    //                 bytes_transferred += 1;
    //             }
    //             memory_index = 0;

    //             self.add_region(mem);
    //         }

    //         // println!("loaded {} bytes from `{}` into location {} with {} blocks created.", bytes_transferred, filename, pointer_location, blocks_needed);
    //         self._set_memory_loc(pointer_location, file_pointer as i32);
    //     }
    //     else {
    //         panic!("Could not find file: `{}`", filename);
    //     }
    // }

    // fn dump (&mut self) {
    //     let mut nulls_encountered = 0;
    //     for i in 0 .. (MEM_SIZE * self.regions.len()) {
    //         let byte = self._get_memory_loc(i as u32);
    //         if byte == 0 {
    //             nulls_encountered += 1;
    //         }
    //         else {
    //             nulls_encountered = 0;
    //         }

    //         if nulls_encountered < 2 {
    //             println!("{}: {} | {}", i, byte, byte as u8 as char);
    //         }
    //         else if nulls_encountered == 2 {
    //             println!("...");
    //         }
    //     }
    // }

    fn _r_get_memory(&mut self, location: u32, offset: i32) -> i32 {
        let newLocation = (location as i32 + offset) as u32;
        return self._get_memory_loc(newLocation);
    }

    fn _r_set_memory(&mut self, location: u32, offset: i32, value: i32) {
        let newLocation = (location as i32 + offset) as u32;
        self._set_memory_loc(newLocation, value);
    }

    // helper
    fn _get_memory_loc(&mut self, location: u32) -> i32 {
        let offset = location as usize % MEM_SIZE;
        let region_num = (location as f64 / MEM_SIZE as f64).floor() as usize;

        if region_num < self.regions.len() {
            return self.regions[region_num].memory[offset];
        }

        return 0;
    }

    // helper
    fn _set_memory_loc(&mut self, location: u32, value: i32) {
        let offset = location as usize % MEM_SIZE;
        let region_num = (location as f64 / MEM_SIZE as f64).floor() as usize;

        self.regions[region_num].memory[offset] = value;
    }

    fn _get_pointer(&self, location: u32) -> i32 {
        let offset = location as usize % MEM_SIZE;
        let region_num = (location as f64 / MEM_SIZE as f64).floor() as usize;

        if region_num < self.regions.len() {
            let a = &self.regions[region_num].memory[offset] as *const i32;
            return a as i32;
        }

        return 0;
    }
}

struct ALU {
    value_a: i32, // recent value
    value_b: i32, // oldest value
    compare_result: i32,
}
impl ALU {
    fn new() -> ALU {
        ALU {
            value_a: 0,
            value_b: 0,
            compare_result: 0,
        }
    }

    fn push_value(&mut self, value: i32) {
        self.value_b = self.value_a;
        self.value_a = value;
    }

    fn add(&mut self) -> i32 {
        let value = self.value_a + self.value_b;
        self.push_value(value);
        return value;
    }

    fn negate(&mut self) -> i32 {
        let value = -self.value_a;
        self.push_value(value);
        return value;
    }

    fn multiply(&mut self) -> i32 {
        let value = self.value_a * self.value_b;
        self.push_value(value);
        return value;
    }

    fn invert(&mut self) -> i32 {
        let value = 1 / self.value_a;
        self.push_value(value);
        return value;
    }

    fn cmp(&mut self) {
        self.compare_result = self.value_a;
    }
}

struct MemoryBlock {
    memory: [i32; MEM_SIZE],
}
impl MemoryBlock {
    fn new() -> MemoryBlock {
        let memory = [0; MEM_SIZE];
        MemoryBlock {
            memory,
        }
    }

    // fn set_value(&mut self, location: usize, value: i32) {
    //     self.memory[location] = value;
    // }
}