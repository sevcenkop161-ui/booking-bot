# PROJECT SPECIFICATION
# BOOKING BOT — Telegram-система записи клиентов

## 1. Общая информация

- **Название проекта:** Booking Bot
- **Тип проекта:** полноценный демонстрационный full-stack проект для портфолио.
- **Формат:** Telegram-бот + backend + база данных + административная панель.

**Основная идея:**
Создать универсальную систему онлайн-записи для мастеров и небольших студий.

Первоначальная концепция ориентирована на:
- тату-мастеров;
- пирсеров;
- бьюти-мастеров;
- мастеров маникюра;
- барберов;
- небольшие студии.

Но архитектура должна быть достаточно универсальной, чтобы проект можно было адаптировать под разные виды бизнеса.

---

## 2. Главная цель проекта

Создать систему, которая позволяет клиенту записаться к мастеру прямо через Telegram, а владельцу бизнеса — управлять услугами, мастерами, расписанием и записями через административную панель.

Проект должен демонстрировать:
- Telegram Bot API;
- backend-разработку;
- базы данных;
- авторизацию;
- API;
- бизнес-логику;
- работу со временем и датами;
- уведомления;
- административную панель;
- обработку ошибок;
- безопасность;
- deployment.

Это должен быть не «бот с кнопками», а полноценный маленький SaaS-like продукт.

---

## 3. Целевая аудитория

### Клиент

Человек, который хочет записаться на услугу. Он должен иметь возможность:
- открыть Telegram-бота;
- посмотреть услуги;
- выбрать мастера;
- выбрать дату;
- выбрать время;
- оставить контактные данные;
- подтвердить запись;
- получить подтверждение;
- посмотреть/отменить свою запись.

### Владелец бизнеса

Должен иметь возможность:
- управлять услугами;
- управлять мастерами;
- задавать расписание;
- видеть записи;
- подтверждать/отменять записи;
- получать уведомления;
- управлять доступными временными слотами.

---

## 4. Бизнес-проблема

Малому бизнесу часто приходится принимать записи вручную через Telegram, Instagram, WhatsApp, звонки, сообщения.

Это приводит к:
- потере заявок;
- перепискам туда-обратно;
- ошибкам в расписании;
- двойным записям;
- необходимости постоянно отвечать клиентам.

Booking Bot должен автоматизировать этот процесс.

---

## 5. Главный пользовательский сценарий

```
Telegram
↓
/start
↓
Главное меню
↓
Записаться
↓
Выбор услуги
↓
Выбор мастера
↓
Выбор даты
↓
Выбор времени
↓
Контактные данные
↓
Подтверждение
↓
Запись в БД
↓
Уведомление администратора
↓
Подтверждение клиенту
```

---

## 6. Концепция продукта

- **Рабочее название:** BOOKING
- **Tagline:** Your time. Your appointment. Simplified.
- **Альтернативный вариант:** Simple booking. Zero back-and-forth.
- **Визуальный стиль административной панели:** Minimal SaaS / Dark & Light UI

Telegram-бот должен быть максимально простым.

**Главный принцип:** Клиент должен записаться за минимальное количество действий.

---

## 7. Telegram Bot

Бот является главным пользовательским интерфейсом для клиента.

После `/start` пользователь видит приветствие:

```
Добро пожаловать в [название бизнеса] 👋
Выберите действие:

📅 Записаться
📋 Мои записи
💇 Услуги
👤 Мастера
ℹ️ О студии
❓ Помощь
```

Использовать Telegram Inline Keyboard / Reply Keyboard там, где это улучшает UX.

---

## 8. Главное меню

- **📅 Записаться** — начинает booking flow.
- **📋 Мои записи** — показывает активные и будущие записи пользователя.
- **💇 Услуги** — показывает список доступных услуг.
- **👤 Мастера** — показывает мастеров и их специализации.
- **ℹ️ О нас** — информация о бизнесе.
- **❓ Помощь** — FAQ и контакт администратора.

---

## 9. Booking Flow — Шаг 1: услуга

Пользователь выбирает: Tattoo; Piercing; Consultation.

В реальном проекте список должен приходить из базы данных.

Каждая услуга содержит: название; описание; длительность; цену; активность.

---

## 10. Шаг 2 — мастер

