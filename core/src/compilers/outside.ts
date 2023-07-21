import { ReadonlySyntaxTree } from '../parser'
import { compileFunction, compileInitializedVariable, compileUninitializedVariable } from '../compilers'
import { CompilerContext } from '../compiler'
import { decorateFunctionName } from '../utils/compiler'

export function compileOutside(context: CompilerContext, tree: ReadonlySyntaxTree): string {
    context.push([
        'bits\t32',
        'section\t.rdata'
    ], false)

    let i = 0

    for (const literal of context.stringLiterals) {
        context.pushLabel(makeStringLiteralLabelName(i))
        context.push([`db\t"${literal}", 0`])

        i++
    }

    context.push(['section\t.bss'], false)

    const dataNames = new Set<string>()
    const bssNames = new Set<string>()

    for (const node of tree)
        if (node.type === 'variable-declaration') {
            dataNames.add(node.name)
            bssNames.add(node.name)
        } else if (node.type === 'variable-definition') {
            dataNames.add(node.declaration.name)
            bssNames.delete(node.declaration.name)
        }
    for (const node of tree) {
        if (node.type !== 'variable-declaration') continue
        if (!bssNames.has(node.name)) continue

        compileUninitializedVariable(context, node)
    }

    context.push(['section\t.data'], false)

    for (const node of tree) {
        if (node.type !== 'variable-definition') continue

        compileInitializedVariable(context, node)
    }

    context.push(['section\t.text'], false)

    const toDefine = new Set<string>()

    for (const node of tree)
        if (node.type === 'function-definition')
            toDefine.add(node.declaration.name)
    for (const node of tree) {
        if (node.type !== 'function-declaration') continue

        if (toDefine.has(node.name)) continue

        const decoratedName = decorateFunctionName(node.name)

        context.push([`extern\t${decoratedName}`])
    }
    for (const node of tree) {
        if (node.type !== 'function-definition') continue

        const decoratedName = decorateFunctionName(node.declaration.name)

        context.push([`global\t${decoratedName}`])
        compileFunction(context, node)
    }

    return context.lines.join('\n')
}
export function makeStringLiteralLabelName(index: number): string {
    return '__S' + index
}
