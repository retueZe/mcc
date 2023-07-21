bits	32
extern	_puts
global	_puti

section	.text

_puti:
	push	ebp
	mov	ebp, esp
	sub	esp, 16

	mov	eax, [ebp + 8]
	push	eax
	mov	eax, esp
	add	eax, 4
	push	eax
	call	_itoa
	add	esp, 8
	push	esp
	call	_puts
	add	esp, 4

	add	esp, 16
	pop	ebp
	ret

_itoa:
	push	ebp
	mov	ebp, esp
	push	ebx
	push	esi
	push	edi
	mov	ebx, [ebp + 8]
	mov	eax, [ebp + 12]
	; ESI indicates prefix length
	xor	esi, esi
	xor	edi, edi

	test	eax, eax
	jns	.if_1_end

	mov	ecx, '-'
	mov	[ebx], ecx
	inc	esi
	inc	edi
	neg	eax
.if_1_end:
	mov	ecx, 10
.loop_1:
	test	eax, eax
	jz	.loop_1_end

	xor	edx, edx
	div	ecx
	add	dl, '0'
	mov	[ebx + edi], dl
	inc	edi

	jmp	.loop_1
.loop_1_end:
	cmp	esi, edi
	jnz	.if_2_end

	mov	al, '0'
	mov	[ebx + edi], al
	inc	edi
.if_2_end:
	xor	ecx, ecx
	mov	[ebx + edi], ecx
	mov	ecx, edi
	dec	edi
	; now ESI points to the first written digit, and EDI points to the last written
.loop_2:
	cmp	esi, edi
	jge	.loop_2_end

	mov	al, [ebx + esi]
	mov	ah, [ebx + edi]
	mov	[ebx + esi], ah
	mov	[ebx + edi], al

	inc	esi
	dec	edi
	jmp	.loop_2
.loop_2_end:
	mov	eax, ecx
	pop	edi
	pop	esi
	pop	ebx
	pop	ebp
	ret
