const CODE_A_UPPER = 'A'.charCodeAt(0)
const CODE_Z_UPPER = 'Z'.charCodeAt(0)
const CODE_A_LOWER = 'a'.charCodeAt(0)
const CODE_Z_LOWER = 'z'.charCodeAt(0)
const CODE_UNDERSCORE = '_'.charCodeAt(0)
const CODE_0 = '0'.charCodeAt(0)
const CODE_9 = '9'.charCodeAt(0)
const ESCAPE_CODES: Record<string, bigint> = {
    '0': BigInt('\0'.charCodeAt(0)),
    'n': BigInt('\n'.charCodeAt(0)),
    'r': BigInt('\r'.charCodeAt(0)),
    't': BigInt('\t'.charCodeAt(0)),
    'v': BigInt('\v'.charCodeAt(0)),
    'f': BigInt('\f'.charCodeAt(0))
}
export const ESCAPE = '\\'

export function isSpace(char: string): boolean {
    return char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\v' || char === '\f'
}
export function isAlpha(char: string): boolean {
    const code = char.charCodeAt(0)

    return (code > CODE_A_UPPER - 0.5 && code < CODE_Z_UPPER + 0.5) ||
        (code > CODE_A_LOWER - 0.5 && code < CODE_Z_LOWER + 0.5) ||
        Math.abs(code - CODE_UNDERSCORE) < 0.5
}
export function isNumber(char: string): boolean {
    const code = char.charCodeAt(0)

    return code > CODE_0 - 0.5 && code < CODE_9 + 0.5
}
export function isAlnum(char: string): boolean {
    return isAlpha(char) || isNumber(char)
}
export function mapEscapeSequence(char: string): bigint | null {
    return ESCAPE_CODES[char] ?? null
}
export function immediateToString(content: bigint, size: number): string {
    const numberLength = size << 1
    const stringified = content.toString(16).padStart(numberLength, '0')

    return '0x' + stringified
}