После выбора услуги показать только мастеров, которые могут выполнять эту услугу.

Карточка мастера: имя; специализация; фотография; краткое описание.

Кнопка: **Выбрать**

---

## 11. Шаг 3 — дата

Показать календарь. Пользователь выбирает доступную дату. Недоступные даты должны быть недоступны для выбора.

Учитывать: рабочие дни; выходные; отпуск; исключения; занятые слоты.

---

## 12. Шаг 4 — время

После выбора даты бот получает актуальные доступные слоты.

Например: 10:00, 11:30, 13:00, 15:30, 17:00

Не показывать уже занятые слоты.

---

## 13. Шаг 5 — данные клиента

Запросить: имя; номер телефона; Telegram username, если доступен; дополнительный комментарий.

Telegram ID пользователя сохранять автоматически. Не просить пользователя вводить Telegram ID вручную.

---

## 14. Шаг 6 — подтверждение

Перед созданием записи показать:

```
Ваша запись

Услуга: Tattoo
Мастер: Alex
Дата: 20 августа
Время: 15:30
Длительность: 2 часа
Стоимость: от 8 000 ₽
```

Кнопки: ✅ Подтвердить · ← Изменить · ❌ Отменить

---

## 15. Создание записи

После подтверждения:
1. Повторно проверить доступность слота на сервере.
2. Создать запись.
3. Заблокировать выбранный слот.
4. Отправить уведомление администратору.
5. Отправить подтверждение клиенту.

Нельзя доверять только данным, полученным от Telegram-клиента.

---

## 16. Защита от двойной записи

Это одна из самых важных частей проекта.

Система должна гарантировать, что два пользователя не смогут одновременно забронировать один и тот же слот.

Frontend/Telegram UI не должен быть единственным уровнем проверки. Нужна серверная проверка.

На уровне БД предусмотреть механизм, предотвращающий создание конфликтующих booking records.

Продумать: уникальность слота; транзакции; race conditions; повторную проверку перед INSERT.

---

## 17. Мои записи

Кнопка: **📋 Мои записи**

**Предстоящие:**
```
20 августа
15:30

Tattoo
Мастер Alex

Статус: Подтверждено
```
Кнопки: Подробнее · Отменить

**Прошедшие:** можно показывать историю.

---

## 18. Отмена записи

Перед отменой:
```
Вы уверены, что хотите отменить запись?

20 августа · 15:30
Tattoo · Alex
```
Кнопки: Да, отменить · Назад

После отмены: статус меняется; слот снова становится доступным; администратор получает уведомление.

---

## 19. Статусы записи

- `PENDING` — заявка создана, но ещё не подтверждена.
- `CONFIRMED` — запись подтверждена.
- `CANCELLED` — запись отменена.
- `COMPLETED` — услуга оказана.
- `NO_SHOW` — клиент не пришёл.

---

## 20. Администратор

Администратор должен получать уведомления о новых записях.

```
🔔 Новая запись

Клиент: Анна
Услуга: Tattoo
Мастер: Alex
Дата: 20 августа
Время: 15:30
Телефон: +7 XXX XXX XX XX
Комментарий: Небольшая татуировка на предплечье.
```

Кнопки: ✅ Подтвердить · ❌ Отклонить · 📋 Подробнее

---

## 21. Admin Dashboard

Создать отдельную web-панель, например `/dashboard`. Dashboard должен быть защищён авторизацией.

---

## 22. Dashboard — Overview

**Сегодня:** количество записей; подтвержденные; ожидающие; отмененные.

**Ближайшие записи:** время; клиент; услуга; мастер; статус.

**Статистика:** записи за неделю; записи за месяц; популярные услуги; загрузка мастеров.

---

## 23. Calendar

Создать календарь записей. Варианты: день; неделя; месяц.

В календаре показывать: время; клиента; мастера; услугу; статус.

При клике открывается Booking Details.

---

## 24. Booking Details

Показывать: ID; клиент; Telegram; телефон; услуга; мастер; дата; время; длительность; комментарий; статус; дата создания.

Доступные действия: Confirm; Cancel; Complete; No-show.

---

## 25. Управление услугами

**Admin → Services**

Администратор может: создавать услугу; редактировать; отключать; удалять; менять цену; менять длительность.

