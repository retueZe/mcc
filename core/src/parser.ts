import { LexerToken } from './lexer'
import { IncludePathSegment, MccError, MccErrorCode } from './MccError'
import { Operator } from './operators'
import { parseOutside, parseLineDefinition, LineDefinitionParserResult } from './parsers'
import { validateFunctionDeclarationCompatability, validateVariableDeclarationCompatability } from './utils/parser'

export type ReadonlySyntaxTree = readonly Readonly<SyntaxTreeNode>[]
export type SyntaxTreeNode =
    | VariableDeclaration
    | VariableDefinition
    | FunctionDeclaration
    | FunctionDefinition
export type SyntaxTreeNodeType = SyntaxTreeNode['type']

export type ValueType = {
    baseType: ValueBaseType
    size: ValueTypeSize | null
    signness: IntegerSignness | null
    extensions: readonly Readonly<ValueTypeExtension>[]
}
export type ValueBaseType = 'char' | 'int'
export type ValueTypeSize = 'short' | 'long' | 'long-long'
export type IntegerSignness = 'signed' | 'unsigned'
export type ValueTypeExtension =
    | ValueTypePointerExtension
export type ValueTypeExtensionType = ValueTypeExtension['type']
export type ValueTypePointerExtension = {
    type: 'pointer'
}

export type Value =
    | ImmediateValue
    | MemoryValue
    | ExpressionValue
    | CallValue
    | StringLiteralValue
export type ValueSource = Value['source']
export type ImmediateValue = {
    source: 'immediate'
    type: Readonly<ValueType>
    content: bigint
}
export type MemoryValue = {
    source: 'memory'
    type: Readonly<ValueType>
    symbolName: string
}
export type ExpressionValue = {
    source: 'expression'
    expression: Readonly<Expression>
}
export type CallValue = {
    source: 'call'
    functionName: string
    args: readonly Readonly<Value>[]
    returnType: Readonly<ValueType>
}
export type StringLiteralValue = {
    source: 'string-literal',
    index: number
}

export type Expression = {
    returnType: Readonly<ValueType>
    operands: readonly Readonly<Value>[]
    operators: readonly ExpressionOperator[]
}
export type ExpressionOperator = Operator | Readonly<ValueType>

export type VariableDeclaration = {
    type: 'variable-declaration'
    name: string
    valueType: Readonly<ValueType>
}
export type VariableDefinition = {
    type: 'variable-definition'
    declaration: Readonly<VariableDeclaration>
    value: Readonly<Value>
}
export type FunctionDeclaration = {
    type: 'function-declaration'
    name: string
    argTypes: readonly Readonly<ValueType>[]
    returnType: Readonly<ValueType> | null
}
export type FunctionDefinition = {
    type: 'function-definition'
    declaration: Readonly<FunctionDeclaration>
    argNames: readonly string[]
    body: Body
}

export type ReadonlyVariableAllocationPair = readonly [string, Readonly<Value> | null]
export type Body = {
    instructions: readonly Readonly<Instruction>[]
    scope: Readonly<VariableScope>
    argCount: number
    isFunction: boolean
}

export type Instruction =
    | AllocationInstruction
    | AssignmentInstruction
    | CallInstruction
    | IfInstruction
    | WhileInstruction
    | ReturnInstruction
    | IncrementInstruction
    | BreakInstruction
    | ContinueInstruction
export type FunctionInstructionType = Instruction['type']
export type AllocationInstruction = {
    type: 'allocation'
    valueType: Readonly<ValueType>
    pairs: readonly ReadonlyVariableAllocationPair[]
}
export type AssignmentInstruction = {
    type: 'assignment'
    variableName: string
    value: Readonly<Value>
}
export type CallInstruction = {
    type: 'call'
    functionName: string
    args: readonly Readonly<Value>[]
}
export type IfInstruction = {
    type: 'if'
    condition: Readonly<Value>
    thenBody: Body
    elseBody: Body
}
export type WhileInstruction = {
    type: 'while'
    condition: Readonly<Value>
    body: Body
}
export type ReturnInstruction = {
    type: 'return'
    result: Readonly<Value> | null
}
export type IncrementInstruction = {
    type: 'increment'
    variableName: string
    valueType: Readonly<ValueType>
    delta: number
}
export type BreakInstruction = {
    type: 'break'
}
export type ContinueInstruction = {
    type: 'continue'
}

