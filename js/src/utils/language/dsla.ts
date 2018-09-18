// DSL-Assembly

/**
 * All variables are pointers to a value in the heap.
 * initialize variables with 'let' or 'const':
 *  const a = 5;  this would declare a variable 'a' as a constant value 5. 
 *  let b = 'hello';    this would declare 'b' as a mutable pointer to the character array 'hello'. Somewhat equivalent to 'let b = 72;' 
 *  let c = move x;
 *  const d = move c;
 * 
 * All operations done on variables are done on the dereferenced value.
 * There will be special operators for pointer manipulation, usable on all variable types, must be in an 'unsafe' context
 * Const variables cannot change the value.
 * 
 * 
 * No loops, if
 * No compound expressions
 * 
 * Operations
 * x = add b c;
 *  Fails if x is not declared.
 *  Fails if x is const.
 *  Adds the numeric values at b and c and stores the result in x. 
 * 
 * subtract
 * multiply
 * divide
 * modulus
 * 
 * 
 * jlz x labelName;
 *  Fails if x is not declared.
 *  if x < 0 then go to labelName
 * jgz, jez, jump
 * 
 * x = move z;
 *  Fails if x is not declared.
 *  Fails if x is const.
 *  Basically a 'move' operation, copies value at z into x.
 *  The 'move' word must be used to copy variables.
 *  This copies ONLY the value at the pointer's address. Strings must be copied character by character.
 * 
 */



export const opcodes = {
    /**
     * Load Immediate
     */
    loadi() {

    },



};