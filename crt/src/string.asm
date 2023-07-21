bits	32

global	_strlen

section	.text

_strlen:
	push	ebp
	mov	ebp, esp

	mov	edx, [ebp + 8]
	xor	eax, eax
.loop_1:
	mov	cl, [edx + eax]
	test	cl, cl
	jz	.loop_1_end
	inc	eax
	jmp	.loop_1
.loop_1_end:
	pop	ebp
	ret
