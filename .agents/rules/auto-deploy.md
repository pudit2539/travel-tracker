# Automatic Production Deployment Rule

Whenever changes, features, or bug fixes are made and validated in this codebase:
1. Always run tests (`npm test`) or build verification (`npm run build`) to ensure there are no regressions or syntax/type errors.
2. Automatically commit the changes with a clear conventional commit message (e.g. `feat: ...` or `fix: ...`).
3. Automatically push the commit to `origin main` (`git push origin main`) to trigger the production deployment on Vercel / GitHub.
4. Report the commit hash and deployment status to the user.
