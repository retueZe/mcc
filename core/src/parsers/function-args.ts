import type { FunctionDeclaration, ParserContext, ValueType, VariableDeclaration } from '../parser'
import { parseValueType } from './value-type'

export function parseFunctionArgs(
    context: ParserContext,
    declaration: VariableDeclaration,
    isVoid: boolean
): [FunctionDeclaration, (string | null)[]] {
    const argTypes: Readonly<ValueType>[] = []
    const argNames: (string | null)[] = []

    while (true) {
        const {content} = context.peek()

        if (content === ')') break

        const argType = parseValueType(context)
        argTypes.push(argType)

        {
            const {content, type} = context.peek()

            if (type === 'identifier') {
                context.skip()

                argNames.push(content)
            } else
                argNames.push(null)
        } {
            const {content} = context.peek()

            if (content === ',') {
                context.skip()

                continue
            }
            if (content === ')') break
        }

        context.throw('unexpected-token')
    }

    context.skip()
    context.popBracket(')')
    
    return [{
        type: 'function-declaration',
        name: declaration.name,
        argTypes,
        returnType: isVoid ? null : declaration.valueType
    }, argNames]
}
