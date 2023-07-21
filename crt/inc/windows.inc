%ifndef __WINDOWS_INC
%define __WINDOWS_INC

%define STD_INPUT_HANDLE    -10
%define STD_OUTPUT_HANDLE   -11

extern  _GetStdHandle
extern  _WriteConsoleA
extern  _ReadConsoleA

%endif ; guard
