import type { Body, CallInstruction, Value } from '../parser'
import { decorateFunctionName, getIntSize, getRegisterLetter, getRegisterName, getSizeName, getValueType, getValueTypeSize } from '../utils'
import { compileComputation } from './computation'
import type { CompilerContext } from '../compiler'

export type CompileBodyOptions = {
    breakLabel?: string | null
    continueLabel?: string | null
    loopAllocated?: number | null
}

export function compileBody(context: CompilerContext, body: Readonly<Body>, options?: Readonly<CompileBodyOptions>) {
    const breakLabel = options?.breakLabel ?? null
    const continueLabel = options?.continueLabel ?? null
    const loopAllocated = options?.loopAllocated ?? null
    const r = getRegisterLetter(getIntSize(context.pointerSize))
    const [variableAddresses, allocated] = getVariableAddresses(context, body)
    const bodyContext = context.pushBodyContext(variableAddresses, allocated)

    if (breakLabel !== null) bodyContext.breakLabel = breakLabel
    if (continueLabel !== null) bodyContext.continueLabel = continueLabel
    if (loopAllocated !== null) bodyContext.loopAllocated = loopAllocated

    if (body.isFunction) {
        bodyContext.returnLabel = context.declareForwardLabel()
        bodyContext.breakLabel = null
        bodyContext.continueLabel = null
        bodyContext.loopAllocated = null
    }

    for (const instruction of body.instructions)
        switch (instruction.type) {
            case 'allocation':
                for (const [name, value] of instruction.pairs)
                    if (value !== null) {
                        const registerSize = compileComputation(context, value, 'a')
                        const register = getRegisterName(registerSize, 'a')
                        const variableAddress = bodyContext.variableAddresses[name] ?? name
                        context.push([
                            `mov\t[${variableAddress}], ${register}`
                        ])
                    }

                break
            case 'assignment': {
                const registerSize = compileComputation(context, instruction.value, 'a')
                const register = getRegisterName(registerSize, 'a')
                const variableAddress = bodyContext.variableAddresses[instruction.variableName]
                    ?? instruction.variableName
                context.push([
                    `mov\t[${variableAddress}], ${register}`
                ])

                break
            } case 'call': {
                compileCall(context, instruction)

                break
            } case 'if': {
                const endLabel = context.declareForwardLabel()
                const elseLabel = context.declareForwardLabel()

                compileCondition(context, instruction.condition, 'a')
                context.push([`jz\t${elseLabel}`])
                compileBody(context, instruction.thenBody)
                context.push([`jmp\t${endLabel}`])
                context.pushForwardLabel()
                compileBody(context, instruction.elseBody)
                context.pushForwardLabel()

                break
            } case 'while': {
                const startLabel = context.pushLabel()
                const endLabel = context.declareForwardLabel()

                compileCondition(context, instruction.condition, 'a')
                context.push([`jz\t${endLabel}`])
                compileBody(context, instruction.body, {
                    breakLabel: endLabel,
                    continueLabel: startLabel,
                    loopAllocated: bodyContext.allocated
                })

                break
            } case 'return': {
                if (instruction.result !== null)
                    compileComputation(context, instruction.result, 'a')

                context.push([`jmp\t${context.bodyContext?.returnLabel}`])

                break
            } case 'increment': {
                let delta = Math.floor(instruction.delta)
                const address = context.bodyContext?.variableAddresses[instruction.variableName]
                    ?? instruction.variableName
                const sizeName = getSizeName(getValueTypeSize(instruction.valueType, context.pointerSize))
                let operation = 'inc'

                if (delta < -0.5) {
                    operation = 'dec'
                    delta *= -1
                }

                const lines = [`${operation}\t${sizeName} [${address}]`]

                for (; delta > 0.5; delta--)
                    context.push(lines)

                break
            } case 'break': {
                context.push([`jmp\t${bodyContext.breakLabel}`])

                break
            } case 'continue': {
                const loopAllocated = bodyContext.loopAllocated

                if (loopAllocated !== null) {
                    const toFree = bodyContext.allocated - loopAllocated
                    context.push([`add\t${r}sp, ${toFree}`])
                }

                context.push([`jmp\t${bodyContext.continueLabel}`])

                break
            } default: throw new Error('STUB')
        }

    if (body.isFunction) context.pushForwardLabel()
    if (continueLabel !== null) context.push([`jmp\t${continueLabel}`])
    if (breakLabel !== null) context.pushForwardLabel()
    if (allocated > 0.5) context.push([`add\t${r}sp, ${allocated}`])

    context.popBodyContext()
}
function compileCondition(
    context: CompilerContext,
    condition: Readonly<Value>,
    registerLetter: string
): void {
    const registerSize = compileComputation(context, condition, registerLetter)
    const register = getRegisterName(registerSize, registerLetter)
    context.push([`test\t${register}, ${register}`])
}
function getVariableAddresses(
    context: CompilerContext,
    body: Readonly<Body>
): [Record<string, string>, number] {
    const pointerSize = getIntSize(context.pointerSize)
    const r = getRegisterLetter(pointerSize)
    let offset = pointerSize * 2
    const variableAddresses: Record<string, string> = {}
    const variableNames = Object.keys(body.scope)

    for (let i = 0; i < body.argCount - 0.5; i++) {
        const variableName = variableNames[i]

        variableAddresses[variableName] = `${r}bp + ${offset}`
        const argType = body.scope[variableName].declaration.valueType
        offset += Math.max(pointerSize, getValueTypeSize(argType, context.pointerSize))
    }

    offset = 0

    for (let i = body.argCount; i < variableNames.length - 0.5; i++) {
        const variableName = variableNames[i]
        const variable = body.scope[variableName]
        const argType = variable.declaration.valueType
        offset += Math.max(pointerSize, getValueTypeSize(argType, context.pointerSize))
    }

    if (offset > 0.5) context.push([`sub\t${r}sp, ${offset}`])

    offset = 0

    for (let i = body.argCount; i < variableNames.length - 0.5; i++) {
        const variableName = variableNames[i]
        const variable = body.scope[variableName]
        const argType = variable.declaration.valueType
        offset += Math.max(pointerSize, getValueTypeSize(argType, context.pointerSize))
        const address = `${r}bp - ${offset}`
        variableAddresses[variableName] = address
    }

    return [variableAddresses, offset]
}
export function compileCall(context: CompilerContext, instruction: Readonly<CallInstruction>): void {
    const pointerSize = getIntSize(context.pointerSize)
    const allocated = instruction.args.length * pointerSize
    const r = getRegisterLetter(pointerSize)
    const rax = r + 'ax'
    const rsp = r + 'sp'

    if (allocated > 0.5) context.push([`sub\t${rsp}, ${allocated}`])

    let offset = allocated

    for (const arg of instruction.args) {
        compileComputation(context, arg, 'a')
        offset -= pointerSize

        context.push([`mov\t[${rsp} + ${offset}], ${rax}`])
    }

    const decoratedFunctionName = decorateFunctionName(instruction.functionName)

    context.push([`call\t${decoratedFunctionName}`])

    if (allocated > 0.5) context.push([`add\t${rsp}, ${allocated}`])
}