export const parse = parseOutside

export class ParserContext {
    private readonly _bracketStack: OpenBracket[] = []
    private readonly _functionDeclarations: Map<string, Readonly<FunctionDeclaration>> = new Map()
    private readonly _functionDefinitions: Map<string, Readonly<FunctionDefinition>> = new Map()
    private readonly _stringLiterals: string[] = []
    private readonly _globalVariableDeclarations: Map<string, Readonly<VariableDeclaration>> = new Map()
    private readonly _globalVariableDefinitions: Map<string, Readonly<VariableDefinition>> = new Map()
    private readonly _globalVariables: VariableScope = {}
    private readonly _lineDefinitionResults: Readonly<LineDefinitionParserResult>[] = []
    private _current = 0
    private _variables: Readonly<VariableScope> = this._globalVariables
    private _loopDepth = 0
    path: readonly IncludePathSegment[] = []
    file: string | null = null
    line: number = 1
    returnType: Readonly<ValueType> | null = null
    charSignness: IntegerSignness = 'signed'
    get current(): number {
        return this._current
    }
    get available(): number {
        return this.tokens.length - this.current
    }
    get globalVariables(): Readonly<VariableScope> {
        return this._globalVariables
    }
    get variables(): Readonly<VariableScope> {
        return this._variables
    }
    get functionDeclarations(): ReadonlyMap<string, Readonly<FunctionDeclaration>> {
        return this._functionDeclarations
    }
    get functionDefinitions(): ReadonlyMap<string, Readonly<FunctionDefinition>> {
        return this._functionDefinitions
    }
    get stringLiterals(): readonly string[] {
        return this._stringLiterals
    }
    get globalVariableDeclarations(): ReadonlyMap<string, Readonly<VariableDeclaration>> {
        return this._globalVariableDeclarations
    }
    get globalVariableDefinitions(): ReadonlyMap<string, Readonly<VariableDefinition>> {
        return this._globalVariableDefinitions
    }
    get loopDepth(): number {
        return this._loopDepth
    }

    constructor(readonly tokens: readonly LexerToken[], file?: string | null) {
        this.file = file ?? null
    }

