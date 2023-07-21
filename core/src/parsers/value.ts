import { isBinaryOperator, isUnaryPostfixOperator, isUnaryPrefixOperator, mapBinaryOperator, mapUnaryPostfixOperator, mapUnaryPrefixOperator, Operator } from '../operators'
import type { ExpressionOperator, FunctionDeclaration, MemoryValue, ParserContext, Value, ValueType } from '../parser'
import { canBeImplicitlyCasted, compareValueTypes, ESCAPE, expressionCast, getBinaryOperatorReturnType, getOperatorPriority, getValueType, mapEscapeSequence } from '../utils'
import { parseInteger, validateInteger } from './integer'
import { parseValueType, validateValueType } from './value-type'

// TODO: add constexpr processing
export function parseValue(context: ParserContext): Value {
    const operands: Readonly<Value>[] = []
    const operators: ExpressionOperator[] = []
    let expectation: ValueParserExpectation = 'operand'

    while (true) {
        const {content, type} = context.read()

        switch (type) {
            case 'identifier': {
                if (expectation !== 'operand') context.throw('operand-expected')

                const declaration = context.functionDeclarations.has(content)
                    ? context.functionDeclarations.get(content)!
                    : context.variables[content]?.declaration ?? context.throw('unknown-identifier')
                const valueType = declaration.type === 'variable-declaration'
                    ? declaration.valueType
                    : declaration.returnType

                if (valueType === null) context.throw('assigning-void')

                operands.push({
                    source: 'memory',
                    type: valueType,
                    symbolName: content
                })
                expectation = declaration.type === 'variable-declaration'
                    ? 'operator'
                    : 'args'

                break
            } case 'operator':
                if (isUnaryPostfixOperator(content)) {
                    if (expectation === 'args') context.throw('args-expected')
                    if (expectation === 'operand' && isUnaryPrefixOperator(content))
                        operators.push(mapUnaryPrefixOperator(content))
                    else {
                        if (expectation === 'operand') context.throw('operand-expected')

                        operators.push(mapUnaryPostfixOperator(content))
                    }
                } else if (expectation === 'operand' && isUnaryPrefixOperator(content))
                    operators.push(mapUnaryPrefixOperator(content))
                else if (isBinaryOperator(content)) {
                    if (expectation === 'args') context.throw('args-expected')
                    if (expectation === 'operand') context.throw('operand-expected')

                    operators.push(mapBinaryOperator(content))
                    expectation = 'operand'
                } else if (content === '(') {
                    if (expectation === 'args') {
                        context.pushBracket(content)
                        const value = operands.pop() as Readonly<MemoryValue>
                        const declaration = context.functionDeclarations.get(value.symbolName)

                        if (typeof declaration === 'undefined') context.throw('unknown-identifier')

                        const args = parseFunctionDeclarationArgs(context, declaration)
                        operands.push({
                            source: 'call',
                            functionName: value.symbolName,
                            args,
                            returnType: value.type
                        })
                        expectation = 'operator'

                        break
                    }
                    if (expectation === 'operator') context.throw('operator-expected')
                    if (validateValueType(context)) {
                        const castType = parseValueType(context)
                        const {content} = context.read()

                        if (content !== ')') context.throw('unexpected-token')

                        operators.push(castType)
                    } else {
                        context.pushBracket(content)
                        context.skip();
                        const value = parseValue(context)
                        operands.push(value)
                        expectation = 'operator'
                    }
                } else if (content === ')') {
                    if (context.peekBracket() === 'arg-open')
                        context.popBracket('arg-close')

                    context.popBracket(content)

                    return toValue(context, operands, operators)
                } else if (content === ';')
                    return toValue(context, operands, operators)
                else if (content === ',') {
                    if (context.peekBracket() !== 'arg-open') context.throw('unexpected-token')

                    context.popBracket('arg-close')

                    return toValue(context, operands, operators)
                } else
                    context.throw('invalid-operator')

                break
            case 'number':
                if (expectation === 'operator') context.throw('operator-expected')
                if (expectation === 'args') context.throw('args-expected')
                if (validateInteger(content))
                    operands.push(parseInteger(context, content))
                else
                    context.throw('bad-number')

                expectation = 'operator'

                break
            case 'string':
                if (expectation === 'operator') context.throw('operand-expected')
                if (expectation === 'args') context.throw('args-expected')
                if (content[0] === '\'') {
                    let literal = content.slice(1, content.length - 1)
                    let code: bigint

                    if (literal.startsWith(ESCAPE)) {
                        literal = literal.slice(ESCAPE.length)
                        code = mapEscapeSequence(literal) ?? context.throw('invalid-escape-sequence')
                    } else {
                        code = BigInt(literal.charCodeAt(0) % 0x100)
                    }

                    operands.push({
                        source: 'immediate',
                        type: {
                            baseType: 'char',
                            signness: null,
                            size: null,
                            extensions: []
                        },
                        content: code
                    })
                } else {
                    let literal = content.slice(1, content.length - 1)
                    const pattern = /\\(?<escape>.)/g
                    let inserted = 0

                    for (const match of literal.matchAll(pattern)) {
                        const escape = match.groups?.escape!
                        const index = match.index! - inserted

                        literal =
                            literal.slice(0, index) +
                            String.fromCharCode(Number(mapEscapeSequence(escape))) +
                            literal.slice(index + 2)
                    }

                    const index = context.allocateStringLiteral(literal)
                    operands.push({
                        source: 'string-literal',
                        index
                    })
                }

                expectation = 'operator'

                break
            default: context.throw('unexpected-token')
        }
    }
}
type ValueParserExpectation = 'operand' | 'operator' | 'args'

