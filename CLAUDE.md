# Project Rules

## Discovery order — always follow this
1. get_minimal_context(task="description") from code-review-graph FIRST
2. qmd_vsearch / qmd_search within those files
3. Read tool ONLY on specifically identified files. Never read speculatively.

## Superpowers rule
Before writing code for any non-trivial task:
- superpowers:brainstorm to refine requirements
- superpowers:write-plan to produce microtasks (2-5 min, exact paths)
Skip for trivial single-line edits.

## Context management
At 50% context run /compact:
"Preserve: phase name, pending tasks, modified files, last 3 decisions.
Discard: exploration details, read-but-unmodified content, passed test output."

## Workflow — at every session start:
1. Load ~/.claude/agent-memory/preferences.md if exists
2. Load ~/.claude/agent-memory/instincts.md if exists
3. Load .claude/project-preferences.md if exists
4. Read project-state.md
Apply all silently. Update project-state.md after every task.
At ## MILESTONE: use AskUserQuestion before continuing.

## Coding standards
- superpowers:tdd for every new function
- npm test before marking any task complete
- No console.log in committed code

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
