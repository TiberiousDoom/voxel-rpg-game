# Contributing Guide

**Last Updated:** November 15, 2025

Thank you for contributing to the Voxel RPG Game! This guide covers both code and documentation contributions.

---

## Table of Contents

1. [Code Contributions](#code-contributions)
2. [Documentation Contributions](#documentation-contributions)
3. [Documentation Standards](#documentation-standards)
4. [File Organization](#file-organization)
5. [Review Process](#review-process)

---

## Code Contributions

### Getting Started

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Add tests** for new features
5. **Run tests**
   ```bash
   npm test
   ```
6. **Submit a Pull Request**

### Code Standards

- **ES6+** syntax throughout
- **JSDoc** comments for all public methods
- **DRY** principles (Don't Repeat Yourself)
- **Consistent naming** (see ARCHITECTURE.md)
- **No console.log** in production code
- **Error handling** for all async operations

### Testing Requirements

- Unit tests for new utilities (80%+ coverage)
- Integration tests for cross-module features
- Manual testing for UI changes
- Performance testing for optimization changes

---

## Documentation Contributions

### Documentation Philosophy

Our documentation follows these principles:

1. **Single Source of Truth** - Each topic has ONE authoritative document
2. **Clear Hierarchy** - Root docs are current, archives are historical
3. **Easy Navigation** - Clear indexes and cross-references
4. **Version Control** - All docs in git with clear commit messages
5. **Maintenance First** - Documentation must be maintainable long-term

### When to Create Documentation

| Situation | Action | Location |
|-----------|--------|----------|
| **New Feature** | Update existing docs first | Relevant root doc |
| **Architecture Change** | Update ARCHITECTURE.md | Root |
| **Status Change** | Update CURRENT_STATUS.md | Root |
| **New Formula/Pattern** | Update DEVELOPMENT_GUIDE.md | Root |
| **Investigation/Debug** | Create report in archive | documentation/history/ |
| **Phase Completion** | Create completion report | documentation/reports/phase-completions/ |
| **Major Audit** | Create audit report | documentation/reports/audits/ |

### Documentation Structure

We maintain **4 core documents** in the root:

```
Root Directory (CURRENT, AUTHORITATIVE)
├── README.md              - Project overview, quick start, gameplay
├── CURRENT_STATUS.md      - Project status, issues, roadmap
├── ARCHITECTURE.md        - System architecture, design patterns
├── DEVELOPMENT_GUIDE.md   - Implementation patterns, formulas
└── CONTRIBUTING.md        - This file
```

Everything else goes in the **archive**:

```
documentation/ (HISTORICAL, ARCHIVED)
├── planning/              - Project plans, timelines
├── reports/
│   ├── phase-completions/ - Phase completion reports
│   └── audits/            - Audit reports, investigations
├── history/               - Development notes, debugging
├── migration/             - Migration guides
└── README.md              - Archive index
```

---

## Documentation Standards

### File Naming

**Root Documents:**
- UPPERCASE with underscores: `CURRENT_STATUS.md`
- Descriptive, concise names
- No dates in filenames (use git history)

**Archive Documents:**
- UPPERCASE for reports: `PHASE_3_AUDIT_REPORT.md`
- Add dates for time-sensitive docs: `PHASE_3_COMPREHENSIVE_AUDIT_2025-11-13.md`
- Prefix phase reports: `PHASE_1_1_COMPLETE.md`
- Lowercase for notes: `development-notes.md`

### Document Structure

Every document should have:

```markdown
# Document Title

**Last Updated:** YYYY-MM-DD
**Status:** Active | Archived | Superseded
**Purpose:** Brief description

---

## Table of Contents

(For documents > 200 lines)

---

## Sections...

---

## Version History (Optional)

- v1.1 (Date) - Changes
- v1.0 (Date) - Initial version
```

### Markdown Standards

**Headers:**
```markdown
# H1 - Document Title (only one per document)
## H2 - Major Sections
### H3 - Subsections
#### H4 - Details (use sparingly)
```

**Code Blocks:**
```markdown
```javascript
// Always specify language
const example = 'code';
```
```

**Tables:**
```markdown
| Column 1 | Column 2 |
|----------|----------|
| Data     | Data     |
```

**Lists:**
```markdown
- Unordered list item
  - Nested item (2 spaces)

1. Ordered list item
2. Second item
```

**Links:**
```markdown
[Link Text](./relative/path.md)  - For internal links
[Link Text](https://example.com) - For external links
```

**Emphasis:**
```markdown
**Bold** for emphasis
*Italic* for slight emphasis
`code` for inline code
```

### Status Indicators

Use these emoji/badges consistently:

- ✅ Complete / Working / Good
- ⚠️ Warning / Partial / Needs Attention
- ❌ Broken / Not Started / Failed
- 🔴 Critical Issue
- ℹ️ Information / Note
- 🎯 Goal / Target
- 🚀 Future / Roadmap

---

## File Organization

### Adding to Root Documents

**✅ DO** update root docs when:
- Adding new features
- Changing architecture
- Updating project status
- Adding formulas or patterns
- Fixing issues

**❌ DON'T** create new root docs unless:
- Current docs exceed 2000 lines
- Topic is completely new category
- Discussed and approved by maintainers

### Adding to Archive

**Create new archive docs for:**

1. **Planning** (`documentation/planning/`)
   - Project timelines
   - Implementation plans
   - Phase plans
   - Testing checklists

2. **Phase Completions** (`documentation/reports/phase-completions/`)
   - Phase completion summaries
   - Feature summaries
   - Weekly summaries

3. **Audits** (`documentation/reports/audits/`)
   - Architecture audits
   - Phase audits
   - Comprehensive reviews
   - Critical fix reports

4. **History** (`documentation/history/`)
   - Development notes
   - Investigation reports
   - Debugging sessions
   - PR templates

5. **Migration** (`documentation/migration/`)
   - Migration guides
   - Upgrade instructions
   - Breaking change docs

### Updating Archive Index

When adding files to archive, **always update** `documentation/README.md`:

```markdown
## Section Name

| File | Description | Date |
|------|-------------|------|
| `NEW_FILE.md` | What it is | YYYY-MM-DD |
```

---

## Documentation Workflow

### 1. Before Creating a Document

**Ask yourself:**
- Does this info belong in an existing doc?
- Is this current info (root) or historical (archive)?
- Will this need frequent updates?
- Who is the audience?

**Decision Tree:**
```
Is this current, authoritative info?
├─ YES → Update root document
│   ├─ General info → README.md
│   ├─ Status/issues → CURRENT_STATUS.md
│   ├─ Architecture → ARCHITECTURE.md
│   └─ Patterns/formulas → DEVELOPMENT_GUIDE.md
│
└─ NO → Create archive document
    ├─ Planning → documentation/planning/
    ├─ Completion report → documentation/reports/phase-completions/
    ├─ Audit/review → documentation/reports/audits/
    ├─ Notes/debugging → documentation/history/
    └─ Migration → documentation/migration/
```

### 2. Creating a New Document

**Template:**
```markdown
# Document Title

**Last Updated:** YYYY-MM-DD
**Author:** Your Name (optional)
**Status:** Draft | Active | Archived
**Purpose:** One-sentence description

---

## Overview

Brief overview of the document's contents.

---

## Content Sections

...

---

## References

- [Related Doc](./path.md)
- [External Link](https://example.com)

---

**Document Created:** YYYY-MM-DD
**Version:** 1.0
```

**Save to:**
- Root if authoritative and current
- Appropriate archive subdirectory otherwise

### 3. Updating Existing Documents

**Small Updates:**
- Just update the content
- Update "Last Updated" date
- Commit with clear message

**Major Updates:**
- Consider if old version should be archived
- Update "Version History" section if present
- Update "Last Updated" date
- Commit with detailed message

**Superseding a Document:**
```markdown
# Old Document Title

**STATUS: SUPERSEDED**
**Superseded By:** [New Document](./new-doc.md)
**Date Superseded:** YYYY-MM-DD

This document is outdated. Please refer to [New Document](./new-doc.md) for current information.

---

[Original content preserved below for historical reference]
```

### 4. Deprecating a Document

When a document is no longer relevant:

**Option A: Move to Archive**
```bash
git mv OLD_DOC.md documentation/history/
```
Update archive index

**Option B: Add Deprecation Notice**
```markdown
# Document Title

**STATUS: DEPRECATED**
**Reason:** No longer applicable / Consolidated into X
**Date Deprecated:** YYYY-MM-DD

This document is deprecated. See [Alternative](./alternative.md).
```

**Option C: Delete (Rare)**
Only if:
- Document contains errors
- Never referenced
- Superseded by better doc
- Still available in git history

---

## Git Practices for Documentation

### Commit Messages

**Format:**
```
docs: Brief description

Longer explanation if needed:
- What changed
- Why it changed
- Impact on users
```

**Examples:**
```
docs: Add API documentation for EventSystem

docs: Update CURRENT_STATUS with Phase 3D completion

docs: Fix typo in DEVELOPMENT_GUIDE formula section

docs: Archive outdated Phase 2 audit reports
```

### Branching

**Documentation-only changes:**
```bash
git checkout -b docs/description
```

**Code + docs changes:**
```bash
git checkout -b feature/description
# (docs updates included in feature branch)
```

### Pull Requests

**Documentation PR Checklist:**
- [ ] Updated "Last Updated" date
- [ ] Added to archive index if archived
- [ ] Cross-references updated
- [ ] No broken links
- [ ] Spelling/grammar checked
- [ ] Follows markdown standards
- [ ] Clear commit messages

---

## Cross-Referencing

### Internal Links

**To Root Docs:**
```markdown
See [ARCHITECTURE.md](ARCHITECTURE.md) for details.
See [Development Guide](DEVELOPMENT_GUIDE.md#section-name) for implementation.
```

**To Archive Docs:**
```markdown
See [Phase 3 Audit](documentation/reports/audits/PHASE_3_COMPREHENSIVE_AUDIT_2025-11-13.md)
```

**From Archive to Root:**
```markdown
See [Current Status](../../CURRENT_STATUS.md) for latest info.
```

### External Links

```markdown
Built with [Create React App](https://create-react-app.dev/)
```

### Code References

Link to specific files/lines:
```markdown
See implementation in `src/core/GameEngine.js:42`
```

---

## Avoiding Documentation Sprawl

### Red Flags 🚩

Watch for these signs of poor documentation practices:

- ❌ Creating new docs instead of updating existing
- ❌ Multiple docs covering same topic
- ❌ Conflicting information across docs
- ❌ No clear "source of truth"
- ❌ Outdated docs not marked as such
- ❌ No navigation/index for archive
- ❌ Docs with dates in filenames piling up
- ❌ Duplicated content across docs

### Prevention Strategies ✅

- ✅ **Update first, create later** - Default to updating existing docs
- ✅ **Consolidate, don't proliferate** - Merge related docs when possible
- ✅ **Archive aggressively** - Move historical docs out of root
- ✅ **Maintain the index** - Keep `documentation/README.md` updated
- ✅ **Use version control** - Don't create `doc_v2.md`, just update and commit
- ✅ **Mark status** - Use status badges (Active, Archived, Superseded)
- ✅ **Review periodically** - Quarterly doc cleanup/consolidation

### Quarterly Maintenance

Every 3 months, review documentation:

1. **Root Docs** - Are they current? Any sections to split/merge?
2. **Archive** - Any docs to consolidate? Index up to date?
3. **Broken Links** - Run link checker
4. **Conflicts** - Any contradictory info across docs?
5. **Sizes** - Any docs getting too large (>2000 lines)?

---

## Review Process

### Documentation Reviews

All documentation changes go through PR review:

**Reviewers check for:**
- ✅ Accuracy of technical content
- ✅ Proper file organization (root vs archive)
- ✅ Markdown formatting
- ✅ Spelling and grammar
- ✅ Cross-references work
- ✅ Archive index updated (if applicable)
- ✅ No conflicting info with other docs
- ✅ Clear and concise writing

### Approval Criteria

Documentation PRs are approved when:
- Content is accurate
- Formatting is correct
- Placement is appropriate
- No broken links
- At least one approval from maintainer

---

## Examples

### Example 1: Adding a New Feature

**Scenario:** You implemented a new achievement system feature.

**Documentation Updates:**
1. Update `CURRENT_STATUS.md`:
   ```markdown
   ## Phase 3C: Achievement System ✅

   **New Feature (v1.1):**
   - ✅ Achievement categories now support custom icons
   ```

2. Update `DEVELOPMENT_GUIDE.md`:
   ```markdown
   ### Adding Custom Achievement Icons

   When defining achievements, you can now add custom icons:
   ```javascript
   achievement: {
     icon: 'custom-icon-name.png',
     // ...
   }
   ```
   ```

3. Update `README.md` if user-facing:
   ```markdown
   - **Achievements** - Unlock 50 achievements with custom icons
   ```

4. **Don't** create `ACHIEVEMENT_ICONS_GUIDE.md` - consolidate into existing docs

### Example 2: Completing a Major Audit

**Scenario:** You completed a comprehensive security audit.

**Documentation Updates:**
1. Create audit report:
   ```
   documentation/reports/audits/SECURITY_AUDIT_2025-11-15.md
   ```

2. Update archive index (`documentation/README.md`):
   ```markdown
   | `SECURITY_AUDIT_2025-11-15.md` | Security audit | Nov 15, 2025 |
   ```

3. Update `CURRENT_STATUS.md` with findings:
   ```markdown
   ### Security Status

   Last audit: November 15, 2025
   - See [Security Audit](documentation/reports/audits/SECURITY_AUDIT_2025-11-15.md)
   - Critical issues: 0
   - Medium issues: 2 (tracked in GitHub Issues #123, #124)
   ```

### Example 3: Fixing a Bug

**Scenario:** You fixed a resource calculation bug.

**Documentation Updates:**
1. Update `DEVELOPMENT_GUIDE.md` if formula changed:
   ```markdown
   ### Resource Production (Updated Nov 15, 2025)

   **Fixed:** Production multiplier now correctly caps at 2.0x
   ```

2. Update `CURRENT_STATUS.md` to remove from known issues:
   ```markdown
   ~~- Resource overflow calculation bug (Fixed: v1.0.1)~~
   ```

3. **Don't** create `BUG_FIX_REPORT.md` - just commit with good message

### Example 4: Planning a New Phase

**Scenario:** Planning Phase 4 implementation.

**Documentation Updates:**
1. Create plan:
   ```
   documentation/planning/PHASE_4_IMPLEMENTATION_PLAN.md
   ```

2. Update archive index

3. Update `CURRENT_STATUS.md` roadmap:
   ```markdown
   ### Long Term (3+ months)

   **Phase 4: Advanced AI** (Planned)
   - See [Phase 4 Plan](documentation/planning/PHASE_4_IMPLEMENTATION_PLAN.md)
   ```

---

## Tools & Automation

### Recommended Tools

**Markdown Linting:**
```bash
npm install -g markdownlint-cli
markdownlint '**/*.md'
```

**Link Checking:**
```bash
npm install -g markdown-link-check
markdown-link-check README.md
```

**Spell Checking:**
Use your editor's spell checker or:
```bash
npm install -g spellchecker-cli
spellchecker '**/*.md'
```

### Pre-commit Hooks (Optional)

```bash
# .git/hooks/pre-commit
#!/bin/bash
# Check for broken links in staged .md files
git diff --cached --name-only | grep -E '\.md$' | xargs -I{} markdown-link-check {}
```

---

## Questions?

**Before creating documentation:**
- Check existing docs thoroughly
- Read this guide
- Ask in GitHub Discussions

**Need help organizing docs?**
- Refer to "Decision Tree" above
- Look at existing examples
- Ask maintainers for guidance

**Found conflicting docs?**
- Report as GitHub Issue
- Tag with "documentation"
- Suggest consolidation approach

---

## Quick Reference

**Root Docs** (4 files - current, authoritative):
- `README.md` - Overview, quick start, gameplay
- `CURRENT_STATUS.md` - Status, issues, roadmap
- `ARCHITECTURE.md` - Architecture, design patterns
- `DEVELOPMENT_GUIDE.md` - Patterns, formulas, balance

**Archive** (`documentation/` - historical):
- `planning/` - Plans, timelines
- `reports/phase-completions/` - Phase completions
- `reports/audits/` - Audits, reviews
- `history/` - Notes, investigations
- `migration/` - Migration guides
- `README.md` - Archive index

**Default Action:**
1. Update existing root doc
2. If historical, create in archive
3. Update archive index
4. Commit with clear message
5. Submit PR

---

**Version:** 1.0
**Last Updated:** November 15, 2025
**Maintained By:** Project maintainers

For code contribution guidelines, see the "Code Contributions" section above.
For questions, open a GitHub Discussion or Issue.
