import type { ValueTypeSize } from './parser'
import { compileOutside } from './compilers'

export const compile = compileOutside

export class CompilerContext {
    private readonly _lines: string[] = []
    private readonly _labels: string[] = []
    private readonly _forwardLabels: string[] = []
    private _indexedLabelCount = 0
    private _bodyContext: BodyCompilerContext | null = null
    get lines(): readonly string[] {
        return this._lines
    }
    get labels(): readonly string[] {
        return this._labels
    }
    get bodyContext(): BodyCompilerContext | null {
        if (this._bodyContext === null) throw new Error('STUB')

        return this._bodyContext
    }

    constructor(readonly pointerSize: ValueTypeSize, readonly stringLiterals: readonly string[]) {}

    push(lines: readonly string[], aligned?: boolean | null): this {
        aligned ??= true

        if (aligned) lines = lines.map(line => '\t' + line)

        this._lines.push(...lines)

        return this
    }
    pushLabel(symbolName?: string | null): string {
        const labelName = symbolName ?? `.L${this._indexedLabelCount++}`
        this._labels.push(labelName)
        this._lines.push(`${labelName}:`)

        return labelName
    }
    declareForwardLabel(symbolName?: string | null): string {
        const labelName = symbolName ?? `.L${this._indexedLabelCount++}`
        this._forwardLabels.push(labelName)

        return labelName
    }
    pushForwardLabel(): string {
        const labelName = this._forwardLabels.pop()

        if (typeof labelName === 'undefined') throw new Error('STUB')

        this._lines.push(`${labelName}:`)

        return labelName
    }
    pushBodyContext(variableAddresses: Readonly<Record<string, string>>, allocated: number): BodyCompilerContext {
        const context: BodyCompilerContext = Object.create(this._bodyContext)
        context.variableAddresses = Object.create(this._bodyContext?.variableAddresses ?? null),
        Object.assign(context.variableAddresses, variableAddresses)
        context.allocated = (this._bodyContext?.allocated ?? 0) + allocated
        this._bodyContext = context

        return context
    }
    popBodyContext(): this {
        this._bodyContext = Object.getPrototypeOf(this._bodyContext)

        return this
    }
}

export type BodyCompilerContext = {
    variableAddresses: Readonly<Record<string, string>>
    allocated: number
    returnLabel: string
    breakLabel: string | null
    continueLabel: string | null
    loopAllocated: number | null
}
