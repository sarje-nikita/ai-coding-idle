---
name: vite-setup
description: Create and configure Vite projects with React, Vue, or other frameworks
---

# Vite Project Setup Skill

This skill helps you create and configure Vite projects with best practices.

## When to Use

- User asks to create a new Vite project
- User wants to set up React, Vue, or other framework with Vite
- User needs help configuring Vite for development or production

## What This Skill Does

Automates the setup of Vite projects with:
- Framework selection (React, Vue, Svelte, etc.)
- TypeScript or JavaScript configuration
- Recommended project structure
- Development server configuration
- Build optimization

## How to Use

### 1. Create a New Vite Project

```bash
# Using npm
npm create vite@latest my-project -- --template react-ts

# Using yarn
yarn create vite my-project --template vue

# Using pnpm
pnpm create vite my-project --template svelte-ts
```

### 2. Available Templates

- `vanilla` - Vanilla JavaScript
- `vanilla-ts` - Vanilla TypeScript
- `react` - React with JavaScript
- `react-ts` - React with TypeScript
- `vue` - Vue 3
- `vue-ts` - Vue 3 with TypeScript
- `svelte` - Svelte
- `svelte-ts` - Svelte with TypeScript
- `preact` - Preact
- `preact-ts` - Preact with TypeScript
- `lit` - Lit
- `lit-ts` - Lit with TypeScript

### 3. Project Setup Workflow

```bash
cd my-project
npm install
npm run dev
```

### 4. Recommended Configuration

**vite.config.ts**:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
```

### 5. Common Additions

**ESLint + Prettier**:
```bash
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier eslint-plugin-prettier
```

**Tailwind CSS**:
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Environment Variables**:
Create `.env` file:
```
VITE_API_URL=http://localhost:8000
VITE_APP_TITLE=My App
```

Access in code:
```typescript
const apiUrl = import.meta.env.VITE_API_URL
```

## Best Practices

1. **Use TypeScript**: Better type safety and IDE support
2. **Configure path aliases**: Makes imports cleaner
3. **Enable source maps**: Easier debugging in production
4. **Use environment variables**: Keep configuration separate
5. **Optimize assets**: Use proper image formats and lazy loading
6. **Code splitting**: Leverage Vite's automatic code splitting

## Common Issues

### Port Already in Use
```bash
# Change port in vite.config.ts or use:
npm run dev -- --port 3001
```

### Module Not Found
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Errors
```bash
# Check TypeScript errors
npm run tsc --noEmit

# Build with verbose output
npm run build -- --debug
```

## Example Complete Setup

```bash
# 1. Create project
npm create vite@latest my-app -- --template react-ts

# 2. Navigate and install
cd my-app
npm install

# 3. Add essential packages
npm install -D @types/node
npm install react-router-dom axios zustand

# 4. Add dev dependencies
npm install -D eslint prettier tailwindcss

# 5. Start development
npm run dev
```

## Resources

- [Vite Documentation](https://vitejs.dev/)
- [Vite GitHub](https://github.com/vitejs/vite)
- [Vite Plugins](https://vitejs.dev/plugins/)
