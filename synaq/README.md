# Сынақ — демо ИИ-генерации тестовых заданий

Живое демо: https://gamemetric.dev/synaq/ · готовые примеры без ожидания: `?demo=ru`, `?demo=kk`.
Демо к заявке TEMIRLAB на технологическую задачу AstanaHub (ТОО Daryn.online). На главную сайта не добавлено, noindex.

- Чистый JS без сборки: `js/extract.js` (PDF через pdf.js, DOCX через JSZip, TXT), `js/pii.js` (маскирование ИИН/телефонов/почты),
  `js/engine.js` (слой LLM и план генерации), `js/check.js` (автопроверка), `js/export.js` (JSON и игры «Тақта»), `js/app.js` (интерфейс).
- Сервер: Cloudflare Worker `synaq-api` + Workers AI (gpt-oss-120b), суточный бюджет ниже бесплатной квоты.
  Исходники и выкладка — `E:/PS/astanahub/darynonline-tests/worker/` (`node deploy.mjs <файл с токеном>`).
- Экспорт в «Тақта» пишет игры в `localStorage['taqta.db.v1']` — «Тақта» лежит на том же домене (`/taqta/`).

Исходники демо: `E:/PS/astanahub/darynonline-tests/web/`, копируются сюда целиком.
