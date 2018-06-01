export interface SMap<T> {
    [p: string]: T
}
export interface NMap<T> {
    [p: number]: T
}

interface MapFunction<TIn, TOut> {
    (v: TIn): TOut;
}

export interface Maybe<T> {
    /**
     * Gives either the value if Just<T> or null if None
     */
    value(): T | null;

    /**
     * UNSAFE Gives the value. Use only if you know for sure that the value will exist.
     */
    unwrap(): T;

    /**
     * Applies the given function to the value, if it exists
     * @param fn the mapping function
     */
    map<R>(fn: MapFunction<T, R | null>): Maybe<R>;

    /**
     * Gets the given property, if it exists
     * @param propName the property to get
     */
    prop<O extends keyof T>(propName: O): Maybe<T[O]>;
}

export class None<T> implements Maybe<T> {
    value() {
        return null;
    }
    unwrap() {
        return null as any as T;
    }

    map<R>(mapFn: MapFunction<T, R | null>) {
        return new None<R>();
    }
    prop<O extends keyof T>(propName: O): Maybe<T[O]> {
        return new None<T[O]>();
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

    map<R>(mapFn: MapFunction<T, R | null>): Maybe<R> {
        let newValue = mapFn(this.$value);
        if (newValue === null) {
            return new None<R>();
        }
        return new Just<R>(newValue);
    }
    prop<O extends keyof T>(propName: O): Maybe<T[O]> {
        return new Just(this.$value[propName]);
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