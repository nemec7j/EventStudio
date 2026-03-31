# Event Studio

Event Studio is a Next.js MVP for collecting event data through a guided chat flow and generating marketing outputs from templates.

## What it does

- Create and manage event drafts
- Guide users through missing fields in chat (`/api/chat`)
- Validate core date/time rules (future dates, end after start)
- Store reusable templates (Markdown/HTML)
- Fill templates with event data and generate output files
- Keep generated output history per template

## Tech stack

- Next.js 16 (App Router) + TypeScript
- React 19
- Tailwind CSS 4 + shadcn/ui components
- Prisma ORM
- SQLite (`prisma/dev.db`)
- Local file storage in `uploads/`

## Project structure

- `app/` - pages and API routes
- `components/` - UI and workflow components
- `lib/` - chat extraction, question engine, template engine, upload helpers
- `prisma/` - schema, migrations, SQLite database file
- `uploads/` - uploaded templates and generated outputs

## Getting started

1. Install dependencies:

```bash
npm install
```

2. Enter your API keys

```env
DATABASE_URL="file:./dev.db"
OPENAI_API_KEY="your-openai-api-key"
OPENAI_MODEL="gpt-4o-mini"
```

3. Apply database schema:

```bash
npx prisma generate
npx prisma migrate dev
```

4. Start development server:

```bash
npm run dev
```

5. Open:

```text
http://localhost:3000
```

## Main user flow

1. Dashboard: create a new event draft.
1. Event detail: complete missing fields through chat.
1. When all required data is present, confirm save/publish in chat.
1. Event detail: open "Pripravit k publikaci" to preview the built-in MKT HTML template.
1. Templates page: upload template, pick event, generate output.
1. Download generated files from template history.
1. (Optional) Upload an event image for templates (placeholder `{{image_url}}`).

## API overview

- `POST /api/chat` - process chat message, update draft, return next question
- `GET /api/events` - list events
- `POST /api/events` - create event
- `GET /api/events/[id]` - get event detail
- `PATCH /api/events/[id]` - update event
- `DELETE /api/events/[id]` - delete event
- `POST /api/events/[id]/image` - upload event image
- `DELETE /api/events/[id]/image` - delete event image
- `GET /api/templates` - list templates with generated outputs
- `POST /api/templates/upload` - upload template (`.md`, `.markdown`, `.html`, `.htm`)
- `POST /api/templates/fill` - generate output from template + event
- `GET /api/files/[...path]` - serve files from local `uploads/`

## Template placeholders

The fill engine replaces `{{placeholder}}` tokens. Templates can use the
English set below or the Czech set used by the built-in MKT template.
Typical variables:

- `title`
- `start_date`
- `start_time`
- `end_date`
- `location`
- `city`
- `price`
- `registration_url`
- `description_short`
- `description_long`
- `organizer_name`
- `tags`
- `image_url`
- `lang`
- `language`

Built-in MKT (Czech) placeholders:

- `nazev_akce`
- `misto_konani`
- `zacatek_akce`
- `konec_akce`
- `anotace`
- `popis`
- `registrace_url`
- `image_url`
- `lang`
- `language`

Language UI placeholders (used by MKT templates):

- `t_invitation`
- `t_place`
- `t_start`
- `t_end`
- `t_annotation`
- `t_description`
- `t_registration`
- `t_footer`
- `t_generated`
- `t_image_alt`

Language translations:

- Templates can be generated in `cs`, `en`, `de`, `pl`.
- For non-`cs` languages, dynamic event text is translated via DeepL.
- Set `DEEPL_API_KEY` in `.env` to enable translations.

Example:

```md
# {{title}}

When: {{start_date}} at {{start_time}}
Where: {{location}}
Price: {{price}}
Registration: {{registration_url}}
```

## Scripts

- `npm run dev` - run dev server
- `npm run build` - build production app
- `npm run start` - start production server
- `npm run lint` - run ESLint

## Current MVP limits

- Storage is local (`uploads/`), not S3/Blob
- Template output supports Markdown/HTML only (no DOCX)
- AI chat uses OpenAI for draft extraction (non-AI chat remains rule-based)
- No auth/roles/audit log yet

## OpenAI chat

The chat UI supports two modes:

- `AI chat` uses OpenAI to extract event details and guide the user.
- `Standard chat` uses the built-in rule-based extraction.
