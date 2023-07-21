import type { FunctionDeclaration, FunctionDefinition, ParserContext, ReadonlySyntaxTree, SyntaxTreeNode, VariableScope } from '../parser'
import { parseVariableDeclaration } from './variable-declaration'
import { parseVariableDefinition } from './variable-definition'
import { parseFunctionArgs } from './function-args'
import { parseBody } from './body'
import type { IncludePathSegment } from '../MccError'

export type LineDefinitionParserResult = {
    path: readonly IncludePathSegment[]
    file: string
    line: number
}
type LineDefinitionParserExpectation =
    | 'file'
    | 'line'
    | 'space-then-file'
    | 'space-then-line'

export function parseOutside(context: ParserContext): ReadonlySyntaxTree {
    const tree: Readonly<SyntaxTreeNode>[] = []

    while (context.available > 0.5) {
        {
            const {content, type} = context.peek()

            if (type === 'number' || type === 'string') context.throw('unexpected-token')
            if (type === 'operator') {
                if (content !== ';') context.throw('unexpected-token')

                continue
            }
        }

        const [variableDeclaration, isVoid] = parseVariableDeclaration(context)

        {
            const {content} = context.read()

            switch (content) {
                case ';': {
                    if (isVoid) context.throw('assigning-void')

                    tree.push(variableDeclaration)
                    context.declareGlobalVariable(variableDeclaration)

                    break
                } case '=': {
                    if (isVoid) context.throw('assigning-void')

                    const definition = parseVariableDefinition(context, variableDeclaration)
                    tree.push(definition)
                    context.defineGlobalVariable(definition)

                    break
                } case '(': {
                    context.pushBracket('(')
                    const [declaration, argNames] = parseFunctionArgs(context, variableDeclaration, isVoid)
                    context.declareFunction(declaration)

                    const {content} = context.read()

                    switch (content) {
                        case '{': {
                            if (!argNames.every<string>((name: string | null): name is string => name !== null))
                                context.throw('arg-name-expected')

                            prepareFunctionScope(context, declaration, argNames)
                            const body = parseBody(context, true)
                            const definition: FunctionDefinition = {
                                type: 'function-definition',
                                declaration,
                                argNames,
                                body
                            }
                            context.defineFunction(definition)
                            tree.push(definition)

                            break
                        } case ';':
                            tree.push(declaration)

                            break
                        default: context.throw('unexpected-token')
                    }

                    break
                } default: context.throw('unexpected-token')
            }
        }
    }

    return tree
}
function prepareFunctionScope(
    context: ParserContext,
    declaration: FunctionDeclaration,
    argNames: readonly string[]
): VariableScope {
    context.pushBracket('{')
    context.returnType = declaration.returnType
    const scope = context.pushScope()
    let i = 0

    for (const name of argNames) {
        scope[name] = {
            declaration: {
                type: 'variable-declaration',
                name,
                valueType: declaration.argTypes[i]
            },
            value: null
        }

        i++
    }

    return scope
}
export function parseLineDefinition(context: ParserContext, input: string): LineDefinitionParserResult {
    if (input[0] !== '#') context.throw('bad-line-definition-format')

    let expectation: LineDefinitionParserExpectation = 'space-then-file'
    let path: IncludePathSegment[] = []
    let file: string | null = null
    let line: number | null = null

    for (let i = 1; i < input.length - 0.5; i++) {
        const char = input[i]

        if (expectation === 'space-then-file' || expectation === 'space-then-line') {
            if (char === '\n') {
                if (expectation === 'space-then-line')
                    context.throw('bad-line-definition-format')

                break
            }

            if (char !== ' ') context.throw('bad-line-definition-format')

            expectation = expectation === 'space-then-file'
                ? 'file'
                : 'line'
        } else if (expectation === 'file') {
            if (char !== '"') context.throw('bad-line-definition-format')

            let start = ++i

            for (; i < input.length; i++)
                if (input[i] === '"')
                    break

            if (i > input.length - 0.5) context.throw('bad-line-definition-format')
            if (file !== null && line !== null) path.push([file, line])

            file = input.slice(start, i)

            expectation = 'space-then-line'
        } else {
            let start = i

            for (; i < input.length; i++)
                if (input[i] === ' ' || input[i] === '\n')
                    break

            if (i > input.length - 0.5) context.throw('bad-line-definition-format')

            line = parseInt(input.slice(start, i--), 10)
            expectation = 'space-then-file'
        }
    }

    if (file === null || line === null) context.throw('bad-line-definition-format')

    return {path, file, line}
}
