export interface SMap<T> {
    [p: string]: T
}
export interface NMap<T> {
    [p: number]: T
}

interface MapFunction<TIn, TOut> {
    (v: TIn): TOut;
}

interface FilterFunction<TIn> {
    (v: TIn): boolean;
}

type Optional<T> = T | null | undefined;

export interface Maybe<T> {
    /**
     * Gives either the value if Just<T> or null if None.
     */
    value(): T | null;

    /**
     * UNSAFE Gives the value. Use only if you know for sure that the value will exist.
     */
    unwrap(): T;

    /**
     * Returns whether or not there is a value.
     */
    hasValue(): boolean;

    /**
     * Applies the given function to the value, if it exists.
     * @param fn the mapping function
     */
    map<R>(fn: MapFunction<T, Optional<R>>): Maybe<R>;

    /**
     * Gets the given property, if it exists.
     * @param propName the property to get
     */
    prop<O extends keyof T>(propName: O): Maybe<T[O]>;

    /**
     * Returns a value if it matches.
     * @param fn fn
     */
    filter(fn: FilterFunction<T>): Maybe<T>;

    /**
     * 
     * @param hasValue 
     * @param empty 
     */
    match<R>(hasValue: (value: T) => Optional<R>, empty: () => Optional<R>): Maybe<R>;
    
    /**
     * 
     * @param fn 
     */
    on(fn: (value: T) => void): Maybe<T>;
}

export class None<T> implements Maybe<T> {
    value() {
        return null;
    }

    unwrap() {
        return null as any as T;
    }

    hasValue() {
        return false;
    }

    map<R>(mapFn: MapFunction<T, Optional<R>>) {
        return new None<R>();
    }

    prop<O extends keyof T>(propName: O): Maybe<T[O]> {
        return new None<T[O]>();
    }
    
    filter(fn: FilterFunction<T>): Maybe<T> {
        return this;
    }

    match<R>(hasValue: (value: T) => Optional<R>, empty: () => Optional<R>): Maybe<R> {
        return Maybe(empty());
    }
    
    on(fn: (value: T) => void): Maybe<T> {
        return this;
    }
}

export class Just<T> implements Maybe<T> {
    $value: T;
    constructor(v: T) {
        this.$value = v;
    }

    value() {
        return this.$value;
    }

    unwrap() {
        return this.$value;
    }

    hasValue() {
        return true;
    }

    map<R>(mapFn: MapFunction<T, Optional<R>>): Maybe<R> {
        let newValue = mapFn(this.$value);
        if (newValue === null || newValue === undefined) {
            return new None<R>();
        }
        return new Just<R>(newValue);
    }

    prop<O extends keyof T>(propName: O): Maybe<T[O]> {
        return new Just(this.$value[propName]);
    }
    
    filter(fn: FilterFunction<T>): Maybe<T> {
        return fn(this.$value) ? this : new None<T>();
    }

    match<R>(hasValue: (value: T) => Optional<R>, empty: () => Optional<R>): Maybe<R> {
        return Maybe(hasValue(this.$value));
    }

    on(fn: (value: T) => void): Maybe<T> {
        fn(this.$value);
        return this;
    }
}

export function Maybe<T>(value?: T | null | undefined): Maybe<T> {
    if (value === null || value === undefined) {
        return new None<T>();
    }
    return new Just(value);
}

export function prop<T, O extends keyof T>(obj: T, propName: O): Maybe<T[O]> {
    let v = obj[propName];
    if (v !== undefined) {
        return new Just(v);
    }
    return new None<T[O]>();
}

// curry :: ((a, b, ...) -> c) -> a -> b -> ... -> c
const curry = (fn: Function) => {
    const arity = fn.length;

    return function $curry(...args: any[]) {
        if (args.length < arity) {
            return $curry.bind(null, ...args);
        }

        return fn.call(null, ...args);
    };
};

export const map = curry(<T, OUT>(f: MapFunction<T, OUT>, xs: Maybe<T>) => xs.map(f));