    nextLine(): this {
        if (this.line !== null) this.line++

        return this
    }
    throw(code: MccErrorCode): never {
        const path: IncludePathSegment[] = this.file === null
            ? []
            : [...this.path, [this.file, this.line]]

        throw new MccError(code, path)
    }
    read(): LexerToken {
        while (true) {
            if (this.available < 0.5) this.throw('unexpected-end-of-file')

            const token = this.tokens[this._current++]

            if (token.type !== 'line-break') return token
            if (token.content === '\n') {
                this.line++

                continue
            }

            const result = parseLineDefinition(this, token.content)
            this._lineDefinitionResults.push(result)
            this.path = result.path
            this.file = result.file
            this.line = result.line
        }
    }
    peek(): LexerToken {
        let offset = 0

        while (true) {
            if (this.available - offset < 0.5) this.throw('unexpected-end-of-file')

            const token = this.tokens[this._current + offset++]

            if (token.type !== 'line-break') return token
        }
    }
    skip(count?: number | null): this {
        count ??= 1

        while (true) {
            if (this.available < 0.5) this.throw('unexpected-end-of-file')

            const token = this.tokens[this._current++]

            if (token.type !== 'line-break') {
                if (--count < 0.5) return this

                continue
            }
            if (token.content === '\n') {
                this.line++

                continue
            }

            const result = parseLineDefinition(this, token.content)
            this._lineDefinitionResults.push(result)
            this.path = result.path
            this.file = result.file
            this.line = result.line
        }
    }
    rollback(count?: number | null): this {
        count ??= 1

        while (true) {
            const token = this.tokens[--this._current]

            if (token.type !== 'line-break') {
                if (--count < 0.5) return this

                continue
            }

            if (token.content === '\n') {
                this.line--

                continue
            }

            const result = this._lineDefinitionResults.pop()!
            this.path = result.path
            this.file = result.file
            this.line = result.line
        }
    }
    getCloseBracket<O extends OpenBracket>(bracket: O): BracketMap[O] {
        return bracket === '('
            ? ')'
            : bracket === '{'
                ? '}'
                : bracket === 'arg-open'
                    ? 'arg-close'
                    : 'loop-close' as any
    }
    pushBracket(bracket: OpenBracket): this {
        this._bracketStack.push(bracket)

        return this
    }
    popBracket(bracket: CloseBracket): this {
        const openBracket = this.peekBracket() ?? (() => {
            throw new Error('Bracket stack is empty.')
        })()
        const closeBracket = this.getCloseBracket(openBracket)

        if (bracket !== closeBracket) this.throw('invalid-bracket')

        this._bracketStack.pop()

        return this
    }
    peekBracket(): OpenBracket | undefined {
        return this._bracketStack[this._bracketStack.length - 1]
    }
    pushScope(): VariableScope {
        const scope: VariableScope = Object.create(this.variables)
        this._variables = scope

        return scope
    }
    popScope(): this {
        this._variables = Object.getPrototypeOf(this.variables)

        return this
    }
    declareFunction(declaration: Readonly<FunctionDeclaration>): this {
        const actualDeclaration = this._functionDeclarations.get(declaration.name)

        if (typeof actualDeclaration !== 'undefined') {
            if (!validateFunctionDeclarationCompatability(declaration, actualDeclaration))
                this.throw('incompatible-variable-declarations')
        }

        this._functionDeclarations.set(declaration.name, declaration)

        return this
    }
    defineFunction(definition: Readonly<FunctionDefinition>): this {
        if (this._functionDefinitions.has(definition.declaration.name))
            this.throw('function-already-defined')

        this.declareFunction(definition.declaration)
        this._functionDefinitions.set(definition.declaration.name, definition)

        return this
    }
    allocateStringLiteral(value: string): number {
        const index = this._stringLiterals.length
        this._stringLiterals.push(value)

        return index
    }
    declareGlobalVariable(declaration: Readonly<VariableDeclaration>): this {
        const actualDeclaration = this._globalVariableDeclarations.get(declaration.name)

        if (typeof actualDeclaration !== 'undefined') {
            if (!validateVariableDeclarationCompatability(declaration, actualDeclaration))
                this.throw('incompatible-variable-declarations')
        }

        this._globalVariableDeclarations.set(declaration.name, declaration)
        this._globalVariables[declaration.name] = {
            declaration,
            value: null
        }

        return this
    }
    defineGlobalVariable(definition: Readonly<VariableDefinition>): this {
        if (this._globalVariableDefinitions.has(definition.declaration.name))
            this.throw('variable-already-defined')

        this.declareGlobalVariable(definition.declaration)
        this._globalVariableDefinitions.set(definition.declaration.name, definition)
        this._globalVariables[definition.declaration.name] = {
            declaration: definition.declaration,
            value: definition.value
        }

        return this
    }
    enterLoop(): this {
        this._loopDepth++

        return this
    }
    leaveLoop(): this {
        this._loopDepth--

        return this
    }
}
export type BracketMap = {
    '(': ')',
    '{': '}',
    'arg-open': 'arg-close',
    'loop-open': 'loop-close'
}
export type OpenBracket = keyof BracketMap
export type CloseBracket = BracketMap[OpenBracket]
export type VariableScope = Record<string, Readonly<Variable>>
export type Variable = {
    declaration: Readonly<VariableDeclaration>
    value: Readonly<Value> | null
}

export type ReachingVariableScope = Record<string, ReachingVariable>
export type ReachingVariable = Variable & {
    reached: boolean
}

export function createReachingVariableScope(
    input: Readonly<VariableScope>,
    argCount?: number | null
): ReachingVariableScope {
    argCount ??= 0
    const output: ReachingVariableScope = {}
    let i = 0

    for (const name in input) {
        output[name] = {
            ...input[name],
            reached: i < argCount - 0.5
        }
        i++
    }

    return output
}
