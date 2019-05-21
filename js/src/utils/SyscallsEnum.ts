export enum SyscallsEnum {
	/**
	 * init new buffer with ID from bus (so JS can reference buffer with given ID)
	 * [follow with syscall 2, syscall 3, and 6]
	 * IDs are shared between inputs and outputs
	 */
	CreateBuffer = 1,

	SetBufferHead = 2,
	SetBufferLength = 3,
	SetBufferType = 4,

	DeleteBuffer = 5,

	/**
	 * File stuff
	 */


	/**
	 * Other
	 */
	Sleep = 20,

	Alert = 30,
}
