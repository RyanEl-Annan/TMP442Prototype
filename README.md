# TeamPilot AI

A university prototype for AI-assisted team management. Team leaders can paste or upload assignment instructions, describe their teammates, and generate a structured task plan with the OpenAI API. The app is a Next.js App Router project with a dark dashboard, local browser storage, and no authentication or database.

## Installation

Requirements: Node.js 22+ and npm.

```bash
cd TMP442Prototype
npm install
```

## Environment variables

1. Copy the example file:

```bash
copy .env.example .env.local
```

On macOS or Linux:

```bash
cp .env.example .env.local
```

2. Set:

```
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
```

`OPENAI_API_KEY` is required and is read only on the server. A `.env` file also works. Do not put the key in client code or commit env files.

`OPENAI_MODEL` is optional. It defaults to `gpt-4o-mini`. You can point it at another current, supported OpenAI model that accepts structured JSON output.

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other commands:

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

## How to use

**Assistant (recommended).** Open **Assistant** in the sidebar. The chatbot walks you through the project name, assignment upload, deadline, and teammates using clickable widgets (choices, date picker, file upload, teammate form). It then generates a draft plan, lets you edit it by chat ("move the report to Sam", "mark research done"), and a **Share to dashboard** button publishes it. You can also ask questions about workload, deadlines, or the plan. Chat endpoint: `/api/chat`.

**Manual wizard.** The original flow:

1. Open **New Project** and enter the assignment, or upload a PDF, DOCX, or TXT file.
2. Add team members, skills, interests, and weekly availability.
3. Generate an AI task plan. The request is sent to `/api/generate-plan`.
4. Review assignments on **AI Analysis**. Edit owners, status, hours, and tasks as needed.
5. Optionally paste a meeting transcript and choose **Analyze Team Dynamics**.
6. Use **Export report** to print or save a PDF.

AI recommendations are suggestions. A team leader should review them before sharing.

Project data is saved in `localStorage` under `teampilot-ai-v1`. Refreshing the page keeps the current workspace in that browser.

## Architecture

- `src/app` — App Router pages and server API routes
- `src/app/api/generate-plan` — OpenAI structured team plan
- `src/app/api/analyze-transcript` — OpenAI meeting analysis
- `src/components` — dashboard, wizard, analysis, layout, and shadcn/ui
- `src/context/app-state.tsx` — client state and localStorage persistence
- `src/lib` — types, Zod schemas, prompts, document text extraction, and stats

The UI never receives the OpenAI key. Document text is extracted in the browser, then only JSON is posted to the API routes. Responses are validated with Zod schemas through the official OpenAI SDK.

## Completed features

- Sidebar and top bar with working navigation
- Dashboard statistics, charts, empty states, and a create-project action
- Three-step new project workflow with file upload
- Team roster editing
- Secure OpenAI plan generation and analysis
- Editable task table, workload charts, and recommendations
- Meeting transcript analysis with TXT upload
- Printable export
- In-app How to Use section and disclaimer
- localStorage persistence

## Limitations

- No accounts, sharing, or multi-device sync
- One workspace per browser
- PDF extraction depends on client-side PDF.js and may miss scanned pages
- Plan quality depends on the completeness of the assignment and roster
- Requires a valid OpenAI API key and network access for generation
