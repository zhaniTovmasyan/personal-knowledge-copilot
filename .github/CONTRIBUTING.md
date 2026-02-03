# Git Workflow for Monorepo

This repository contains both `backend/` and `mobile/` codebases. Follow these conventions for branches and commits.

## Branch Naming

### Option 1: Scope Prefix (Recommended)
Prefix branches with the affected area:

```bash
# Backend-only changes
feat/backend/add-user-auth
fix/backend/api-error-handling
refactor/backend/db-models

# Mobile-only changes  
feat/mobile/add-knowledge-screen
fix/mobile/navigation-bug
refactor/mobile/api-client

# Changes affecting both
feat/shared/add-knowledge-flow  # touches both backend API and mobile UI
feat/integration/connect-mobile-to-backend
```

### Option 2: Simple Prefix
Shorter version:

```bash
backend/feature-name
mobile/feature-name
shared/feature-name
```

## Commit Messages

### Format
Use conventional commits with scope:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code restructuring
- `test`: Adding/updating tests
- `chore`: Build process, dependencies, etc.

### Scopes
- `backend`: Backend-only changes
- `mobile`: Mobile-only changes
- `shared`: Changes affecting both
- `deps`: Dependency updates
- `ci`: CI/CD changes

### Examples

```bash
# Backend changes
feat(backend): add user authentication endpoint
fix(backend): handle SQLite connection errors
refactor(backend): extract embedding logic to service

# Mobile changes
feat(mobile): implement add knowledge screen
fix(mobile): fix navigation header styling
refactor(mobile): improve API client error handling

# Shared/integration changes
feat(shared): connect mobile to knowledge API
fix(shared): sync API response types between mobile and backend
```

## When to Use Separate vs Combined Branches

### Use Separate Branches When:
- Changes are isolated to one codebase
- Work can be done independently
- Different developers are working on each part

```bash
# Developer A works on backend
git checkout -b feat/backend/add-search-endpoint

# Developer B works on mobile  
git checkout -b feat/mobile/add-search-ui
```

### Use Combined Branches When:
- Feature requires changes in both codebases
- Changes are tightly coupled
- You're implementing a full feature end-to-end

```bash
# Full feature spanning both
git checkout -b feat/shared/add-search-feature
# Make backend changes
# Make mobile changes
# Commit together or separately with proper scopes
```

## Commit Strategy

### Option 1: Separate Commits (Recommended)
Keep commits focused and scoped:

```bash
feat(backend): add /search endpoint
feat(mobile): add search screen UI
feat(mobile): connect search screen to API
```

### Option 2: Combined Commits
For tightly coupled changes:

```bash
feat(shared): add search feature
# Includes both backend endpoint and mobile UI
```

## Pull Request Titles

Follow the same conventions:

```
feat(backend): add user authentication
fix(mobile): resolve navigation stack issue
feat(shared): implement knowledge search flow
```

## Examples from This Repo

Based on your current history:

```bash
# Good examples (what you've been doing)
feat: create mobile expo part
feat: add SQLite persistence layer for knowledge storage
feat: chunk knowledge ingestion for higher quality retrieval

# Could be improved with scopes:
feat(mobile): create expo app structure
feat(backend): add SQLite persistence layer
feat(backend): chunk knowledge ingestion
```
