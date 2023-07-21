import type { IntegerSignness, ParserContext, ValueBaseType, ValueType, ValueTypeSize } from '../parser'
import { validateTypeSpecifiers } from '../utils/parser'

export function parseValueType(context: ParserContext): ValueType {
    let signness: IntegerSignness | null = null
    let size: ValueTypeSize | null = null
    let baseType: ValueBaseType | null = null
    let pointerCount = 0

    {
        const {content} = context.read()

        switch (content) {
            case 'signed': signness = 'signed'; break
            case 'unsigned': signness = 'unsigned'; break
            default: context.rollback(); break
        }
    } {
        const {content} = context.read()

        switch (content) {
            case 'long': {
                const {content} = context.read()

                switch (content) {
                    case 'long': size = 'long-long'; break
                    default: size = 'long'; context.rollback(); break
                }

                break
            } case 'short': size = 'short'; break
            default: context.rollback(); break
        }
    } {
        const {content} = context.read()

        switch (content) {
            case 'int': baseType = 'int'; break
            case 'char': baseType = 'char'; break
            default:
                context.rollback()

                if (signness !== null || size !== null) baseType = 'int'

                break
        }
    }

    if (baseType === null) context.throw('unknown-base-type')

    while (true) {
        const {content} = context.peek()

        if (content !== '*') break

        context.skip()
        pointerCount++
    }

    const type: ValueType = {
        baseType,
        signness,
        size,
        extensions: Array.from({length: pointerCount}, () => ({type: 'pointer'}))
    }
    validateTypeSpecifiers(context, type)

    return type
}
export function validateValueType(context: ParserContext): boolean {
    let signness: IntegerSignness | null = null
    let size: ValueTypeSize | null = null
    let baseType: ValueBaseType | null = null

    {
        const {content} = context.read()

        switch (content) {
            case 'signed': signness = 'signed'; break
            case 'unsigned': signness = 'unsigned'; break
            default: context.rollback(); break
        }
    } {
        const {content} = context.read()

        switch (content) {
            case 'long': {
                const {content} = context.read()

                switch (content) {
                    case 'long': size = 'long-long'; break
                    default: size = 'long'; context.rollback(); break
                }

                break
            } case 'short': size = 'short'; break
            default: context.rollback(); break
        }
    } {
        const {content} = context.peek()

        switch (content) {
            case 'int': baseType = 'int'; context.skip(); break
            case 'char': baseType = 'char'; context.skip(); break
            default:
                if (signness !== null || size !== null) baseType = 'int'

                break
        }
    }

    let rollbackCount = 0

    if (signness !== null) rollbackCount++
    if (size !== null) rollbackCount += size === 'long-long' ? 2 : 1

    context.rollback(rollbackCount)

    return baseType !== null
}
