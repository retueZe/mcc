import { IncludePathSegment, MccError } from './MccError'
import { isAlnum, isAlpha, isNumber, isSpace } from './utils'

export type LexerTokenType =
    | 'identifier'
    | 'keyword'
    | 'number'
    | 'operator'
    | 'string'
    | 'line-break'
export type LexerToken = {
    type: LexerTokenType
    content: string
}
export type LexerOptions = Partial<{
    file: string | null
    keywords: ReadonlySet<string>
    operatorMap: readonly ReadonlySet<string>[]
    quotes: ReadonlyMap<string, string>
}>
type LexerState =
    | 'space'
    | 'alnum'
    | 'number'
    | 'separator'
    | 'string'
    | 'line-break'

export function lex(input: string, options?: Readonly<LexerOptions>): Readonly<LexerToken>[] {
    input += '\n'
    const tokens: Readonly<LexerToken>[] = []
    let path: readonly IncludePathSegment[] = []
    let file = options?.file ?? DEFAULT_LEXER_OPTIONS.file
    const keywords = options?.keywords ?? DEFAULT_LEXER_OPTIONS.keywords
    const operatorMap = options?.operatorMap ?? DEFAULT_LEXER_OPTIONS.operatorMap
    const quotes = options?.quotes ?? DEFAULT_LEXER_OPTIONS.quotes
    let state: LexerState = 'space'
    let i = 0
    let start = 0
    let line = 1

    for (const char of input) {
        if (state === 'line-break') {
            if (char !== '\n') {
                i++

                continue
            }

            tokens.push({content: input.slice(start, ++i), type: 'line-break'})
            state = 'space'

            continue
        }
        if (char === '\n') {
            tokens.push({content: '\n', type: 'line-break'})
            line++
        }

        switch (state) {
            case 'space':
                if (isSpace(char)) break

                start = i

                if (isAlpha(char))
                    state = 'alnum'
                else if (isNumber(char))
                    state = 'number'
                else if (quotes.has(char))
                    state = 'string'
                else if (char === '#') {
                    start = i
                    state = 'line-break'
                } else
                    state = 'separator'

                break
            case 'alnum': {
                if (isAlnum(char)) break

                const token = input.slice(start, i)
                const tokenType: LexerTokenType = keywords.has(token)
                    ? 'keyword'
                    : 'identifier'

                tokens.push({content: token, type: tokenType})

                if (isSpace(char))
                    state = 'space'
                else if (quotes.has(char))
                    state = 'string'
                else
                    state = 'separator'

                start = i

                break
            } case 'number': {
                if (isAlnum(char)) break

                const token = input.slice(start, i)

                tokens.push({content: token, type: 'number'})

                if (isSpace(char))
                    state = 'space'
                else if (quotes.has(char))
                    state = 'string'
                else
                    state = 'separator'

                start = i

                break
            } case 'separator': {
                if (isSpace(char))
                    state = 'space'
                else if (isAlpha(char))
                    state = 'alnum'
                else if (isNumber(char)) {
                    state = 'number'

                    const prefix = input.slice(start, i)
                    if (prefix === '+' || prefix === '-')
                        break
                } else if (quotes.has(char))
                    state = 'string'
                else
                    break

                const token = input.slice(start, i)
                start = i
                lexOperators(tokens, token, operatorMap, path, file, line)

                break
            } case 'string': {
                const openQuote = input[start]
                const closeQuote = quotes.get(openQuote)!

                if (char !== closeQuote) break

                const token = input.slice(start, i + 1)
                tokens.push({content: token, type: 'string'})
                state = 'space'

                break
            }
        }

        i++
    }

    while (tokens[tokens.length - 1].type === 'line-break') tokens.pop()

    return tokens
}
function lexOperators(
    tokens: LexerToken[],
    input: string,
    map: readonly ReadonlySet<string>[],
    path: readonly IncludePathSegment[],
    file: string | null,
    line: number
): void {
    let start = 0

    while (input.length - start > 0.5) {
        const startingOperatorLength = Math.min(input.length - start, map.length)
        let operator = input.slice(start, start + startingOperatorLength)
        let operatorLength: number

        for (operatorLength = startingOperatorLength; operatorLength > 0.5; operatorLength--,
            operator = operator.slice(0, operator.length - 1)
        ) {
            const operators = map[operatorLength - 1]

            if (!operators.has(operator)) continue

            tokens.push({content: operator, type: 'operator'})
            start += operatorLength

            break
        }

        if (operatorLength < 0.5) throw new MccError('invalid-operator', file === null ? [] : [
            ...path,
            [file, line]
        ])
    }
}

export function createLexerOptions(file?: string | null): Required<LexerOptions> {
    return {
        file: file ?? null,
        keywords: new Set([
            'int', 'short', 'long', 'unsigned', 'signed', 'char',
            'return', 'void',
            'if', 'while', 'else', 'break', 'continue'
        ]),
        operatorMap: [
            new Set('(){};.,+-*/%=<>&|^'),
            new Set(['++', '--', '==', '!=', '>=', '<='])
        ],
        quotes: new Map([
            ['\'', '\''],
            ['"', '"']
        ])
    }
}
export const DEFAULT_LEXER_OPTIONS = createLexerOptions()
