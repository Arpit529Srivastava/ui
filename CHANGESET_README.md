# Changeset Integration Guide

This guide explains how to use the **Changeset** system in the KubeStellar UI repository for automated version management and release workflows.

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
- `feat!:` - Generates a major version bump
- `fix!:` - Generates a major version bump

The system will automatically:
1. Analyze your PR commits and files
2. Generate a changeset file in `.changeset/` directory
3. Add a comment to your PR with the changeset preview
4. Commit the changeset file to your PR branch

### 2. Release Process

When changes are merged to the main branch:
1. The release workflow runs tests
2. Processes all changesets
3. Creates a version bump PR
4. Publishes the package when the release PR is merged

## Usage for Developers

### Creating a Feature/Fix

1. **Create a branch** for your changes
2. **Make your changes** following conventional commit format
3. **Create a PR** with a title that starts with `feat:` or `fix:`
4. **Review the auto-generated changeset** in the PR comments
5. **Merge when ready**

### Example PR Titles

```bash
feat: add new cluster management feature
fix: resolve authentication issue
feat!: breaking change in API
fix!: critical security fix
```

### Skipping Changeset Generation

If you don't want auto-changeset to run on your PR:
1. Add the `skip-changeset` label to your PR, OR
2. Change your PR title to something other than `feat:` or `fix:`

### Manual Changeset Creation

If you need to create a changeset manually:

```bash
npm run changeset
```

This will prompt you to:
1. Select which packages to version
2. Choose the version bump type (patch, minor, major)
3. Write a description of the changes

## For Maintainers

### Reviewing Changesets

1. Check the auto-generated changeset in PR comments
2. Verify the version bump type is appropriate
3. Ensure the description accurately reflects the changes

### Managing Releases

1. The system automatically creates release PRs when changesets are merged
2. Review the release PR for accuracy
3. Merge the release PR to trigger publishing

### Manual Release

If you need to create a release manually:

```bash
# Version packages based on changesets
npm run version-packages

# Publish packages
npm run release
```

## Configuration

### Changeset Config (`.changeset/config.json`)

```json
{
  "changelog": ["@changesets/changelog-git", { "repo": "kubestellar/ui" }],
  "commit": false,
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch"
}
```

### Package.json Scripts

```json
{
  "changeset": "changeset",
  "version-packages": "changeset version",
  "release": "changeset publish"
}
```

## GitHub Actions Workflows

### Auto-Changeset Workflow (`.github/workflows/auto-changeset.yml`)

- **Trigger**: PR events (opened, edited, synchronize, reopened, ready_for_review)
- **Conditions**: 
  - Repository starts with 'kubestellar/'
  - PR doesn't have 'skip-changeset' label
  - PR title starts with conventional commit prefixes
- **Actions**:
  - Analyzes PR commits and files
  - Generates changeset content automatically
  - Creates changeset file in PR
  - Comments on PR with changeset preview

### Release Workflow (`.github/workflows/release-with-changesets.yml`)

- **Trigger**: Push to main branch
- **Actions**:
  - Runs tests
  - Uses `changesets/action@v1` to process changesets
  - Creates version bump PR
  - Publishes packages

## Conventional Commits

Follow this format for your commits:

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

## Troubleshooting

### Common Issues

1. **Changeset not generated**: Check PR title format and ensure it starts with `feat:` or `fix:`
2. **No packages detected**: Verify package.json files exist and have proper names
3. **Permission errors**: Ensure GITHUB_TOKEN has proper permissions
4. **Release failures**: Check NPM_TOKEN and package.json version fields

### Debug Steps

1. Check workflow logs in GitHub Actions
2. Verify changeset files are created in `.changeset/` directory
3. Ensure conventional commit format is followed
4. Check repository secrets are properly configured

## Best Practices

1. **Consistent Commits**: Always use conventional commit format
2. **Review Changesets**: Always review auto-generated changesets
3. **Manual Override**: Use `skip-changeset` label when needed
4. **Test Releases**: Test the release process in a staging environment first
5. **Documentation**: Keep this guide updated as you customize the system

## Resources

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [NPM Publishing Guide](https://docs.npmjs.com/cli/v8/commands/npm-publish) 