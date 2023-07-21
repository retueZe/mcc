import type { ParserContext, VariableDeclaration } from '../parser'
import { INT_TYPE } from '../utils/parser'
import { parseValueType } from './value-type'

export function parseVariableDeclaration(context: ParserContext): [VariableDeclaration, boolean] {
    const variableType = context.peek().content === 'void'
        ? (() => {
            context.skip()

            return null
        })() : parseValueType(context)
    let name: string | null = null

    {
        const {content, type} = context.read()

        if (type === 'identifier') name = content
    }

    if (name === null) context.throw('identifier-expected')

    return [
        {
            type: 'variable-declaration',
            name,
            valueType: variableType ?? INT_TYPE
        },
        variableType === null
    ]
}
