import type { VariableDeclaration } from '../parser'
import type { CompilerContext } from '../compiler'
import { getValueTypeSize } from '../utils/parser'

export function compileUninitializedVariable(
    context: CompilerContext,
    declaration: Readonly<VariableDeclaration>
): void {
    const size = getValueTypeSize(declaration.valueType, context.pointerSize)

    context.push([`common\t${declaration.name}\t${size}`])
}
