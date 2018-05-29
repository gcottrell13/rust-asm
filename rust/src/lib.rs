#![allow(non_snake_case, unused_imports)]
#![feature(repr_transparent)]

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

extern "C" {
    fn js_setMemoryLocation(location: c_int, value: c_int);
    fn js_syscall(code: c_int, argument: c_int) -> c_int;
}

#[no_mangle]
pub extern "C" fn r_SetBreakpoint(n: u64) {
    SetBreakpoint(n);
}

#[no_mangle]
pub extern "C" fn r_RemoveBreakpoint(n: u64) {
    RemoveBreakpoint(n);
}

#[no_mangle]
pub extern "C" fn r_Continue() {
    Continue();
}

#[no_mangle]
pub extern "C" fn r_SetMemoryLocation(location: u64, value: i64) {
    SetMemoryLocation(location, value);
}

#[no_mangle]
pub extern "C" fn r_GetMemoryLocation(location: u64) -> c_int {
    return GetMemoryLocation(location);
}

#[no_mangle]
pub extern "C" fn r_StepOver() {
    StepOver();
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
pub extern "C" fn r_Initialize(jsString: JsInteropString) {
    let mut lines: Vec<&str> = Vec::new();

    unsafe {
        let text = jsString.as_string();
        let split = text.split("\n");

        for line in split {
            lines.push(line);
        }
    }

    ParseInputProgram(lines);
}

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
const MAX_FILE_BLOCKS: usize = 2;

lazy_static! {
    static ref MAIN_PROGRAM: Mutex<Program> = Mutex::new(Program::new());
}

fn ParseInputProgram(lines: Vec<&str>) {
    let zero: u8 = 48; // ascii 0
    let nine: u8 = 57; // ascii 9

    let processor = &mut MAIN_PROGRAM.lock().unwrap()
            .Processor;

    // parse out the source file
    let mut location: usize = 1;
    for line in lines {
        // we can't read in any more lines
        if location >= MEM_SIZE {
            // panic!("Cannot read any more lines, reached max of {}", MEM_SIZE);
            break;
        }

        let mut number: u64 = 0;
        let mut sign = 1;
        for c in line.chars() {
            let byte = c as u8;
            if byte >= zero && byte <= nine { 
                // only read in numbers
                number = number * 10 + (byte - zero) as u64;
            }
            else if byte == 45 {
                sign = -1;
            }
            else {
                break;
            }
        }
        processor._set_memory_loc(location as u64, (number as i64) * sign);
        jsSetMemoryLocation(location as i32, (number as i32) * sign as i32);
        location += 1;
    }

    //
    processor.add_region(MemoryBlock::new());

    processor.status = ProcessorStatus::NotStarted;
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

fn syscall(code: i64, arg: i64) -> i32 {
    unsafe {
        return js_syscall(code as i32, arg as i32);
    }
}

fn jsSetMemoryLocation(location: c_int, value: c_int) {
    unsafe {
        js_setMemoryLocation(location, value);
    }
}

fn SetBreakpoint(point: u64) {
    let mut prog = MAIN_PROGRAM.lock().unwrap();
    if !prog.Breakpoints.contains(&point) {
        prog.Breakpoints.insert(point);
    }
}

fn RemoveBreakpoint(point: u64) {
    let mut prog = MAIN_PROGRAM.lock().unwrap();
    if prog.Breakpoints.contains(&point) {
        prog.Breakpoints.remove(&point);
    }
}

fn SetMemoryLocation(location: u64, value: i64) {
    let processor = &mut MAIN_PROGRAM.lock().unwrap()
        .Processor;
    processor._set_memory_loc(location, value);
    jsSetMemoryLocation(location as c_int, value as c_int);
}

fn GetMemoryLocation(location: u64) -> c_int {
    let processor = &mut MAIN_PROGRAM.lock().unwrap()
        .Processor;
    return processor._get_memory_loc(location) as c_int;
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
    Breakpoints: HashSet<u64>,
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
    bus: i64,
    alu: ALU,
    next: u64,
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
                self.load_location(param as u64);
                2
            },
            19 => {
                self.set_location(param as u64);
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
    fn load_location_relative_pointer(&mut self, pointer: i64) {
        let next = self.next;
        let value = self._r_get_memory(next, pointer);
        self.bus = value;
    }

    // opcode 2
    fn set_location_relative_pointer(&mut self, pointer: i64) {
        let next = self.next;
        let value = self.bus;
        self._r_set_memory(next, pointer, value);
    }

    // opcode 3
    fn load_location_relative(&mut self, offset: i64) {
        let next = self.next;
        self.bus = self._get_memory_loc((offset + next as i64) as u64);
    }

    // opcode 4
    fn set_location_relative(&mut self, offset: i64) {
        let value = self.bus;
        let next = self.next;
        self._set_memory_loc((offset + next as i64) as u64, value);
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
        self.next = ((self.next as i64) + relative) as u64;
    }

    // opcode 11
    fn bgz(&mut self, relative: i64) -> u64 {
        self.alu.cmp();
        if self.alu.compare_result > 0
        {
            self.next = ((self.next as i64) + relative) as u64;
            0
        }
        else {
            2
        }
    }

    // opcode 12
    fn blz(&mut self, relative: i64) -> u64 {
        self.alu.cmp();
        if self.alu.compare_result < 0
        {
            self.next = ((self.next as i64) + relative) as u64;
            0
        }
        else {
            2
        }
    }

    // opcode 13
    fn bez(&mut self, relative: i64) -> u64 {
        self.alu.cmp();
        if self.alu.compare_result == 0
        {
            self.next = ((self.next as i64) + relative) as u64;
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
    fn syscall(&mut self, param: i64) {
        let code = self.bus;
        self.bus = syscall(code, param) as i64;
    }

    // opcode 18
    fn load_location(&mut self, location: u64) {
        self.bus = self._get_memory_loc(location);
    }

    // opcode 10
    fn set_location(&mut self, location: u64) {
        let value = self.bus;
        self._set_memory_loc(location, value);
    }

    // opcode 20
    fn load_immediate(&mut self, value: i64) {
        self.bus = value;
    }

    // fn print(&mut self, location: u64) {
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
    //     let l = self.bus as u64;
    //     self.print(l);
    // }

    // fn print_pointer_number_relative(&mut self) {
    //     let offset = self.bus as i64;
    //     let next = self.next;
    //     println!("{}", self._get_memory_loc((offset + next as i64) as u64));
    // }

    // fn open_file(&mut self, pointer_location: u64) {
    //     let filename = self._read_location_as_string();
    //     let contents = open_file(filename.clone());
    //     if contents[0] == 1 {
    //         // create new memory blocks
    //         let blocks_needed = (contents[2] as f64 / MEM_SIZE as f64).ceil() as i64;
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
    //         self._set_memory_loc(pointer_location, file_pointer as i64);
    //     }
    //     else {
    //         panic!("Could not find file: `{}`", filename);
    //     }
    // }

    // fn dump (&mut self) {
    //     let mut nulls_encountered = 0;
    //     for i in 0 .. (MEM_SIZE * self.regions.len()) {
    //         let byte = self._get_memory_loc(i as u64);
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

    fn _read_location_as_string(&mut self) -> String {
        let mut string = String::from("");
        let mut byte: u8;
        let mut pointer = self.bus;
        loop {
            byte = self._get_memory_loc(pointer as u64) as u8;

            if byte != 0 {
                string.push(byte as char);
                pointer += 1;
            }
            else {
                break;
            }
        }
        string
    }

    fn _r_get_memory(&mut self, location: u64, offset: i64) -> i64 {
        let newLocation = (location as i64 + offset) as u64;
        return self._get_memory_loc(newLocation);
    }

    fn _r_set_memory(&mut self, location: u64, offset: i64, value: i64) {
        let newLocation = (location as i64 + offset) as u64;
        self._set_memory_loc(newLocation, value);
    }

    // helper
    fn _get_memory_loc(&mut self, location: u64) -> i64 {
        let offset = location as usize % MEM_SIZE;
        let region_num = (location as f64 / MEM_SIZE as f64).floor() as usize;

        self.regions[region_num].memory[offset]
    }

    // helper
    fn _set_memory_loc(&mut self, location: u64, value: i64) {
        let offset = location as usize % MEM_SIZE;
        let region_num = (location as f64 / MEM_SIZE as f64).floor() as usize;

        self.regions[region_num].memory[offset] = value;
    }
}

struct ALU {
    value_a: i64, // recent value
    value_b: i64, // oldest value
    compare_result: i64,
}
impl ALU {
    fn new() -> ALU {
        ALU {
            value_a: 0,
            value_b: 0,
            compare_result: 0,
        }
    }

    fn push_value(&mut self, value: i64) {
        self.value_b = self.value_a;
        self.value_a = value;
    }

    fn add(&mut self) -> i64 {
        let value = self.value_a + self.value_b;
        self.push_value(value);
        return value;
    }

    fn negate(&mut self) -> i64 {
        let value = -self.value_a;
        self.push_value(value);
        return value;
    }

    fn multiply(&mut self) -> i64 {
        let value = self.value_a * self.value_b;
        self.push_value(value);
        return value;
    }

    fn invert(&mut self) -> i64 {
        let value = 1 / self.value_a;
        self.push_value(value);
        return value;
    }

    fn cmp(&mut self) {
        self.compare_result = self.value_a;
    }
}

struct MemoryBlock {
    memory: [i64; MEM_SIZE],
}
impl MemoryBlock {
    fn new() -> MemoryBlock {
        let memory = [0; MEM_SIZE];
        MemoryBlock {
            memory,
        }
    }

    // fn set_value(&mut self, location: usize, value: i64) {
    //     self.memory[location] = value;
    // }
}

// Very important to use `transparent` to prevent ABI issues 
#[repr(transparent)]
pub struct JsInteropString(*mut String);

impl JsInteropString {
    // Unsafe because we create a string and say it's full of valid
    // UTF-8 data, but it isn't!
    unsafe fn with_capacity(cap: usize) -> Self {
        let mut d = Vec::with_capacity(cap);
        d.set_len(cap);
        let s = Box::new(String::from_utf8_unchecked(d));
        return JsInteropString(Box::into_raw(s));
    }

    unsafe fn as_string(&self) -> &String {
        return &*self.0;
    }

    unsafe fn as_mut_string(&mut self) -> &mut String {
        return &mut *self.0;
    }

    // unsafe fn into_boxed_string(self) -> Box<String> {
    //     return Box::from_raw(self.0);
    // }

    unsafe fn as_mut_ptr(&mut self) -> *mut u8 {
        return self.as_mut_string().as_mut_vec().as_mut_ptr();
    }
}

#[no_mangle]
pub unsafe extern "C" fn stringPrepare(cap: usize) -> JsInteropString {
    return JsInteropString::with_capacity(cap);
}

#[no_mangle]
pub unsafe extern "C" fn stringData(mut s: JsInteropString) -> *mut u8 {
    return s.as_mut_ptr();
}

#[no_mangle]
pub unsafe extern "C" fn stringLen(s: JsInteropString) -> usize {
    return s.as_string().len();
}


#[repr(transparent)]
pub struct JsInteropNumArray(Vec<c_int>);

impl JsInteropNumArray {
    unsafe fn with_capacity(cap: usize) -> Self {
        let mut d = Vec::with_capacity(cap);
        d.set_len(cap);
        return JsInteropNumArray(d);
    }

    unsafe fn as_mut_ptr(&mut self) -> *mut c_int {
        return &mut (self.0)[0];
    }
}

#[no_mangle]
pub unsafe extern "C" fn arrayPrepare(cap: usize) -> JsInteropNumArray {
    return JsInteropNumArray::with_capacity(cap);
}

#[no_mangle]
pub unsafe extern "C" fn arrayData(mut s: JsInteropNumArray) -> *mut c_int {
    return s.as_mut_ptr();
}


fn open_file(filename: String) -> Vec<i64> {
    let mut contents: Vec<i64> = Vec::new();
    let file_opened: i64 = 0;
    let mut file_size: i64 = 0;
    let mut bytes_loaded: i64 = 0;

    let max_size: usize = MAX_FILE_BLOCKS * MEM_SIZE;

    contents.push(file_opened); // [0]
    contents.push(file_size); // [1]
    contents.push(bytes_loaded); // [2]

    match File::open(&filename) {
        Ok(f) => {
            let mut quit = false;
            let file = BufReader::new(f);

            for line in file.lines() {
                let l: String = line.expect("failed line");
                for c in l.chars() {
                    let byte = c as i64;

                    contents.push(byte);
                    file_size += 1;
                    bytes_loaded += 1;

                    if bytes_loaded >= max_size as i64 {
                        quit = true;
                        break;
                    }
                }

                if quit {
                    break;
                }

                contents.push(10);
            }

            contents[0] = 1;
            contents[1] = file_size;
            contents[2] = bytes_loaded;
        },
        Err(m) => {
            println!("Could not open file: {:?}", m);
        }
    };
    
    return contents;
}