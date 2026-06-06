# PR Validator Setup Guide

This document explains how to set up and use the PR validation workflow for your repository.

## 📋 Available Workflow

### **PR Required Checks** (`pr-required-checks.yml`)
Essential validation checks for merging:
- ✅ Frontend & Backend type checking
- ✅ Frontend & Backend build verification
- ✅ Syntax error detection
- ✅ Merge conflict detection

## 🚀 Setup Instructions

### Step 1: Enable Branch Protection

To enforce these checks before merging, set up branch protection:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Branches**
3. Click **Add rule** for your main branch (usually `master` or `main`)
4. Configure the rule:

```
Branch name pattern: master (or main)

✅ Require a pull request before merging
   - Require approvals: 1 (optional)
   - Dismiss stale PR approvals when new commits are pushed

✅ Require status checks to pass before merging
   - Select: PR Required Checks

✅ Require branches to be up to date before merging

✅ Do not allow bypassing the above settings
```

### Step 2: Configure Required Checks

In the branch protection settings, make sure to select:
- **PR Required Checks** (essential checks)

This ensures that PRs cannot be merged unless all essential checks pass.

### Step 3: Update package.json Scripts

Ensure your `package.json` files have the necessary scripts:

**Frontend (`frontend/package.json`):**
```json
{
  "scripts": {
    "build": "next build",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  }
}
```

**Backend (`backend/package.json`):**
```json
{
  "scripts": {
    "build": "tsc",
    "lint": "eslint src --ext .ts",
    "type-check": "tsc --noEmit"
  }
}
```

## 📊 What Gets Checked

### Syntax Errors
- TypeScript compilation errors
- JavaScript syntax issues
- Missing semicolons, brackets, etc.

### Code Quality
- Type safety violations
- Build verification

### Merge Readiness
- Merge conflict markers
- Build success

## 🎯 Workflow Triggers

The workflow runs on:
- PR opened
- PR synchronized (new commits pushed)
- PR reopened

## 🚨 Common Issues

### "TypeScript compilation failed"
Run locally first:
```bash
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit
```

### "Build failed"
Ensure all dependencies are installed:
```bash
cd frontend && npm install
cd backend && npm install
```

## ✅ Success Indicators

When all checks pass, you'll see:
- ✅ Green checkmarks on the workflow run
- ✅ Merge button enabled (if branch protection is set up)

## 🔄 Continuous Improvement

The workflow is designed to be:
- **Fast**: Quick type checking and build verification
- **Informative**: Provide clear error messages
- **Essential**: Only checks what's necessary for merge readiness

## 📞 Support

If you encounter issues:
1. Check the Actions tab for detailed logs
2. Run the checks locally first
3. Review the workflow file for customization options
4. Update this documentation with your learnings

---

**Happy coding with safe, validated PRs! 🚀**