Поля: `name`; `description`; `price`; `duration`; `active`.

---

## 26. Управление мастерами

**Admin → Artists**

Поля: имя; фотография; bio; специализация; услуги; активность.

Связь: Artist ↔ Services (many-to-many).
- Один мастер может выполнять несколько услуг.
- Одна услуга может выполняться несколькими мастерами.

---

## 27. Расписание

**Admin → Schedule**

Администратор задаёт: рабочие дни; рабочие часы; перерывы; выходные; отпуск; индивидуальные исключения.

```
Monday
10:00 — 19:00

Break
14:00 — 15:00
```

---

## 28. Генерация слотов

Система должна автоматически определять доступные временные слоты на основе: рабочего расписания; длительности услуги; существующих записей; исключений; отпусков.

Пример: рабочее время 10:00–18:00, услуга 2 часа → система не должна показывать слот 17:00, если услуга заканчивается после закрытия.

---

## 29. Timezone

Обязательно учитывать timezone бизнеса. Нельзя хранить/обрабатывать время без продуманной timezone strategy.

Рекомендуется:
- хранить timestamps в UTC;
- отображать пользователю время в timezone бизнеса.

Timezone бизнеса хранить в настройках, например `Europe/Berlin`.

Для demo-проекта можно использовать один timezone, но архитектура должна позволять изменить его.

---

## 30. Database

Использовать: **PostgreSQL + Supabase**

### Основные таблицы

**businesses**
`id, name, slug, description, timezone, phone, telegram, address, created_at, updated_at`

**users**
`id, telegram_id, username, first_name, last_name, phone, created_at, updated_at`

**admins**
`id, user_id, role, created_at`

**artists**
`id, business_id, name, slug, bio, specialization, image_url, active, created_at, updated_at`

**services**
`id, business_id, name, description, price, duration_minutes, active, created_at, updated_at`

**artist_services**
`artist_id, service_id`

**bookings**
`id, business_id, user_id, artist_id, service_id, date, start_time, end_time, status, comment, created_at, updated_at`

**working_hours**
`id, business_id, artist_id, day_of_week, start_time, end_time, is_working`

**breaks**
`id, business_id, artist_id, day_of_week, start_time, end_time`

**time_off**
`id, business_id, artist_id, start_date, end_date, reason`

**business_settings**
`id, business_id, booking_interval, min_booking_notice, max_booking_days, cancellation_hours`

---

## 31. Database Relationships

```
Business
│
├── Artists
│   └── Artist Services
│
├── Services
│
├── Users
│   └── Bookings
│
├── Bookings
│   ├── Artist
│   └── Service
│
├── Working Hours
├── Breaks
└── Time Off
```

Продумать foreign keys и cascading behavior.

---

## 32. Multi-business Architecture

Хотя первая demo-версия может использовать один бизнес, архитектуру желательно сделать так, чтобы в будущем система могла поддерживать несколько бизнесов.

Основные сущности должны иметь `business_id`. Это позволит потенциально превратить проект в SaaS.

Не нужно реализовывать полноценный multi-tenant SaaS в первой версии, если это неоправданно усложняет разработку, но архитектура не должна закрывать такую возможность.

---

## 33. Authentication

Для admin dashboard использовать безопасную авторизацию. Предпочтительно: **Supabase Auth**.

Не создавать собственную систему хранения паролей.

Роли: `OWNER`, `ADMIN`. При необходимости позже: `STAFF`.

---

## 34. Authorization

Проверять права не только на frontend (например, обычный пользователь не должен иметь возможность вызвать API и получить admin data).

Использовать: server-side checks; Supabase Row Level Security; role-based access.

---

## 35. Telegram Integration

Использовать Telegram Bot API. Бот должен уметь:
- `/start`;
- `/help`;
- показывать меню;
- обрабатывать callbacks;
- получать данные пользователя;
- отправлять сообщения;
- отправлять уведомления администратору.

Не хранить bot token в коде. Использовать environment variables.

---

## 36. Webhook

Для production-like версии использовать webhook вместо постоянного polling, если это подходит выбранной архитектуре.

Предусмотреть: endpoint; secret verification; обработку Telegram updates; idempotency.

Не обрабатывать один и тот же update несколько раз.

---

## 37. API Architecture

Примерные endpoints:

