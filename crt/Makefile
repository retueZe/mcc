SRCDIR ?= src
BUILDDIR ?= build

PROJNAME ?= mcrt.lib

IMPLIBS ?= kernel32
IMPLIBS := $(IMPLIBS:%=%.lib)

TARGETS := $(PROJNAME) $(IMPLIBS)

ASMINCDIRS ?= inc
ASMFLAGS ?= -fwin32
ASMFLAGS += $(ASMINCDIRS:%=-I%)
ASMSRCS := $(patsubst $(SRCDIR)/%,%,$(wildcard $(SRCDIR)/*.asm))
ASMOBJS := $(ASMSRCS:%=%.obj)

DEFSRCS := $(patsubst shared/%,%,$(wildcard shared/*.def))
LIBS := $(DEFSRCS:%.def=%.lib)

.SUFFIXES:
.PHONY: *

all: $(BUILDDIR) $(TARGETS)
clean:
	rm -rf $(BUILDDIR)

$(BUILDDIR):
	mkdir -p $(BUILDDIR)

$(PROJNAME): $(ASMOBJS) $(LIBS)
	ar crs $(BUILDDIR)/$(PROJNAME) $(ASMOBJS:%=$(BUILDDIR)/%)

$(ASMOBJS):
	nasm $(SRCDIR)/$(@:%.obj=%) -o $(BUILDDIR)/$@ $(ASMFLAGS)

$(IMPLIBS):
	dlltool -d shared/$(@:%.lib=%).def -l $(BUILDDIR)/$@
