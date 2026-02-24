# Session Schedule Parser Service

Сервис асинхронного парсинга Excel-расписаний сессии в нормализованный JSON-формат, предназначенный для последующего использования в личном кабинете студента.

Приложение принимает Excel-файл, создаёт задачу обработки, выполняет парсинг в фоне и предоставляет API для получения статуса и результата.

---

## Основные возможности

- Загрузка Excel файлов (`.xlsx` / `.xls`)
- Асинхронная обработка (очередь задач)
- Ограничение параллельных обработчиков
- Нормализация данных в стабильный JSON-контракт
- Обработка «грязных» Excel (разные названия колонок)
- Журнал ошибок парсинга (`issues`)
- Готово для интеграции с внешним сервером

---

## Архитектура

```
Client (личный кабинет)
        │
        ▼
   HTTP API (Express)
        │
        ▼
   Task Queue (в памяти)
        │
        ▼
   Excel Parser (xlsx)
        │
        ▼
 Data Normalizer (ScheduleJsonV1)
        │
        ▼
 JSON Result Storage
```

---

## Технологии

- Node.js
- TypeScript
- Express
- Multer
- XLSX
- UUID

---

## Установка

```bash
git clone <repo>
cd SessionParser
npm install
```

---

## Конфигурация

Настраивается через переменные окружения:

| Переменная | Описание | По умолчанию |
|---|---|---|
| `PORT` | Порт сервера | `3000` |
| `STORAGE_DIR` | Папка хранения | `./storage` |
| `MAX_PARALLEL_TASKS` | Число параллельных задач | `1` |
| `MAX_UPLOAD_MB` | Макс. размер файла (МБ) | `30` |

Пример `.env`:

```env
PORT=3000
STORAGE_DIR=./storage
MAX_PARALLEL_TASKS=2
MAX_UPLOAD_MB=50
```

---

## Запуск

**Development:**

```bash
npx ts-node src/index.ts
```

**Production:**

```bash
npx tsc
node dist/index.js
```

**Проверка:**

```
GET http://localhost:3000/health
→ { "status": "ok" }
```

---

## API

Базовый путь: `/api`

### 1. Создание задачи

**POST** `/api/tasks`

Загружает Excel и создаёт задачу обработки.

**Request:**

```
Content-Type: multipart/form-data
file: <excel>
```

**Пример:**

```bash
curl -X POST http://localhost:3000/api/tasks \
  -F "file=@schedule.xlsx"
```

**Response:**

```json
{
  "taskId": "uuid",
  "status": "queued",
  "createdAt": "2026-02-18T19:40:21.123Z"
}
```

---

### 2. Проверка статуса

**GET** `/api/tasks/{taskId}/status`

**Response:**

```json
{
  "taskId": "uuid",
  "status": "processing",
  "createdAt": "...",
  "startedAt": "...",
  "finishedAt": null,
  "error": null
}
```

**Статусы:**

| Статус | Описание |
|---|---|
| `queued` | Задача в очереди |
| `processing` | Выполняется |
| `completed` | Завершена успешно |
| `failed` | Завершена с ошибкой |

---

### 3. Получение результата

**GET** `/api/tasks/{taskId}/result`

- Если готово → скачивается JSON
- Если не готово → `409`
- Если ошибка → `422`

---

### 4. Краткая сводка

**GET** `/api/tasks/{taskId}/memory`

Возвращает краткую информацию о распарсенных данных.

---

## Формат результата (ScheduleJsonV1)

```json
{
  "meta": {
    "sourceFileName": "schedule.xlsx",
    "parsedAt": "2026-02-18T19:40:21.123Z",
    "version": "1.0"
  },
  "summary": {
    "items": 124,
    "groups": ["ИСТ-21", "ИСТ-22"],
    "itemsByGroup": { "ИСТ-21": 60, "ИСТ-22": 64 },
    "dateRange": { "from": "2026-01-10", "to": "2026-02-05" }
  },
  "items": [
    {
      "id": "sha1:...",
      "date": "2026-01-11",
      "time": { "start": "10:00", "end": null },
      "timezone": "Europe/Bucharest",
      "group": "ИСТ-21",
      "subject": "Операционные системы",
      "kind": "EXAM",
      "teacher": "Иванов И.И.",
      "location": { "room": "304", "building": null },
      "notes": null,
      "source": { "sheet": "Лист2", "row": 12 }
    }
  ],
  "issues": []
}
```

---

## Как используется в личном кабинете

1. Администратор загружает Excel
2. Backend кабинета получает JSON
3. Сохраняет у себя
4. Студент видит только своё расписание:

```js
items.filter(i => i.group === student.group)
```

---

## Коды ошибок

| Код | Причина |
|---|---|
| `400` | Файл не передан / слишком большой |
| `404` | Задача не найдена |
| `409` | Задача ещё обрабатывается |
| `422` | Ошибка обработки Excel |
| `500` | Внутренняя ошибка |

---

## Хранение данных

```
storage/
 ├─ uploads/
 │   ├─ incoming/    (временные файлы)
 │   └─ <taskId>.xlsx
 └─ results/
     └─ <taskId>.json
```

---

## Особенности реализации

- Обработка выполняется асинхронно
- Ограничение числа одновременных задач
- Устойчивость к различным названиям колонок
- Нормализация даты/времени
- Стабильный ID событий (sha1)

---

## Возможные улучшения

- Хранение задач в БД
- Webhook вместо polling
- Авторизация API
- Автоудаление старых файлов

---

## Лицензия

[MIT](LICENSE)
