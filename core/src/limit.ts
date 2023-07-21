import type { IntegerSignness } from './parser'

type DeepReadonly<T> = T extends {}
    ? T extends null
        ? T
        : {
            readonly [K in keyof T]: DeepReadonly<T[K]>
        }
    : T

function makeDeepReadonly<T>(object: T): DeepReadonly<T> {
    return object as any
}

type MaxMin = {max: bigint, min: bigint}
function makeUnsignedMaxMin(bits: number): MaxMin {
    return {
        max: (BigInt(1) << BigInt(bits)) - BigInt(1),
        min: BigInt(0)
    }
}
function makeSignedMaxMin(bits: number): MaxMin {
    return {
        max: (BigInt(1) << BigInt(bits - 1)) - BigInt(1),
        min: BigInt(-1) << BigInt(bits - 1)
    }
}
type MaxMinPair = {
    [K in IntegerSignness]: MaxMin
}
function makeMaxMinPair(bits: number): MaxMinPair {
    return {
        'unsigned': makeUnsignedMaxMin(bits),
        'signed': makeSignedMaxMin(bits)
    }
}

export const LIMITS = makeDeepReadonly({
    'char': makeMaxMinPair(8),
    'int': {
        'short': makeMaxMinPair(16),
        'long': makeMaxMinPair(32),
        'long-long': makeMaxMinPair(64)
    }
})