```
POST /api/telegram/webhook

GET /api/services
GET /api/artists
GET /api/availability

POST /api/bookings
GET /api/bookings

PATCH /api/bookings/:id

GET /api/admin/bookings
GET /api/admin/calendar
POST /api/admin/services
PATCH /api/admin/services/:id
POST /api/admin/artists
PATCH /api/admin/artists/:id
```

Финальную структуру API определить после архитектурного анализа.

---

## 38. Validation

Использовать schema validation. Предпочтительно: **Zod**.

Проверять: phone; dates; times; service IDs; artist IDs; booking data; admin inputs.

Frontend validation не заменяет backend validation.

---

## 39. Error Handling

Обработать: несуществующую услугу; несуществующего мастера; занятую дату; занятой слот; неправильные данные; ошибку БД; Telegram API error; network error; unauthorized request; forbidden request.

Пользователь должен получать понятное сообщение. Внутренние технические ошибки не показывать пользователю.

---

## 40. Idempotency

Особенно важно для: Telegram updates; создания booking; уведомлений.

Повторная обработка одного и того же запроса не должна создавать дубликаты.

---

## 41. Security

Обязательные требования:
- secrets только через environment variables;
- `.env` не попадает в Git;
- RLS в Supabase;
- серверная проверка прав;
- валидация всех входных данных;
- защита webhook;
- ограничение admin endpoints;
- отсутствие service role key во frontend;
- безопасная работа с Telegram ID;
- минимизация хранимых персональных данных.

Не хранить лишние данные клиента.

---

## 42. Privacy

Так как система работает с контактными данными клиентов, предусмотреть:
- минимизацию данных;
- понятную политику хранения;
- возможность удаления/анонимизации данных в будущем;
- ограничение доступа сотрудников.

Для demo-проекта использовать тестовые данные.

---

## 43. Rate Limiting

Предусмотреть ограничение частоты запросов для: webhook; booking endpoint; authentication; admin API.

Цель: защита от спама и случайного/злонамеренного перегруза.

---

## 44. UX Telegram Bot

**Главное правило:** минимальное количество действий.

Пользователь не должен вводить длинные команды. Предпочтительно использовать кнопки.

Каждый экран должен иметь: понятный заголовок; короткое описание; кнопки; Back; Cancel.

Не создавать длинные сообщения.

---

## 45. UX Admin Dashboard

Dashboard должен выглядеть как настоящий SaaS-продукт. Стиль: clean; modern; minimal; professional.

Navigation: Overview, Bookings, Calendar, Services, Artists, Schedule, Settings.

На mobile dashboard также должен оставаться usable.

---

## 46. Design System

Использовать единую систему: typography; spacing; colors; buttons; inputs; dropdowns; modals; tables; badges; cards; alerts.

Статусы: Pending; Confirmed; Cancelled; Completed; No-show.

Каждый статус должен визуально отличаться, но не использовать чрезмерное количество цветов.

---

## 47. Dashboard Components

Создать переиспользуемые компоненты: Sidebar; Header; StatsCard; BookingTable; BookingCard; Calendar; StatusBadge; Modal; ConfirmDialog; FormField; Select; DatePicker; TimePicker; EmptyState; LoadingState; ErrorState; Toast.

---

## 48. Responsive

Dashboard: desktop; tablet; mobile.

Telegram UI не зависит от обычной responsive-вёрстки сайта, но сообщения и кнопки должны быть удобны на мобильных экранах.

---

## 49. Notifications

События:
- **New booking** — уведомить администратора.
- **Booking confirmed** — уведомить клиента.
- **Booking cancelled** — уведомить клиента и администратора.
- **Booking reminder** — в будущем можно добавить напоминание.

Для первой версии можно реализовать базовые уведомления, а reminder оставить как расширение.

---

## 50. Reminder System

Архитектура должна позволять добавить: 24 hours before; 2 hours before.

Для demo можно не реализовывать сложный scheduler, если он не нужен для MVP. Но описать, как он будет работать.

---

## 51. Availability Engine

Это одна из самых важных частей проекта.

```
Working Hours
-
Breaks
-
Time Off
-
Existing Bookings
=
Available Slots
```

При расчёте учитывать duration услуги.

