export enum Events {
    /**
     * When the program text is loaded
     */
    LOAD,

    /**
     * When the program is paused.
     */
    PAUSE,

    /**
     * When the program is started for the first time.
     */
    START,

    /**
     * When the program is halted.
     */
    HALT,

    /**
     * When the program continues execution from a paused state.
     */
    CONTINUE,
}