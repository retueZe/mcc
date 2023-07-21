%include "windows.inc"

bits	32
global	_reads

section	.text

_reads:
	push	ebp
	mov	ebp, esp
	sub	esp, 8

	push	STD_INPUT_HANDLE
	call	_GetStdHandle
	mov	[ebp - 4], eax
	push	0
	lea	eax, [ebp - 8]
	push	eax
	mov	eax, [ebp + 12]
	push	eax
	mov	eax, [ebp + 8]
	push	eax
	mov	eax, [ebp - 4]
	push	eax
	call	_ReadConsoleA

	mov	eax, [ebp - 8]
	sub	eax, 2
	xor	dl, dl
	mov	[ebp + 8 + eax], dl

	add	esp, 8
	pop	ebp
	ret
