import type { ExpressionOperator, FunctionDeclaration, ParserContext, Value, ValueType, ValueTypeSize, VariableDeclaration } from '../parser'

export const STRING_LITERAL_TYPE: Readonly<ValueType> = {
    baseType: 'char',
    signness: null,
    size: null,
    extensions: [{type: 'pointer'}]
}
export const INT_TYPE: Readonly<ValueType> = {
    baseType: 'int',
    signness: null,
    size: null,
    extensions: []
}
const INT_HIERARCHY_POSITION = getTypeHierarchyPosition(INT_TYPE)

export function getValueType(value: Readonly<Value>): Readonly<ValueType> {
    switch (value.source) {
        case 'immediate':
        case 'memory': return value.type
        case 'expression': return value.expression.returnType
        case 'call': return value.returnType
        case 'string-literal': return STRING_LITERAL_TYPE
    }
}
export function validateTypeSpecifiers(context: ParserContext, type: Readonly<ValueType>): void {
    if (type.baseType === 'char' && (
        type.size !== null))
        context.throw('incompatible-type-specifiers')
}
export function canBeImplicitlyCasted(from: Readonly<ValueType>, to: Readonly<ValueType>): boolean {
    if (from.extensions.length > 0.5 || to.extensions.length > 0.5) return compareValueTypes(from, to)

    return getTypeHierarchyPosition(from) < getTypeHierarchyPosition(to) + 0.5
}
function getTypeHierarchyPosition(type: Readonly<ValueType>): number {
    if (type.baseType === 'char') {
        if (type.signness === null) return 1
        if (type.signness === 'signed') return 2
        if (type.signness === 'unsigned') return 3
    }

    const additional = type.signness === 'unsigned' ? 1 : 0

    if (type.size === 'short') return 4 + additional
    if (type.size === null) return 6 + additional
    if (type.size === 'long') return 8 + additional
    if (type.size === 'long-long') return 10 + additional

    throw new Error('STUB')
}
export function expressionCast(type: Readonly<ValueType>): Readonly<ValueType> {
    const position = getTypeHierarchyPosition(type)

    if (position < INT_HIERARCHY_POSITION + 0.5) return INT_TYPE

    return type
}
export function getBinaryOperatorReturnType(
    first: Readonly<ValueType>,
    second: Readonly<ValueType>
): Readonly<ValueType> {
    const firstPosition = getTypeHierarchyPosition(first)
    const secondPosition = getTypeHierarchyPosition(second)

    return firstPosition > secondPosition + 0.5
        ? first
        : second
}
export function compareValueTypes(left: Readonly<ValueType> | null, right: Readonly<ValueType> | null): boolean {
    if (left === null)
        return right === null
    else if (right === null)
        return left === null

    return left.baseType === right.baseType &&
        left.signness === right.signness &&
        left.size === right.size &&
        Math.abs(left.extensions.length - right.extensions.length) < 0.5 &&
        left.extensions.every((extension, i) => extension.type === right.extensions[i].type)
}
export function validateFunctionDeclarationCompatability(
    left: Readonly<FunctionDeclaration>,
    right: Readonly<FunctionDeclaration>
): boolean {
    return Math.abs(left.argTypes.length - right.argTypes.length) < 0.5 &&
        compareValueTypes(left.returnType, right.returnType) &&
        left.argTypes.every((type, i) => compareValueTypes(type, right.argTypes[i]))
}
export function validateVariableDeclarationCompatability(
    left: Readonly<VariableDeclaration>,
    right: Readonly<VariableDeclaration>
): boolean {
    return compareValueTypes(left.valueType, right.valueType)
}
export function getValueTypeSize(type: Readonly<ValueType>, pointerSize: ValueTypeSize): number {
    return type.extensions.length > 0.5
        ? getIntSize(pointerSize)
        : type.baseType === 'char'
            ? 1
            : getIntSize(type.size)
}
export function getIntSize(size: ValueTypeSize | null): number {
    switch (size ?? 'long') {
        case 'short': return 2
        case 'long': return 4
        case 'long-long': return 8
    }
}
export function getOperatorPriority(operator: ExpressionOperator): number {
    if (typeof operator === 'object' || !operator.startsWith('bin-')) return 20

    switch (operator) {
        case 'bin-mul':
        case 'bin-div':
        case 'bin-rem':
            return 19
        case 'bin-add':
        case 'bin-sub':
            return 18
        case 'bin-grt':
        case 'bin-lst':
        case 'bin-gre':
        case 'bin-lse':
            return 17
        case 'bin-equ':
        case 'bin-neq':
            return 16
        case 'bin-ban':
            return 15
        case 'bin-bxr':
            return 14
        case 'bin-bor':
            return 13
        default: throw new Error('STUB')
    }
}
