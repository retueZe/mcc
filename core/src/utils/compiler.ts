export function getSizeLetter(size: number): string {
    if (size > 7.5) return 'q'
    if (size > 3.5) return 'd'
    if (size > 1.5) return 'w'

    return 'b'
}
export function getRegisterLetter(size: number): string {
    if (size > 7.5) return 'r'
    if (size > 3.5) return 'e'

    return ''
}
export function getRegisterName(size: number, letter: string): string {
    if (size > 7.5) return `r${letter}x`
    if (size > 3.5) return `e${letter}x`
    if (size > 1.5) return `${letter}x`

    return `${letter}l`
}
export function extractRegisterLetter(register: string): string {
    return (/[abcd]/.exec(register) ?? [])[0] ?? ''
}
export function decorateFunctionName(name: string): string {
    return '_' + name
}
export function getSizeName(size: number): string {
    if (size > 7.5) return 'qword'
    if (size > 3.5) return 'dword'
    if (size > 1.5) return 'word'

    return 'byte'
}
