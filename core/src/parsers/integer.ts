import type { IntegerSignness, ParserContext, Value, ValueTypeSize } from '../parser'
import { getIntSize } from '../utils/parser'

const INTEGER_PATTERN = /^(?:\+|-)?\d+(?<suffix>U?L{0,2})$/i
const ONE = BigInt(1)

export function parseInteger(context: ParserContext, input: string): Value {
    const match = INTEGER_PATTERN.exec(input)

    if (match === null) context.throw('bad-number')

    const suffix = (match.groups?.suffix ?? '').toUpperCase()
    const signness: IntegerSignness | null = suffix.startsWith('U') ? 'unsigned' : null
    const size: ValueTypeSize | null = suffix.endsWith('LL')
        ? 'long-long'
        : suffix.endsWith('L')
            ? 'long'
            : null
    const unparsedInteger = input.slice(0, input.length - suffix.length)
    let content = BigInt(unparsedInteger)
    const byteSize = getIntSize(size)
    const mask = (ONE << (BigInt(byteSize) << BigInt(3))) - ONE

    if (content < 0) content = (-content ^ mask) + ONE

    content = content & mask

    return {
        source: 'immediate',
        type: {
            baseType: 'int',
            signness,
            size,
            extensions: []
        },
        content
    }
}
export function validateInteger(input: string): boolean {
    return INTEGER_PATTERN.test(input)
}
