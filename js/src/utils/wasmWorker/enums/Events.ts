export enum Events {
    /**
     * When the program text is loaded
     */
    LOAD = "LOAD",

    /**
     * When the program is paused.
     */
    PAUSE = "PAUSE",

    /**
     * When the program is started for the first time.
     */
    START = "START",

    /**
     * When the program is halted.
     */
    HALT = "HALT",

    /**
     * When the program continues execution from a paused state.
     */
    CONTINUE = "CONTINUE",

    /**
     * When the processor encounters an unknown status.
     */
    UNKNOWN = "UNKNOWN",
}