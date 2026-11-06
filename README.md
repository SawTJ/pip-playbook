# Pip's Playbook — Vercel testing copy

This is a standalone static copy of **Pip's Playbook**, prepared from the existing Site's version 22 archive. The original ChatGPT Site is not modified by deploying this copy.

## Deploy through Vercel

1. Create a **private** GitHub repository named `pips-playbook`.
2. Upload the contents of this folder to the **root** of that repository: `public/`, `vercel.json`, and `README.md`.
3. In [Vercel](https://vercel.com/new), choose **Add New → Project**, connect GitHub, and import the repository.
4. Select the framework preset **Other**. The included `vercel.json` serves the `public/` folder directly, so no build command or installation is required.
5. Deploy and open the assigned `*.vercel.app` address on mobile and desktop.

## Files

- `public/index.html` — the game screens and logic.
- `public/assets/pip.png` — Pip's artwork.
- `public/assets/animations.js` — animation helpers.
- `vercel.json` — buildless Vercel configuration.

## Important testing notes

- This copy does **not** update the existing ChatGPT-hosted prototype.
- Profiles and progress are stored **in each browser**. They do not transfer automatically from the ChatGPT Site to Vercel or between devices.
- The game uses browser voice synthesis; available voices can vary by browser and operating system.
- Existing ChatGPT Site access permissions, including previously invited testers, do **not** transfer to Vercel. Review Vercel deployment protection before sharing the testing URL.
- Parent controls and developmental progress reports are prototype features. Do not collect children's sensitive information or launch as a child-facing production service without a privacy and safety review.

## Local test

From the `public` folder, run a static web server (for example, `python3 -m http.server 8000`) and open `http://localhost:8000`.

## Updating this copy

When the ChatGPT Site is changed, obtain the newest Site version and update the files inside `public/`. GitHub commits to the connected repository can trigger new Vercel deployments.
