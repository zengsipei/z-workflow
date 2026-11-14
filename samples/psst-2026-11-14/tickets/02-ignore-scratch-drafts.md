# 02: Ignore local draft specs and tickets

**What to build:** the repo ignores `.scratch/`, the directory the workflow keeps draft specs and tickets in, so a drafted spec never shows up as an untracked file.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `.gitignore` carries a `.scratch/` entry with the same comment style as its neighbours.
- [ ] `git status --short` shows nothing for a `.scratch/` tree that exists.
