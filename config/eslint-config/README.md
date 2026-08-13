<p align="center">
  <img src="https://avatars.githubusercontent.com/u/6019716" width="100" alt="ESLint Logo" style="border-radius: 20%;" />
</p>

<h1 align="center">⚙️ Mini Workout ESLint Config</h1>

<p align="center">
  <strong>Shared ESLint configuration for the Mini Workout monorepo</strong>
</p>

<p align="center">
  <a href="#"><img src="https://img.shields.io/badge/ESLint-8.x%2B-4B32C3?logo=eslint&logoColor=white" alt="ESLint" /></a>
  <a href="#"><img src="https://img.shields.io/badge/pnpm-10.x-F69220?logo=pnpm&logoColor=white" alt="pnpm" /></a>
</p>

---

## Overview

Shared ESLint flat configuration designed to keep code quality and styles consistent across all applications and packages within the monorepo. This package leverages ESLint Flat Config (`eslint.config.js`).

## Installation

```bash
pnpm add -D @mini-workout/eslint-config
```

## Usage

This package exposes multiple specific presets based on the project type.


### Next.js Apps

Create `eslint.config.js` in your app root:

```javascript
import nextConfig from '@mini-workout/eslint-config/nextjs-library';

export default [...nextConfig];
```

### React/Vite Apps

Create `eslint.config.js` in your app root:

```javascript
import reactConfig from '@mini-workout/eslint-config/reactjs-library';

export default [...reactConfig];
```

### Generic Node/TS Packages

Create `eslint.config.js` in your package root:

```javascript
import baseConfig from '@mini-workout/eslint-config/base';

export default [...baseConfig];
```

## Best Practices
- Avoid overriding standard rules locally unless absolutely necessary.
- Fix all warnings before committing (`pnpm lint:fix`).
