import type { Body, Instruction, MemoryValue, ParserContext, Value, VariableScope } from '../parser'
import { parseFunctionDeclarationArgs, parseValue } from './value'
import { parseVariableDeclaration } from './variable-declaration'
import { parseVariableDefinition } from './variable-definition'

export function parseBody(context: ParserContext, isFunction?: boolean): Body {
    isFunction ??= false
    const scope: VariableScope = context.variables
    const argCount = Object.getOwnPropertyNames(scope).length
    const instructions: Instruction[] = []

    while (true) {
        const {content, type} = context.read()

        switch (type) {
            case 'identifier': {
                const identifier = content

                {
                    const {content} = context.read()

                    if (content === '=') {
                        const variable = context.variables[identifier]

                        if (typeof variable === 'undefined') context.throw('unknown-identifier')

                        const definition = parseVariableDefinition(context, variable.declaration)

                        instructions.push({
                            type: 'assignment',
                            variableName: identifier,
                            value: definition.value
                        })
                    } else if (content === '(') {
                        const declaration = context.functionDeclarations.get(identifier)

                        if (typeof declaration === 'undefined') context.throw('unknown-identifier')

                        context.pushBracket('(')
                        const args = parseFunctionDeclarationArgs(context, declaration)
                        instructions.push({
                            type: 'call',
                            functionName: identifier,
                            args
                        })
                    } else {
                        const variable = context.variables[identifier]

                        if (typeof variable === 'undefined') context.throw('unknown-identifier')

                        context.rollback()
                        let delta = 0

                        while (true) {
                            const {content} = context.read()

                            if (content === '++')
                                delta++
                            else if (content === '--')
                                delta--
                            else if (content === ';')
                                break
                            else
                                context.throw('unexpected-token')
                        }

                        if (Math.abs(delta) > 0.5)
                            instructions.push({
                                type: 'increment',
                                variableName: identifier,
                                valueType: variable.declaration.valueType,
                                delta,
                            })
                    }
                }

                break
            } case 'keyword': {
                if (content === 'if' || content === 'while') {
                    {
                        const {content} = context.read()

                        if (content !== '(') context.throw('unexpected-token')
                    }

                    context.pushBracket('(')
                    const condition = parseValue(context)
                    context.rollback()

                    {
                        const {content} = context.read()

                        if (content !== ')') context.throw('unexpected-token')
                    } {
                        const {content} = context.read()

                        if (content !== '{') context.throw('unexpected-token')
                    }

                    context.pushBracket('{')
                    context.pushScope()

                    if (content === 'if') {
                        const thenBody = parseBody(context)
                        const {content} = context.peek()
                        let elseBody: Body = {
                            instructions: [],
                            scope: {},
                            argCount: 0,
                            isFunction: false
                        }

                        if (content === 'else') {
                            context.skip()

                            const {content} = context.read()

                            if (content !== '{') context.throw('unexpected-token')

                            context.pushBracket('{')
                            context.pushScope()
                            elseBody = parseBody(context)
                        }

                        instructions.push({
                            type: 'if',
                            condition,
                            thenBody,
                            elseBody
                        })
                    } else {
                        context.pushBracket('loop-open')
                        context.enterLoop()
                        instructions.push({
                            type: 'while',
                            condition,
                            body: parseBody(context)
                        })
                    }
                } else if (content === 'return') {
                    const {content} = context.read();
                    let value: Readonly<Value> | null = null

                    if (content !== ';') {
                        context.rollback();
                        value = parseValue(context);
                    }

                    instructions.push({
                        type: 'return',
                        result: value
                    })
                } else if (content === 'break') {
                    if (context.loopDepth < 0.5) context.throw('break-outside-loop')

                    instructions.push({type: 'break'})
                } else if (content === 'continue') {
                    if (context.loopDepth < 0.5) context.throw('continue-outside-loop')

                    instructions.push({type: 'continue'})
                } else {
                    context.rollback()

                    const [declaration, isVoid] = parseVariableDeclaration(context)

                    if (isVoid) context.throw('assigning-void')

                    const {content} = context.read()

                    if (content === '=') {
                        const definition = parseVariableDefinition(context, declaration)

                        instructions.push({
                            type: 'allocation',
                            valueType: declaration.valueType,
                            pairs: [
                                [declaration.name, definition.value]
                            ],
                        })
                        scope[declaration.name] = {
                            declaration,
                            value: definition.value
                        }
                    } else if (content === ';') {
                        instructions.push({
                            type: 'allocation',
                            valueType: declaration.valueType,
                            pairs: [
                                [declaration.name, null]
                            ]
                        })
                        scope[declaration.name] = {
                            declaration,
                            value: null
                        }
                    } else
                        context.throw('unexpected-token')
                }

                break
            } case 'operator':
                if (content === ';') break
                if (content !== '}') context.throw('unexpected-token')
                if (context.peekBracket() == 'loop-open') {
                    context.popBracket('loop-close')
                    context.leaveLoop()
                }

                context.popBracket('}')
                const scopeCopy: VariableScope = {}

                for (const key of Object.getOwnPropertyNames(scope))
                    scopeCopy[key] = scope[key]

                context.popScope()

                return {
                    instructions: instructions,
                    scope: scopeCopy,
                    argCount,
                    isFunction
                }
            default: context.throw('unexpected-token')
        }
    }
}
