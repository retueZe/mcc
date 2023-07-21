%include "windows.inc"

bits	32
extern	_strlen
global	_puts

section .rdata
NEWLINE		db	0xa

section	.text
_puts:
	push	ebp
	mov	ebp, esp
	sub	esp, 12

	mov	eax, [ebp + 8]
	push	eax
	call	_strlen
	add	esp, 4
	mov	[ebp - 8], eax

	push	STD_OUTPUT_HANDLE
	call	_GetStdHandle
	mov	[ebp - 12], eax
	push	0
	lea	eax, [ebp - 4]
	push	eax
	mov	eax, [ebp - 8]
	push	eax
	mov	eax, [ebp + 8]
	push	eax
	mov	eax, [ebp - 12]
	push	eax
	call	_WriteConsoleA

	push	0
	lea	eax, [ebp - 4]
	push	eax
	mov	eax, 1
	push	eax
	mov	eax, NEWLINE
	push	eax
	mov	eax, [ebp - 12]
	push	eax
	call	_WriteConsoleA

	add	esp, 12
	pop	ebp
	ret