Пример: рабочее время 10:00–18:00, перерыв 14:00–15:00, услуга 120 минут → система должна вернуть только реальные свободные интервалы.

---

## 52. Booking Rules

Настройки (должны быть configurable):
- **Booking interval** — например, 30 минут.
- **Minimum notice** — например, 2 часа.
- **Maximum booking horizon** — например, 30 дней.
- **Cancellation deadline** — например, 24 часа до записи.

---

## 53. Empty States

Например: «Нет доступных записей» или «На выбранную дату свободного времени нет.»

CTA: Выбрать другую дату

---

## 54. Loading States

**Dashboard:** skeleton; table loading; calendar loading.

**Telegram:** короткие состояния ожидания там, где это необходимо.

---

## 55. Testing

**Bot:** `/start`; menu; booking; cancellation; my bookings.

**Backend:** validation; availability; booking creation; double booking prevention; errors.

**Database:** relationships; RLS; constraints.

**Admin:** login; permissions; bookings; services; artists; schedule.

---

## 56. Edge Cases

Обязательно протестировать:
- Два клиента выбирают один слот одновременно.
- Мастер стал недоступен после открытия календаря.
- Услуга была отключена во время booking flow.
- Запись отменена.
- Пользователь нажал Confirm дважды.
- Telegram прислал duplicate update.
- У пользователя нет username.
- Неверный номер телефона.
- Нет свободных слотов.
- Мастер не работает в выбранный день.
- Выбранная дата в прошлом.
- Услуга не помещается до конца рабочего дня.
- Время попадает на break.
- Мастер находится в отпуске.
- Ошибка Supabase.
- Telegram API временно недоступен.

---

## 57. Performance

Учитывать: database indexes; efficient queries; caching там, где это оправдано; минимизацию API requests; оптимизацию dashboard; pagination для bookings; не загружать всю историю сразу.

---

## 58. Logging

Предусмотреть структурированные логи для: errors; booking creation; Telegram webhook; authentication; important admin actions.

Не логировать лишние персональные данные.

---

## 59. Deployment

```
Telegram
   ↓
Telegram Bot API
   ↓
Backend / Next.js
   ↓
Supabase
   ↓
PostgreSQL
```

Dashboard:
```
Browser
   ↓
Next.js
   ↓
Backend/API
   ↓
Supabase
```

Возможный deployment: Vercel; Supabase; Telegram Bot API.

Конкретную deployment strategy определить перед публикацией.

---

## 60. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
ADMIN_TELEGRAM_ID=
```

Список уточнить после реализации. Ни один секрет не должен попадать в GitHub.

---

## 61. GitHub

README должен содержать:

```
BOOKING BOT

Telegram booking automation system.

