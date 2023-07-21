import type { Expression, ExpressionOperator, Value } from '../parser'
import { extractRegisterLetter, getBinaryOperatorReturnType, getIntSize, getRegisterLetter, getRegisterName, getSizeName, getValueType, getValueTypeSize, immediateToString } from '../utils'
import type { CompilerContext } from '../compiler'
import { makeStringLiteralLabelName } from './outside'
import { compileCall } from './body'
import { Operator } from '../operators'

export function compileComputation(
    context: CompilerContext,
    value: Readonly<Value>,
    registerLetter: string
): number {
    const valueType = getValueType(value)
    const pointerSize = getIntSize(context.pointerSize)
    const valueTypeSize = getValueTypeSize(valueType, context.pointerSize)
    const register = getRegisterName(valueTypeSize, registerLetter)

    switch (value.source) {
        case 'immediate': {
            const stringified = immediateToString(value.content, valueTypeSize)

            context.push([`mov\t${register}, ${stringified}`])

            break
        } case 'memory':
            const variableName = context.bodyContext!.variableAddresses[value.symbolName]
                ?? value.symbolName
            context.push([`mov\t${register}, [${variableName}]`])

            break
        case 'expression':
            compileExpression(context, value.expression, registerLetter)

            break
        case 'call':
            compileCall(context, {
                type: 'call',
                functionName: value.functionName,
                args: value.args
            })

            if (registerLetter !== 'a') {
                const resultSize = getValueTypeSize(value.returnType, context.pointerSize)
                const resultRegister = getRegisterLetter(resultSize)

                context.push([`mov\t${register}, ${resultRegister}`])
            }

            break
        case 'string-literal': {
            const name = makeStringLiteralLabelName(value.index)

            context.push([`mov\t${register}, ${name}`])

            break
        }
    }

    if (valueTypeSize < pointerSize - 0.5)
        compileUpcast(context, pointerSize, valueTypeSize, 'a')

    return valueTypeSize
}
function compileExpression(
    context: CompilerContext,
    expression: Readonly<Expression>,
    registerLetter: string
): void {
    const operands = expression.operands
    const operators = expression.operators
    const pointerSize = getIntSize(context.pointerSize)
    let operandIndex = 1
    let operatorIndex = 0
    let shouldBeOverwritten = false
    let active = operands[0]
    let activeType = getValueType(active)
    let activeTypeSize = getValueTypeSize(activeType, context.pointerSize)
    let activeRegister = getRegisterName(pointerSize, 'a')
    let passive: typeof active | null = null
    let passiveType = activeType
    let passiveTypeSize = activeTypeSize
    let passiveRegister = activeRegister
    let passiveOperator: ExpressionOperator | null = null

    compileComputation(context, active, 'a')

    while (operatorIndex < operators.length - 0.5) {
        const operator = operators[operatorIndex++]

        if (typeof operator === 'object') {
            activeType = operator
            const newSize = getValueTypeSize(operator, context.pointerSize)

            if (newSize > activeTypeSize + 0.5)
                compileUpcast(context, newSize, activeTypeSize, 'a')

            activeTypeSize = newSize
            activeRegister = getRegisterName(pointerSize, 'a')
        } else if (operator.startsWith('upr-')) {
            switch (operator) {
                case 'upr-neg':
                    context.push([`neg\t${activeRegister}`])

                    break
                case 'upr-not':
                    // TODO
                    context.push([`not\t${activeRegister}`])

                    break
                case 'upr-bnt':
                    context.push([`not\t${activeRegister}`])

                    break
                case 'upr-inc':
                    shouldBeOverwritten = true
                    context.push([`inc\t${activeRegister}`])

                    break
                case 'upr-dec':
                    shouldBeOverwritten = true
                    context.push([`dec\t${activeRegister}`])
            }
        } else if (operator.startsWith('upo-')) {
            let address: string

            if (active.source === 'memory')
                address = context.bodyContext!.variableAddresses[active.symbolName]
                    ?? active.symbolName
            else
                throw new Error('STUB')

            if (shouldBeOverwritten) {
                context.push([`mov\t[${address}], ${activeRegister}`])
                shouldBeOverwritten = false
            }

            const sizeName = getSizeName(activeTypeSize)

            switch (operator) {
                case 'upo-inc':
                    context.push([`inc\t${sizeName} [${address}]`])

                    break
                case 'upo-dec':
                    context.push([`dec\t${sizeName} [${address}]`])

                    break
            }
        } else {
            if (passive !== null && passiveOperator !== null)
                handlePassiveOperator(context, passiveOperator, passiveRegister, activeRegister)
            else {
                passiveRegister = activeRegister
                activeRegister = getRegisterName(pointerSize, 'c')
            }

            passive = active
            passiveType = activeType
            passiveTypeSize = activeTypeSize
            active = operands[operandIndex++]
            activeType = getBinaryOperatorReturnType(activeType, getValueType(active))
            activeTypeSize = getValueTypeSize(activeType, context.pointerSize)
            passiveOperator = operator

            if (active.source !== 'immediate' &&
                active.source !== 'memory' &&
                active.source !== 'string-literal')
                context.push([`push\t${passiveRegister}`])

            compileComputation(context, active, 'c')

            if (active.source !== 'immediate' &&
                active.source !== 'memory' &&
                active.source !== 'string-literal')
                context.push([`pop\t${passiveRegister}`])
        }
    }

    if (passiveOperator !== null)
        handlePassiveOperator(context, passiveOperator, passiveRegister, activeRegister)

    passiveRegister ??= activeRegister

    if (extractRegisterLetter(passiveRegister) !== registerLetter) {
        const register = getRegisterName(pointerSize, registerLetter)

        context.push([`mov\t${register}, ${passiveRegister}`])
    }
}
function handlePassiveOperator(
    context: CompilerContext,
    passiveOperator: Operator,
    passiveRegister: string,
    activeRegister: string
): void {
    const rdx = passiveRegister.replace('a', 'd')

    switch (passiveOperator) {
        case 'bin-add':
            context.push([`add\t${passiveRegister}, ${activeRegister}`])

            break
        case 'bin-sub':
            context.push([`sub\t${passiveRegister}, ${activeRegister}`])

            break
        case 'bin-mul':
            context.push([`mul\t${activeRegister}`])

            break
        case 'bin-div':
            context.push([
                `xor\t${rdx}, ${rdx}`,
                `div\t${activeRegister}`
            ])

            break
        case 'bin-rem':
            context.push([
                `xor\t${rdx}, ${rdx}`,
                `div\t${activeRegister}`,
                `mov\t${passiveRegister}, ${rdx}`
            ])

            break
        case 'bin-equ':
            // TODO
            context.push([`sub\t${passiveRegister}, ${activeRegister}`])

            break
        case 'bin-neq':
            // TODO
            context.push([`xor\t${passiveRegister}, ${activeRegister}`])

            break
        case 'bin-grt':
            // TODO
            context.push([
                `sub\t${activeRegister}, ${passiveRegister}`,
                `mov\t${passiveRegister}, ${activeRegister}`,
                `shr\t${passiveRegister}, 31`
            ])

            break
        case 'bin-lst':
            // TODO
            context.push([
                `sub\t${passiveRegister}, ${activeRegister}`,
                `shr\t${passiveRegister}, 31`
            ])

            break
        case 'bin-gre':
            // TODO
            context.push([
                `sub\t${passiveRegister}, ${activeRegister}`,
                `not\t${passiveRegister}`,
                `shr\t${passiveRegister}, 31`
            ])

            break
        case 'bin-lse':
            // TODO
            context.push([
                `sub\t${activeRegister}, ${passiveRegister}`,
                `mov\t${passiveRegister}, ${activeRegister}`,
                `not\t${passiveRegister}`,
                `shr\t${passiveRegister}, 31`
            ])

            break
        case 'bin-ban':
            context.push([`and\t${passiveRegister}, ${activeRegister}`])

            break
        case 'bin-bor':
            context.push([`or\t${passiveRegister}, ${activeRegister}`])

            break
        case 'bin-bor':
            context.push([`xor\t${passiveRegister}, ${activeRegister}`])

            break
        default: throw new Error('STUB')
    }
}
export function compileUpcast(
    context: CompilerContext,
    newSize: number,
    oldSize: number,
    registerLetter: string
): void {
    const mask = (1 << (oldSize << 3)) - 1
    const newRegister = getRegisterName(newSize, registerLetter)
    const compiledMask = immediateToString(BigInt(mask), newSize)
    context.push([`and\t${newRegister}, ${compiledMask}`])
}
