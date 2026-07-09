**EN** | [RU](README.ru.md)

# OmniShare UI

**The Vue frontend for [OmniShare](https://github.com/frum1/omnishare) - a self-hosted file sharing service.**

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/frum1/omnishare_frontend/main.yml)
[![License: GPL v3](https://img.shields.io/badge/license-GPLv3-blue.svg)](LICENSE)

> [!NOTE]
> **You probably don't need this repository.** Its build output is baked into the OmniShare Docker image at release time. To _run_ OmniShare, go to the [main repository](https://github.com/frum1/omnishare). Come here to _work on the interface(if u want, ofc)_.

## Stack

- Vue 3 + `vue-router` + Pinia
- PrimeVue (UI components, themes)
- vue-i18n (localization)
- tus-js-client (resumable file uploads)
- TypeScript, Vite

## Getting started

Requires `bun` or `npm` installed in the dev environment.
Both tools have identical syntax, but I'm partial to buns :)

```bash
bun install
bun run dev
```

The dev server proxies `/api` to `http://localhost:8000`, so run the [backend](https://github.com/frum1/omnishare) alongside it. Override the target with `VITE_DEV_API_TARGET` if it lives elsewhere.

```bash
bun run build      # production build → dist/
bun run preview    # serve dist/ locally
```

## Releases and integration with the main repository

On every push of a `v*` tag, GitHub Actions ([.github/workflows](.github/workflows)) builds the project and publishes a `frontend-dist-<tag>.tar.gz` archive containing the contents of `dist/` as a release asset.

This versioned build is automatically pulled during the Docker image build in the main (backend) Omnishare repository — so the frontend and backend are versioned and deployed independently, but assembled into a single container.

## License

GPL-3.0 — see [LICENSE](LICENSE).