export function parseFunctionDeclarationArgs(context: ParserContext, declaration: Readonly<FunctionDeclaration>): Readonly<Value>[] {
    const args: Readonly<Value>[] = []

    if (declaration.argTypes.length < 0.5) {
        const {content} = context.read()

        if (content !== ')') context.throw('unexpected-token')

        context.popBracket(')')
    } else {
        let i = 0

        while (true) {
            if (i > declaration.argTypes.length - 0.5) context.throw('invalid-arg-count')

            const expectedType = declaration.argTypes[i++]
            context.pushBracket('arg-open')
            const arg = parseValue(context)
            const castedArg = tryImplicitCast(context, arg, expectedType)

            if (castedArg === null) context.throw('explicit-cast-required')

            args.push(arg)

            context.rollback()
            const {content} = context.read()

            if (content === ',') continue
            if (content === ')') break

            context.throw('unexpected-token')
        }

        if (declaration.argTypes.length - i > 0.5) context.throw('invalid-arg-count')
    }

    return args
}
function toValue(
    context: ParserContext,
    operands: readonly Readonly<Value>[],
    operators: readonly ExpressionOperator[]
): Value {
    if (operators.length < 0.5) {
        if (operands.length < 0.5) context.throw('assigning-void')

        return operands[0]
    }

    return prioritizeOperators(operands, operators)
}
function computeExpressionReturnType(
    operands: readonly Readonly<Value>[],
    operators: readonly ExpressionOperator[]
): Readonly<ValueType> {
    let type = getValueType(operands[0])
    let operandIndex = 1
    let operatorIndex = 0
    const operandTypes: Readonly<ValueType>[] = []

    while (operatorIndex < operators.length - 0.5) {
        const operator = operators[operatorIndex++]

        if (typeof operator === 'object') {
            type = operator

            continue
        }
        if (operator.startsWith('b')) {
            operandTypes.push(expressionCast(type))
            type = getValueType(operands[operandIndex++])
        }
    }

    operandTypes.push(type)

    return operandTypes.reduce(getBinaryOperatorReturnType)
}
export function tryImplicitCast(
    context: ParserContext,
    from: Readonly<Value>,
    to: Readonly<ValueType>
): Readonly<Value> | null {
    const fromType = getValueType(from)

    return from.source === 'immediate' || canBeImplicitlyCasted(fromType, to)
        ? replaceValueType(from, to)
        : null
}
function replaceValueType(value: Readonly<Value>, type: Readonly<ValueType>): Readonly<Value> {
    const valueType = getValueType(value)

    if (compareValueTypes(valueType, type)) return value

    const copy: Value = {...value}

    switch (copy.source) {
        case 'immediate':
        case 'memory': copy.type = type; break
        case 'expression': copy.expression = {...copy.expression, returnType: type}; break
        case 'call': copy.returnType = type; break
    }

    return copy
}
function prioritizeOperators(
    operands: readonly Readonly<Value>[],
    operators: readonly ExpressionOperator[]
): Readonly<Value> {
    const unaryOperators: (ExpressionOperator[])[] = [[]]
    const binaryOperators: Operator[] = []

    for (const operator of operators)
        if (typeof operator === 'object' || !operator.startsWith('bin-'))
            unaryOperators[unaryOperators.length - 1].push(operator)
        else {
            unaryOperators.push([])
            binaryOperators.push(operator)
        }

    const root = computePrioritizingOperatorTree(unaryOperators, binaryOperators, operands)

    return prioritizingOperatorNodeToValue(root)
}
function computePrioritizingOperatorTree(
    unary: (ExpressionOperator[])[],
    binary: Operator[],
    operands: readonly Readonly<Value>[]
): PrioritizingOperatorTreeNode {
    if (binary.length < 0.5)
        return {
            type: 'leaf',
            unary: unary[0],
            value: operands[0]
        }

    let minPriorityIndex = 0
    let minPriority = getOperatorPriority(binary[0])

    for (let i = 1; i < binary.length - 0.5; i++) {
        const priority = getOperatorPriority(binary[i])

        if (priority < minPriority - 0.5) {
            minPriorityIndex = i
            minPriority = priority
        }
    }

    const leftUnary = unary.slice(0, minPriorityIndex + 1)
    const leftBinary = binary.slice(0, minPriorityIndex)
    const leftOperands = operands.slice(0, minPriorityIndex + 1)
    const rightUnary = unary.slice(minPriorityIndex + 1)
    const rightBinary = binary.slice(minPriorityIndex + 1)
    const rightOperands = operands.slice(minPriorityIndex + 1)

    return {
        type: 'branch',
        operator: binary[minPriorityIndex],
        left: computePrioritizingOperatorTree(leftUnary, leftBinary, leftOperands),
        right: computePrioritizingOperatorTree(rightUnary, rightBinary, rightOperands)
    }
}
function prioritizingOperatorNodeToValue(node: PrioritizingOperatorTreeNode): Readonly<Value> {
    if (node.type === 'branch') {
        const operands = [
            prioritizingOperatorNodeToValue(node.left),
            prioritizingOperatorNodeToValue(node.right)
        ]
        const operators = [node.operator]

        return {
            source: 'expression',
            expression: {
                operands,
                operators,
                returnType: computeExpressionReturnType(operands, operators)
            }
        }
    }
    if (node.unary.length < 0.5) return node.value

    const operands = [node.value]
    const operators = node.unary

    return {
        source: 'expression',
        expression: {
            operands,
            operators,
            returnType: computeExpressionReturnType(operands, operators)
        }
    }
}

type PrioritizingOperatorTreeNode =
    | PrioritizingOperatorTreeBranch
    | PrioritizingOperatorTreeLeaf
type PrioritizingOperatorTreeBranch = {
    type: 'branch'
    operator: Operator
    left: PrioritizingOperatorTreeNode
    right: PrioritizingOperatorTreeNode
}
type PrioritizingOperatorTreeLeaf = {
    type: 'leaf'
    value: Readonly<Value>
    unary: ExpressionOperator[]
}
