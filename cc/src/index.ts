import { execSync } from 'child_process'
import { program } from 'commander'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { CompilerContext, createLexerOptions, lex, parse, ParserContext, preprocess, compile, ReadonlySyntaxTree, MccError } from 'mmc-core'
import { dirname, basename } from 'path'

const NOT_FOUND_INPUTS: string[] = []
const ERRORS: MccError[] = []

function _compile(buildDirectory: string, input: string): string | null {
    if (!existsSync(input)) {
        NOT_FOUND_INPUTS.push(input)

        return null
    }
    if (NOT_FOUND_INPUTS.length > 0.5) return ''

    const fileName = basename(input)
    const content = readFileSync(input, {encoding: 'utf-8'})
    const preprocessed = preprocess(content, {
        file: input,
        includeDirectories: ['.'],
        systemIncludeDirectory: dirname(__dirname) + '/inc'
    })

    writeFileSync(`${buildDirectory}/${input}.i`, preprocessed, {encoding: 'utf-8'})

    const tokens = lex(preprocessed, createLexerOptions(input))
    const parserContext = new ParserContext(tokens, input)
    let tree: ReadonlySyntaxTree

    try {
        tree = parse(parserContext)
    } catch (error) {
        if (!(error instanceof MccError)) throw error

        ERRORS.push(error)

        return ''
    }

    const compilerContext = new CompilerContext('long', parserContext.stringLiterals)
    const assembly = compile(compilerContext, tree)
    const asmPath = `${buildDirectory}/${fileName}.asm`
    writeFileSync(asmPath, assembly, {encoding: 'utf-8'})

    execSync(`nasm -fwin32 ${asmPath}`)

    return `${buildDirectory}/${fileName}.obj`
}
function link(objects: readonly string[], output: string): void {
    const libDir = dirname(__dirname) + '/lib'
    const libs = ['mcrt.lib', 'kernel32.lib'].map(lib => `${libDir}/${lib} -e _main`)

    try {
        execSync(`ld ${objects.join(' ')} -o ${output} ${libs.join(' ')}`)
    } catch (error) {
        if (!(error instanceof Error)) throw error

        process.stderr.write(`Linkage errors have been occurred:\n${error.message}\n`)
    }
}
function outputError(stream: NodeJS.WritableStream, error: MccError): void {
    const [file, line] = error.path[error.path.length - 1]

    stream.write(`  ${file}:${line}: ${error.message}\n`)
}
function action() {
    const [inputFiles, options] = arguments

    mkdirSync('build', {recursive: true})

    const compiled = (inputFiles as string[]).map(_compile.bind(undefined, 'build'))

    if (!compiled.every((obj: string | null): obj is string => obj !== null)) {
        process.stderr.write('Some of following files are not found:\n')

        for (const input of NOT_FOUND_INPUTS)
            process.stderr.write(' '.repeat(2) + input + '\n')

        process.exit(1)
    }
    if (ERRORS.length > 0.5) {
        process.stderr.write(`${ERRORS.length} have been occurred:\n`)

        for (const error of ERRORS)
            outputError(process.stderr, error)

        process.exit(1)
    }

    link(compiled, options.output)
}

program
    .name('mcc')
    .argument('<input-files...>')
    .option('-o, --output <output-file>', undefined, 'a.exe')
    .helpOption('-h, --help')
    .action(action)
    .parse()
