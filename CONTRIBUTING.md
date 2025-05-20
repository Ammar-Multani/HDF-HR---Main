# Contributing to the Business Management App

Thank you for your interest in contributing to our project! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and collaborative when contributing to this project. We appreciate your help in improving the application and making it better for everyone.

## Development Workflow

1. Fork and clone the repository
2. Install dependencies with `yarn install`
3. Create a feature branch from `main`:
   ```
   git checkout -b feature/your-feature-name
   ```
4. Make your changes, following our code standards
5. Test your changes
6. Commit your changes with a descriptive commit message:
   ```
   git commit -m "Feature: Add description of your changes"
   ```
7. Push your changes to your fork
8. Submit a Pull Request to the main repository

## Branching Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Feature development
- `bugfix/*`: Bug fixes
- `hotfix/*`: Urgent production fixes

## Code Style Guidelines

### General

- Use consistent indentation (2 spaces)
- Keep code modular and reusable
- Write meaningful variable and function names
- Add comments for complex logic, but prefer self-documenting code

### TypeScript

- Use TypeScript for all new code
- Define proper types/interfaces for all data structures
- Avoid using `any` type
- Use optional chaining (`?.`) and nullish coalescing (`??`) operators

### React Components

- Use functional components with hooks
- Keep components small and focused on a single responsibility
- Extract reusable logic into custom hooks
- Follow the presentational and container component pattern when appropriate

### Styling

- Use React Native Paper components when possible
- Follow the design system for colors, spacing, and typography
- Use theme values instead of hardcoded styles

## Testing

Before submitting a PR, ensure that:

1. Your code passes all existing tests
2. You've written tests for new functionality where appropriate
3. The app functions correctly on both iOS and Android

## Pull Request Process

1. Update the README.md if necessary
2. Make sure your code follows our style guidelines
3. Ensure all tests pass
4. Link any related issues in your Pull Request description
5. Request a review from a team member

## Commit Message Format

Follow this format for commit messages:

```
<type>: <subject>

<body>

<footer>
```

Types:

- feat: A new feature
- fix: A bug fix
- docs: Documentation changes
- style: Code style changes (formatting, semicolons, etc)
- refactor: Code changes that neither fix a bug nor add a feature
- perf: Performance improvements
- test: Adding or improving tests
- chore: Changes to the build process or auxiliary tools

Example:

```
feat: add company deletion feature

Add ability for super admins to delete companies with confirmation.

Resolves #123
```

## Questions?

If you have any questions or need clarification, please open an issue or contact the project maintainers.

Thank you for contributing!
