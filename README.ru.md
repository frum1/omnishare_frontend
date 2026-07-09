[EN](README.md) | **RU**

# OmniShare UI

**Vue-фронтенд для [OmniShare](https://github.com/frum1/omnishare) - self-hosted сервис обмена файлами.**

![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/frum1/omnishare_frontend/main.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

> [!NOTE]
> **Скорее всего, этот репозиторий вам не нужен.** Его билд запекается в Docker-образ OmniShare при релизе. Чтобы _захостить_ OmniShare, идите в [основной репозиторий](https://github.com/frum1/omnishare). Сюда - чтобы _дорабатывать интерфейс(если вы хотите, конечно)_.

![OmniShare interface](docs/screenshot.png)

## Стек

- Vue 3 + `vue-router` + Pinia
- PrimeVue (UI-компоненты, темы)
- vue-i18n (локализация)
- tus-js-client (прерываемая загрузка файлов)
- TypeScript, Vite

## Начало работы

Требует установленного `bun` или `npm` в dev-среде.
Обе утилиты синтаксически идентичны, но `bun` звучит лучше :)

```bash
bun install
bun run dev
```

Dev-сервер проксирует `/api` на `http://localhost:8000`, поэтому рядом должен быть запущен [бэкенд](https://github.com/frum1/omnishare). Если он доступен по другому адресу, переопределите цель через `VITE_DEV_API_TARGET`.

```bash
bun run build      # прод сборка → dist/
bun run preview    # локальный просмотр dist/
```

## Релизы и интеграция с основным репозиторием

При пуше тега вида `v*` GitHub Actions ([.github/workflows](.github/workflows)) собирает проект и публикует архив `frontend-dist-<tag>.tar.gz` с содержимым `dist/` как asset релиза.

Этот версионный билд автоматически стягивается при сборке Docker-образа в основном (backend) репозитории OmniShare — таким образом frontend и backend версионируются и деплоятся независимо, но собираются в единый контейнер.

## Лицензия

MIT — см. [LICENSE](LICENSE).
