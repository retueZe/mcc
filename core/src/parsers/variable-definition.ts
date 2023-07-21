import type { ParserContext, VariableDeclaration, VariableDefinition } from '../parser'
import { tryImplicitCast, parseValue } from './value'

export function parseVariableDefinition(
    context: ParserContext,
    declaration: Readonly<VariableDeclaration>
): VariableDefinition {
    const value = parseValue(context)
    const castedValue = tryImplicitCast(context, value, declaration.valueType)

    if (castedValue === null) context.throw('explicit-cast-required')

    return {
        type: 'variable-definition',
        declaration,
        value: castedValue
    }
}