Overview
Features
Architecture
Tech Stack
Telegram Flow
Database Schema
API
Security
Installation
Environment Variables
Local Development
Deployment
Screenshots
Future Improvements
```

Добавить: screenshots; architecture diagram; Telegram flow diagram; dashboard screenshots.

---

## 62. Portfolio Case

- **Название:** Booking Bot — Telegram Booking Automation System
- **Краткое описание:** Telegram-бот и административная система для автоматизации записи клиентов.
- **Проблема:** Ручная запись занимает время и приводит к ошибкам.
- **Решение:** Автоматизированный booking flow + dashboard.
- **Основные функции:** Telegram booking; availability engine; calendar; services; artists; notifications; admin dashboard; database; authentication.

---

## 63. Главный selling point проекта

Потенциальный заказчик должен увидеть:
> «Это не просто Telegram-бот. Это готовая система автоматизации записи, которую можно адаптировать под мой бизнес».

---

## 64. Скриншоты для портфолио

- Hero/cover dashboard.
- Telegram main menu.
- Service selection.
- Artist selection.
- Calendar/date selection.
- Time selection.
- Booking confirmation.
- Success message.
- Admin dashboard.
- Bookings table.
- Calendar.
- Services management.
- Artists management.
- Mobile dashboard.

---

## 65. Demo Video

Создать видео примерно 30–60 секунд. Показать: `/start`; выбор услуги; выбор мастера; выбор даты; выбор времени; подтверждение; появление записи в dashboard; подтверждение записи; изменение статуса.

Видео должно демонстрировать весь путь от клиента до администратора.

---

## 66. Demo Data

Использовать вымышленные данные.

- **Studio:** Ink House
- **Artists:** Alex — Blackwork; Mia — Fine Line; Noah — Realism.
- **Services:** Small Tattoo; Custom Tattoo; Piercing; Consultation.

Не использовать реальные персональные данные.

---

## 67. MVP

Первая версия обязательно должна включать: Telegram bot; services; artists; booking flow; availability; database; booking creation; cancellation; admin authentication; dashboard; bookings; services management; artists management; schedule; notifications; security; deployment.

---

## 68. Возможные Phase 2 функции

Не реализовывать всё сразу. В будущем: online payment; deposits; automatic reminders; Google Calendar; Google Sheets; multiple businesses; multiple admins; analytics; client history; loyalty system; promo codes; recurring appointments; waitlist; multilingual bot; WhatsApp integration.

---

## 69. Критерий готовности

Проект считается завершённым только если:

- [ ] Telegram bot работает.
- [ ] `/start` работает.
- [ ] Главное меню работает.
- [ ] Услуги загружаются из БД.
- [ ] Мастера загружаются из БД.
- [ ] Availability работает.
- [ ] Booking flow работает.
- [ ] Double booking предотвращён.
- [ ] Записи сохраняются.
- [ ] Клиент может посмотреть свои записи.
- [ ] Клиент может отменить запись.
- [ ] Администратор получает уведомления.
- [ ] Admin login работает.
- [ ] Dashboard работает.
- [ ] Bookings работают.
- [ ] Calendar работает.
- [ ] Services management работает.
- [ ] Artists management работает.
- [ ] Schedule работает.
- [ ] Authorization настроена.
- [ ] RLS настроена.
- [ ] Secrets защищены.
- [ ] Errors обработаны.
- [ ] Responsive проверен.
- [ ] Performance проверена.
- [ ] GitHub оформлен.
- [ ] README готов.
- [ ] Deployment готов.
- [ ] Portfolio case готов.
- [ ] Demo video готов.

---

## 70. Финальный аудит

После завершения провести аудит в пяти ролях.

**Senior Developer** — проверить: архитектуру; код; API; database; maintainability.

**Security Reviewer** — проверить: auth; authorization; RLS; secrets; Telegram webhook; input validation; API security.

**UX Designer** — проверить: простоту booking flow; понятность Telegram UX; dashboard; error states.

**QA Engineer** — проверить: edge cases; booking; cancellation; double booking; permissions.

**Potential Client** — ответить: «Я бы заплатил за такую систему?» Если нет — определить, что именно мешает.

---

## 71. Работа с разработчиком

Claude Code должен работать в режиме обучения.

Перед крупным этапом:
1. объяснить цель;
2. объяснить архитектуру;
3. показать изменяемые файлы;
4. выполнить этап;
5. проверить результат;
6. объяснить, что было сделано.

Не писать весь проект одним огромным действием. После каждого крупного этапа делать проверку.

---

## 72. Главный принцип

Booking Bot должен показать, что разработчик умеет не только создавать красивые интерфейсы, но и решать реальные бизнес-задачи с помощью программного обеспечения.

- Ink Studio демонстрирует: Design + Frontend + UX
- Booking Bot должен демонстрировать: Backend + Database + API + Automation + Business Logic + Security

Вместе эти два проекта должны создать сильное первое впечатление о разработчике.

---

## 73. Итоговый пользовательский путь

**CLIENT**
```
Telegram
↓
Start
↓
Choose Service
↓
Choose Artist
↓
Choose Date
↓
Choose Time
↓
Enter Contact
↓
Confirm
↓
Booking Created
↓
Confirmation
```

**Одновременно — DATABASE / ADMIN**
```
DATABASE
↓
Booking stored
↓
Availability updated
↓
ADMIN NOTIFICATION
↓
Admin Dashboard
↓
Confirm / Cancel
↓
Client Notification
```

---

## 74. Основной критерий качества

Проект должен выглядеть не как учебный CRUD-проект. Он должен выглядеть как реальный коммерческий продукт, который можно адаптировать и продавать малому бизнесу.

При этом все demo-данные должны быть честно обозначены как демонстрационные.

**Главная цель:** создать сильнейший технический кейс второго уровня портфолио после Ink Studio.
