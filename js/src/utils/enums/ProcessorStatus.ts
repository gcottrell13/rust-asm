
export enum ProcessorStatus {
    /**
     * The processor is paused and is not currently running.
     */
    Paused,

    /**
     * The processor is halted and cannot be restarted.
     */
    Halted,

    /**
     * The processor has not been started yet.
     */
    NotStarted,

    /**
     * The processor is running.
     */
    Running,

    /**
     * The processor does not have a program to run.
     */
    Empty,
}