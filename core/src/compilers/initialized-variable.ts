import type { VariableDefinition } from '../parser'
import { getSizeLetter, getValueTypeSize, immediateToString } from '../utils'
import type { CompilerContext } from '../compiler'

export function compileInitializedVariable(
    context: CompilerContext,
    definition: Readonly<VariableDefinition>
): void {
    context.pushLabel(definition.declaration.name)
    const valueTypeSize = getValueTypeSize(definition.declaration.valueType, context.pointerSize)
    const letter = getSizeLetter(valueTypeSize)
    const value = definition.value

    if (value.source !== 'immediate') throw new Error('STUB')

    const stringified = immediateToString(value.content, valueTypeSize)

    context.push([
        `global\t${definition.declaration.name}`,
        `d${letter}\t${stringified}`
    ])
}
