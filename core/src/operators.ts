export type UnaryPrefixOperator = UnaryPostfixOperator | '+' | '-' | '!' | '~'
export type UnaryPostfixOperator = '++' | '--'
export type BinaryOperator =
    | '+' | '-' | '*' | '/' | '%'
    | '==' | '!=' | '>' | '<' | '>=' | '<=' | '&' | '|' | '^'
export type Operator =
    | 'upr-nop'
    | 'upr-neg'
    | 'upr-not'
    | 'upr-bnt'
    | 'upr-inc'
    | 'upr-dec'
    | 'upo-inc'
    | 'upo-dec'
    | 'bin-add'
    | 'bin-sub'
    | 'bin-mul'
    | 'bin-div'
    | 'bin-rem'
    | 'bin-equ'
    | 'bin-neq'
    | 'bin-grt'
    | 'bin-lst'
    | 'bin-gre'
    | 'bin-lse'
    | 'bin-ban'
    | 'bin-bor'
    | 'bin-bxr'

const UNARY_PREFIX_OPERATORS = new Map<UnaryPrefixOperator, Operator>([
    ['+', 'upr-nop'],
    ['-', 'upr-neg'],
    ['!', 'upr-not'],
    ['~', 'upr-bnt'],
    ['++', 'upr-inc'],
    ['--', 'upr-dec']
])
const UNARY_POSTFIX_OPERATORS = new Map<UnaryPostfixOperator, Operator>([
    ['++', 'upo-inc'],
    ['--', 'upo-dec']
])
const BINARY_OPERATORS = new Map<BinaryOperator, Operator>([
    ['+', 'bin-add'],
    ['-', 'bin-sub'],
    ['*', 'bin-mul'],
    ['/', 'bin-div'],
    ['%', 'bin-rem'],
    ['==', 'bin-equ'],
    ['!=', 'bin-neq'],
    ['>', 'bin-grt'],
    ['<', 'bin-lst'],
    ['>=', 'bin-gre'],
    ['<=', 'bin-lse'],
    ['&', 'bin-ban'],
    ['|', 'bin-bor'],
    ['^', 'bin-bxr']
])

export function isUnaryPrefixOperator(input: string): input is UnaryPrefixOperator {
    return UNARY_PREFIX_OPERATORS.has(input as UnaryPrefixOperator)
}
export function isUnaryPostfixOperator(input: string): input is UnaryPostfixOperator {
    return UNARY_POSTFIX_OPERATORS.has(input as UnaryPostfixOperator)
}
export function isBinaryOperator(input: string): input is BinaryOperator {
    return BINARY_OPERATORS.has(input as BinaryOperator)
}
export function mapUnaryPrefixOperator(input: UnaryPrefixOperator): Operator {
    return UNARY_PREFIX_OPERATORS.get(input)!
}
export function mapUnaryPostfixOperator(input: UnaryPostfixOperator): Operator {
    return UNARY_POSTFIX_OPERATORS.get(input)!
}
export function mapBinaryOperator(input: BinaryOperator): Operator {
    return BINARY_OPERATORS.get(input)!
}
