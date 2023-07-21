export class MccError extends Error {
    readonly path: readonly IncludePathSegment[]

    constructor(readonly code: MccErrorCode, path?: readonly IncludePathSegment[]) {
        super(MCC_ERROR_MESSAGES[code])
        this.name = MccError.name
        this.path = path ?? []
    }
}
export type IncludePathSegment = readonly [string, number]
export type MccErrorCode =
    | 'not-supported-preprocessor-directive'
    | 'bad-preprocessor-directive-input'
    | 'include-not-found'
    | 'invalid-operator'
    | 'unexpected-token'
    | 'unexpected-end-of-file'
    | 'unknown-base-type'
    | 'identifier-expected'
    | 'bad-number'
    | 'invalid-bracket'
    | 'operator-expected'
    | 'operand-expected'
    | 'unknown-identifier'
    | 'assigning-void'
    | 'args-expected'
    | 'invalid-escape-sequence'
    | 'incompatible-type-specifiers'
    | 'signed-integer-out-of-range'
    | 'explicit-cast-required'
    | 'arg-name-expected'
    | 'function-already-defined'
    | 'variable-already-defined'
    | 'incompatible-function-declarations'
    | 'incompatible-variable-declarations'
    | 'invalid-arg-count'
    | 'bad-line-definition-format'
    | 'break-outside-loop'
    | 'continue-outside-loop'

export const MCC_ERROR_MESSAGES: Readonly<Record<MccErrorCode, string>> = {
    'not-supported-preprocessor-directive': 'Not supported preprocessor directive.',
    'bad-preprocessor-directive-input': 'Bad preprocessor directive input.',
    'include-not-found': '#include path is not found.',
    'invalid-operator': 'Invalid operator.',
    'unexpected-token': 'Unexpected token.',
    'unexpected-end-of-file': 'Unexpected end of file.',
    'unknown-base-type': 'Unknown base type.',
    'identifier-expected': 'Identifier expected.',
    'bad-number': 'Bad number.',
    'invalid-bracket': 'Invalid bracket.',
    'operator-expected': 'Operator expected.',
    'operand-expected': 'Operand expected.',
    'unknown-identifier': 'Unknown identifier.',
    'assigning-void': 'Assigning void.',
    'args-expected': 'Function arguments expected.',
    'invalid-escape-sequence': 'Invalid escape sequence.',
    'incompatible-type-specifiers': 'Incompatible type specifiers.',
    'signed-integer-out-of-range': 'Signed integer value is out of range.',
    'explicit-cast-required': 'Explicit cast required.',
    'arg-name-expected': 'Argument name expected.',
    'function-already-defined': 'Function is already defined.',
    'variable-already-defined': 'Variable is already defined.',
    'incompatible-function-declarations': 'Incompatible function declarations.',
    'incompatible-variable-declarations': 'Incompatible variable declarations.',
    'invalid-arg-count': 'Invalid argument count.',
    'bad-line-definition-format': 'Bad line definition format.',
    'break-outside-loop': '"break" operator outside a loop.',
    'continue-outside-loop': '"continue" operator outside a loop.'
}
