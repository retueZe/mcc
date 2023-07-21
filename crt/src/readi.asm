bits	32
extern	_reads
global	_readi

section	.text

%define BUFSZ	32

_readi:
	push	ebp
	mov	ebp, esp
	sub	esp, BUFSZ

	push	BUFSZ
	lea	eax, [ebp - BUFSZ]
	push	eax
	call	_reads
	add	esp, 8

	lea	eax, [ebp - BUFSZ]
	push	eax
	call	_atoi
	add	esp, 4

	add	esp, BUFSZ
	pop	ebp
	ret

_atoi:
	push	ebp
	mov	ebp, esp
	push	ebx
	push	esi
	push	edi
	sub	esp, 4

	xor	esi, esi
	mov	[ebp - 4], esi
	mov	ebx, [ebp + 8]

	mov	al, [ebx]
	cmp	al, '-'
	jne	.if_1_end

	inc	esi
	mov	[ebp - 4], esi
.if_1_end:
	cmp	al, '+'
	jne	.if_2_end

	inc	esi
.if_2_end:
	xor	eax, eax
	mov	ecx, 10
.loop_1:
	xor	edx, edx
	mov	dl, [ebx + esi]
	cmp	dl, '0'
	jl	.loop_1_end
	cmp	dl, '9'
	jg	.loop_1_end

	sub	dl, '0'
	mov	edi, edx
	mul	ecx
	add	eax, edi

	inc	esi
	jmp	.loop_1
.loop_1_end:
	mov	edi, [ebp - 4]
	test	edi, edi
	jz	.if_3_end

	neg	eax
.if_3_end:
	add	esp, 4
	pop	edi
	pop	esi
	pop	ebx
	pop	ebp
	ret
