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

interface Matching<T> {
    Just?: (value: T) => void, 
    None?: () => void,
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
     * Provides a default value if none
     * @param fn 
     */
    def(fn: () => T): Maybe<T>;

    /**
     * Gets the given property, if it exists.
     * @param propName the property to get
     */
    prop<O extends keyof T>(propName: O): Maybe<T[O]>;
    
    /**
     * 
     * @param m 
     */
    match(m: Matching<T>): Maybe<T>;

    /**
     * Returns a value if it matches.
     * @param fn fn
     */
    filter(fn: FilterFunction<T>): Maybe<T>;
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

    match(m: Matching<T>): Maybe<T> {
        if (m.None) {
            m.None();
        }
        return this;
    }
    
    def(fn: () => T): Maybe<T> {
        return Maybe(fn());
    }

    prop<O extends keyof T>(propName: O): Maybe<T[O]> {
        return new None<T[O]>();
    }
    
    filter(fn: FilterFunction<T>): Maybe<T> {
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

    match(m: Matching<T>): Maybe<T> {
        if (m.Just) {
            m.Just(this.$value);
        }

        return this;
    }
    
    def(fn: () => T): Maybe<T> {
        return this;
    }

    prop<O extends keyof T>(propName: O): Maybe<T[O]> {
        return new Just(this.$value[propName]);
    }
    
    filter(fn: FilterFunction<T>): Maybe<T> {
        return fn(this.$value) ? this : new None<T>();
    }
}

export function Maybe<T>(value: Optional<T>): Maybe<T> {
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

export function compose<X, Y, Z>(fn1: (x: X) => Y, fn2: (y: Y) => Z): ((x: X) => Z) {
    return (x: X) => fn2(fn1(x));
}

/**
 * Used to un-nest nested Maybe's.
 * @example 
 * let m: Maybe<Maybe<number>>;
 * let innerMaybe: Maybe<number> = m.map(collapse);
 * @param m maybe
 */
export function collapse<T>(m: Maybe<T>): Optional<T> {
    return m.value();
}