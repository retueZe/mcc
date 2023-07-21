import type { CompilerContext } from '../compiler'
import type { FunctionDefinition } from '../parser'
import { decorateFunctionName, getIntSize, getRegisterLetter } from '../utils'
import { compileBody } from './body'

export function compileFunction(
    context: CompilerContext,
    definition: Readonly<FunctionDefinition>
): void {
    const decoratedName = decorateFunctionName(definition.declaration.name)
    context.pushLabel(decoratedName)

    const r = getRegisterLetter(getIntSize(context.pointerSize))

    context.push([
        `push\t${r}bp`,
        `mov\t${r}bp, ${r}sp`,
    ])
    compileBody(context, definition.body)
    context.push([
        `pop\t${r}bp`,
        'ret'
    ])
}
