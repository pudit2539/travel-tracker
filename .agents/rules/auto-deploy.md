# Automatic Production Deployment & Dev Server Policy

1. **DO NOT touch or start the local development server:**
   - NEVER run `npm run dev`, background dev server processes, or manage local server tasks.
   - The user starts and manages their local development server themselves in their own terminal.

2. **Always Auto-Deploy to Production on completion:**
   - Whenever changes, features, or bug fixes are made and validated:
     a. Run test verification (`npm test`) or build verification (`npm run build`) to ensure 0 errors.
     b. Automatically commit the changes with a clear conventional commit message (`feat: ...` or `fix: ...`).
     c. Automatically push to `origin main` (`git push origin main`) to trigger the production deployment.
     d. Report the commit hash and deployment status to the user.

