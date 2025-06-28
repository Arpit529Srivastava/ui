# Changeset Integration Guide for KubeStellar UI

This guide explains how to use the **Changeset** system that has been integrated into the KubeStellar UI repository for automated version management and release workflows.

## What is Changeset?

Changeset is a tool for managing versioning and changelogs with a focus on monorepos. It automates the process of:
- Determining version bumps based on conventional commits
- Generating changelogs
- Publishing packages
- Managing dependencies across multiple packages

## How It Works

### 1. Automatic Changeset Generation

When you create a Pull Request with a title that starts with:
- `feat:` - Generates a minor version bump
- `fix:` - Generates a patch version bump
- `feat!:` - Generates a major version bump (breaking change)
- `fix!:` - Generates a major version bump (breaking bug fix)

The system will automatically:
1. Analyze your PR commits and files
2. Generate a changeset file in `.changeset/` directory
3. Add a comment to your PR with the changeset preview
4. Commit the changeset file to your PR branch

### 2. Release Process

When changes are merged to the `dev` branch:
1. The release workflow runs tests
2. Processes all changesets
3. Creates a version bump PR
4. Publishes the package when the version PR is merged

## For Developers

### Creating a Feature/Fix

1. **Create a branch** for your changes
2. **Make your changes** following the codebase conventions
3. **Commit with conventional format**:
   ```bash
   git commit -m "feat: add new cluster management feature"
   git commit -m "fix: resolve authentication issue"
   git commit -m "feat!: breaking change in API structure"
   ```
4. **Create a PR** with a title that starts with the appropriate prefix:
   - `feat: Add new cluster management feature`
   - `fix: Resolve authentication issue`
   - `feat!: Breaking change in API structure`

### What Happens Next

1. **Auto-Changeset Workflow** will run and:
   - Generate a changeset file (e.g., `.changeset/123.md`)
   - Add a comment to your PR with the changeset preview
   - Commit the changeset to your PR branch

2. **Review the Changeset**:
   - Check the PR comment for the generated changeset
   - Verify the version bump type (patch/minor/major) is correct
   - Review the release notes

3. **Modify if Needed**:
   - Click the link in the PR comment to edit the changeset
   - Or manually edit `.changeset/[PR_NUMBER].md`
   - The changeset format is:
     ```markdown
     ---
     'kubestellarui': minor
     ---
     
     feat: Add new cluster management feature
     
     - abc1234: feat: add new cluster management feature
     - def5678: docs: update documentation
     ```

4. **Merge the PR** when ready

### Skipping Auto-Changeset

If you don't want auto-changeset to run on your PR:
1. Add the `skip-changeset` label to your PR, OR
2. Change your PR title to not start with `feat:` or `fix:`

## For Maintainers

### Manual Changeset Creation

If you need to create a changeset manually:

```bash
npm run changeset
```

This will:
1. Show you what packages have changed
2. Ask you to select which packages to version
3. Ask for the version bump type (patch/minor/major)
4. Ask for a description of the changes
5. Create a changeset file in `.changeset/`

### Reviewing Changesets

1. **Check PR Comments**: Look for changeset previews in PR comments
2. **Review Changeset Files**: Check `.changeset/` directory for pending changesets
3. **Verify Version Bumps**: Ensure the version bump type is appropriate
4. **Edit if Needed**: Modify changeset files before merging

### Release Process

1. **Automatic Trigger**: When changes are merged to `dev`
2. **Test Run**: The workflow runs tests first
3. **Version Bump PR**: Creates a PR with version updates
4. **Review and Merge**: Review the version bump PR and merge
5. **Publish**: Package is automatically published

## Conventional Commit Format

Always use conventional commit format:

```
feat: add new feature
fix: fix a bug
feat!: breaking change
fix!: breaking bug fix
docs: documentation changes
style: formatting changes
refactor: code refactoring
test: adding tests
chore: maintenance tasks
```

### Version Bump Rules

- `feat:` → Minor version bump (new features)
- `fix:` → Patch version bump (bug fixes)
- `feat!:` → Major version bump (breaking changes)
- `fix!:` → Major version bump (breaking bug fixes)
- `docs:`, `style:`, `refactor:`, `test:`, `chore:` → Patch version bump

## Configuration Files

### `.changeset/config.json`
```json
{
  "changelog": ["@changesets/changelog-git", { "repo": "kubestellar/ui" }],
  "commit": false,
  "access": "public",
  "baseBranch": "dev",
  "updateInternalDependencies": "patch"
}
```

### Package.json Scripts
```json
{
  "scripts": {
    "changeset": "changeset",
    "version-packages": "changeset version",
    "release": "changeset publish"
  }
}
```

## GitHub Actions Workflows

### Auto-Changeset Workflow (`.github/workflows/auto-changeset.yml`)
- **Trigger**: PR events (opened, edited, synchronize, reopened, ready_for_review)
- **Conditions**: 
  - Repository starts with 'kubestellar/'
  - PR doesn't have 'skip-changeset' label
  - PR title starts with conventional commit prefixes
- **Actions**: Generates changeset and comments on PR

### Release Workflow (`.github/workflows/release-with-changesets.yml`)
- **Trigger**: Push to dev branch
- **Actions**: Runs tests, processes changesets, creates version bump PR, publishes

## Required Secrets

Make sure these secrets are configured in your GitHub repository:

- `GH_TOKEN`: GitHub token with repo permissions
- `NPM_TOKEN`: NPM token for publishing packages

## Troubleshooting

### Common Issues

1. **Changeset not generated**:
   - Check PR title format (must start with `feat:` or `fix:`)
   - Ensure PR doesn't have `skip-changeset` label
   - Check workflow logs in GitHub Actions

2. **No packages detected**:
   - Verify package.json exists and has proper name
   - Check if files are in ignored list

3. **Permission errors**:
   - Ensure GH_TOKEN has proper permissions
   - Check repository secrets configuration

4. **Release failures**:
   - Verify NPM_TOKEN is configured
   - Check package.json version field
   - Review workflow logs

### Debug Steps

1. **Check Workflow Logs**: Go to GitHub Actions tab and check workflow runs
2. **Verify Changeset Files**: Look in `.changeset/` directory for generated files
3. **Check PR Comments**: Look for changeset preview comments
4. **Review Conventional Commits**: Ensure commit messages follow the format

## Best Practices

1. **Consistent Commits**: Always use conventional commit format
2. **Review Changesets**: Always review auto-generated changesets
3. **Manual Override**: Use `skip-changeset` label when needed
4. **Test Releases**: Test the release process in staging first
5. **Documentation**: Keep this guide updated as you customize the system

## Example Workflow

### Creating a New Feature

1. **Create branch**:
   ```bash
   git checkout -b feat/new-cluster-feature
   ```

2. **Make changes and commit**:
   ```bash
   git add .
   git commit -m "feat: add new cluster management dashboard"
   ```

3. **Push and create PR**:
   ```bash
   git push origin feat/new-cluster-feature
   # Create PR with title: "feat: Add new cluster management dashboard"
   ```

4. **Review auto-generated changeset**:
   - Check PR comment for changeset preview
   - Verify version bump type (should be minor)
   - Review release notes

5. **Merge PR** when ready

6. **Release happens automatically**:
   - Version bump PR is created
   - Package is published when version PR is merged

## Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [NPM Publishing Guide](https://docs.npmjs.com/cli/v8/commands/npm-publish)

---

This changeset integration provides a robust, automated version management system that reduces manual work and ensures consistent releases for the KubeStellar UI package. 