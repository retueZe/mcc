import { existsSync, readFileSync } from 'fs'
import { IncludePathSegment, MccError } from './MccError'
import { join, dirname } from 'path'

export type PreprocessorOptions = Partial<{
    includeDirectories: readonly string[]
    systemIncludeDirectory: string
    defines: DefinePair[]
    path: IncludePathSegment[]
    file: string | null
    line: number
}>
export type DefinePair = readonly [string, string]
export type PreprocessorDirectiveName =
    | 'include'
    | 'define'
    | 'undef'
    | 'pragma'
type PreprocessorDirectiveCompiler = (
    values: Record<string | number, string>,
    options: Required<PreprocessorOptions>
) => Partial<PreprocessorDirectiveCompilerOutput>
type PreprocessorDirectiveCompilerOutput = {
    insertion: string
    addedDefines: readonly DefinePair[]
    removedDefines: readonly string[]
}
type PreprocessorDirectiveCompilerMap = Record<PreprocessorDirectiveName, Readonly<{
    pattern: RegExp
    compiler: PreprocessorDirectiveCompiler
}>>

function findHeader(path: string, directories: readonly string[]): string | null {
    const currentDirectory = dirname(path)

    for (const directory of [currentDirectory, ...directories]) {
        const joinedPath = join(directory, path)

        if (existsSync(joinedPath)) return joinedPath
    }

    return null
}

const includeCompiler: PreprocessorDirectiveCompiler = ({path}, options) => {
    const headerPath = findHeader(path.slice(1, path.length - 1), path.startsWith('"')
        ? [...options.includeDirectories]
        : [options.systemIncludeDirectory])

    if (headerPath === null) throw new MccError('include-not-found', options.path)

    let prefix = ''
    let postfix = ''

    if (options.file !== null) {
        options.path.push([options.file, options.line])
        options.path.push([headerPath, 1])
        prefix = formatIncludePath(options.path)
        options.path.pop()
        postfix = formatIncludePath(options.path)
    }

    const included = preprocess(readFileSync(headerPath, {encoding: 'utf-8'}), {
        ...options,
        file: options.file === null ? null : headerPath,
        line: 1
    })

    if (options.file !== null) options.path.pop()

    return {
        insertion: prefix + included + postfix
    }
}
const defineCompiler: PreprocessorDirectiveCompiler = ({name, value}) => {
    value ??= ''

    return {
        addedDefines: [[name, value]]
    }
}
const undefCompiler: PreprocessorDirectiveCompiler = ({name}) => {
    return {
        removedDefines: [name]
    }
}
const pragmaCompiler: PreprocessorDirectiveCompiler = () => {
    return {}
}
const DIRECTIVE_COMPILERS: Readonly<PreprocessorDirectiveCompilerMap> = {
    'include': {
        pattern: /^(?<path>[<"][^>"]*[>"])\s*$/,
        compiler: includeCompiler
    },
    'define': {
        pattern: /^(?<name>[a-zA-Z_][a-zA-Z\d_]*)\s*(?<value>\S.*)?$/,
        compiler: defineCompiler
    },
    'undef': {
        pattern: /^(?<name>[a-zA-Z_][a-zA-Z\d_]*)\s*$/,
        compiler: undefCompiler
    },
    'pragma': {
        pattern: /.*/,
        compiler: pragmaCompiler
    }
}
const DIRECTIVE_PATTERN = /^\s*#\s*(?<name>[a-z_]+)\s*/

export function preprocess(source: string, options?: Readonly<PreprocessorOptions> | null): string {
    const lines = source.split('\n')
    const defines = options?.defines ?? []
    const normalizedOptions: Required<PreprocessorOptions> = {
        includeDirectories: options?.includeDirectories ?? [],
        systemIncludeDirectory: options?.systemIncludeDirectory ?? '.',
        defines,
        path: options?.path ?? [],
        file: options?.file ?? null,
        line: options?.line ?? 1
    }

    for (let lineNo = 1; lineNo - 1 < lines.length - 0.5; lineNo++) {
        const lineIndex = lineNo - 1
        lines[lineIndex] = lines[lineIndex].replace(/\s*\/\/.*/, '')
        let line = lines[lineIndex]
        let match = DIRECTIVE_PATTERN.exec(line)

        if (match === null) continue

        const directiveName = match.groups!.name
        const info = DIRECTIVE_COMPILERS[directiveName as PreprocessorDirectiveName]

        if (typeof info === 'undefined') throw new MccError(
            'not-supported-preprocessor-directive',
            normalizedOptions.path)

        line = line.slice(match[0].length)
        const {pattern, compiler} = info
        match = pattern.exec(line)

        if (match === null) throw new MccError(
            'bad-preprocessor-directive-input',
            normalizedOptions.path)

        normalizedOptions.line = lineNo
        const compilerResult = compiler(match.groups ?? {}, normalizedOptions)

        lines[lineIndex] = compilerResult.insertion ?? ''

        for (const nameToRemove of compilerResult.removedDefines ?? []) {
            const index = defines.findIndex(([name]) => name === nameToRemove)

            if (index < -0.5) continue

            defines.splice(index, 1)
        }
        defines.push(...compilerResult.addedDefines ?? [])
    }

    return insertDefines(lines.join('\n'), defines)
}
function insertDefines(input: string, defines: DefinePair[]): string {
    for (let i = 0; i < defines.length - 0.5; i++) {
        let [name, value] = defines[i]

        for (let j = 0; j < i - 0.5; j++) {
            const [level2Name, level2Value] = defines[j]

            value = value.replace(new RegExp(`\\b${level2Name}\\b`, 'g'), level2Value)
        }

        defines[i] = [name, value]
    }
    for (let i = 0; i < defines.length - 0.5; i++) {
        const [name, value] = defines[i]

        input = input.replace(new RegExp(`\\b${name}\\b`, 'g'), value)
    }

    return input
}
function formatIncludePath(path: readonly IncludePathSegment[]): string {
    const chunks: string[] = ['#']

    for (const segment of path) {
        const [file, line] = segment

        chunks.push(' "')
        chunks.push(file)
        chunks.push('" ')
        chunks.push(line.toString())
    }

    chunks.push('\n')

    return chunks.join('')
}
