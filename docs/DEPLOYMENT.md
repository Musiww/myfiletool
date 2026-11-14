# Deploy myfiletool with GitHub and Cloudflare Pages

This guide assumes the contents of the local `myfiletool` folder become the **root of a separate GitHub repository** named `myfiletool`. GitHub stores the code; Cloudflare Pages builds and hosts the site.

## 1. Check the local project

From the `myfiletool` directory, run `npm ci`, `npm test`, and `npm run build`. Review the tracked files before pushing. Include `package-lock.json`, `.nvmrc`, `.github/workflows/check.yml`, the source, tests, README files, and docs. The `.gitignore` excludes dependencies, generated PDF assets, build output, and local input/output folders. Never put real private documents in the repository.

## 2. Create the GitHub repository

On GitHub, create a repository named `myfiletool` under the desired account. For the local-first method, leave the GitHub initialization boxes for README, `.gitignore`, and license unchecked; this folder already contains them. Choose public if you want others to read and fork it. In PowerShell from the `myfiletool` directory:

```powershell
git init
git branch -M main
git add .
git status
git diff --cached --stat
git commit -m "Initial myfiletool release"
git remote add origin https://github.com/YOUR_USERNAME/myfiletool.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username. Check the status and staged file list before committing; there should be no personal inputs, downloads, `node_modules`, or `dist`. If a Git credential prompt appears, use GitHub's normal browser sign-in flow.

## 3. Connect Cloudflare Pages

In Cloudflare Dashboard, open **Workers & Pages** and create a **Pages** project using Git integration. Connect GitHub and grant access to the new repository. Select the `main` production branch. Use the React (Vite) preset if offered, and confirm these exact settings:

| Setting | Value |
| --- | --- |
| Root directory | Repository root |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 24, from `.nvmrc`; set `NODE_VERSION=24` if the build image ignores the file |
| `VITE_BASE` | Leave unset for a domain/subdomain root (`/`) |

Cloudflare should install dependencies from `package-lock.json`, run the build, and initially give the project a `*.pages.dev` URL. Verify image conversion and PDF export there before adding a custom domain. Git integration normally deploys future pushes automatically; review production branch controls if you want to manage release timing.

## 4. Attach a subdomain

In the Pages project, open **Custom domains** and add your preferred domain or subdomain, for example `files.example.com`. Follow the domain setup shown there and inspect the resulting DNS record. If the domain hosts another site, preserve its existing records. Wait for HTTPS to become active, then test the real URL, including PDF worker/fonts and language switching.

If the selected hostname already has an A, AAAA, or CNAME record for another site, inspect its current use before replacing it. Adding the domain through Pages is necessary; creating only a DNS record is insufficient.

## 5. Updates and rollback

After local testing, commit and push changes to `main`; Git integration builds a new production deployment. Cloudflare's Pages dashboard shows build logs, deployment URLs, and earlier deployments for troubleshooting or rollback. Test with synthetic files on the live URL and inspect the browser Network panel to verify that files are not posted to a server.

## GitHub Pages alternative

The repository also contains a manual `.github/workflows/deploy.yml` for GitHub Pages. You do not need to enable it when using Cloudflare Pages. If you later choose GitHub Pages, use the repository Pages settings and the `VITE_BASE` guidance in that workflow, then configure the custom domain separately.

Official references: [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/), [build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/), [custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).
