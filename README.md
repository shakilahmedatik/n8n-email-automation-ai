# AI-Powered Email Triage & Admin Dashboard CRM

An intelligent, production-ready system combining an **n8n** automation workflow, an **AI Model (OpenRouter/GPT-4o-mini)**, a **Postgres Database**, and a **Next.js Admin Dashboard/CRM**. It monitors incoming Gmail messages, performs AI analysis and response drafting, automatically replies to safe routine inquiries within the original conversation thread, and routes sensitive/commercial/spam inquiries to an Admin Dashboard CRM for human review.

---

## 📑 Table of Contents

- [Architecture & Workflow Flowchart](#-architecture--workflow-flowchart)
- [System Features](#-system-features)
- [Mandatory Human Approval Rules](#-mandatory-human-approval-rules)
- [🐳 Running Locally with Docker](#-running-locally-with-docker)
- [Prerequisites & Credentials Setup](#-prerequisites--credentials-setup)
- [n8n Configuration & Workflow Setup](#-n8n-configuration--workflow-setup)
- [Dashboard Usage](#-dashboard-usage)
- [✏️ Customizing the AI System Prompt (Business Profile)](#️-customizing-the-ai-system-prompt-business-profile)
- [Directory Structure](#-directory-structure)

---

## 🏗 Architecture & Workflow Flowchart

```mermaid
flowchart TD
    A([📧 Gmail Trigger\nUnread Emails Polling]) --> B[🧠 AI Email Analyzer\nOpenRouter GPT-4o-mini]
    B --> C{🔀 Route by Classification}

    %% Auto-Reply Branch
    C -->|AUTO_REPLY| D[✉️ Send Auto Reply\nGmail Threaded Reply]
    D --> E[📱 Notify Auto Reply Dispatched\nTelegram Info Message]

    %% Human Approval Branch
    C -->|HUMAN_APPROVAL| F[🔔 Send to Dashboard\nStore in Postgres DB via HTTP Request]
    F --> G[📱 Notify Human Approval Required\nTelegram Notification]
    
    %% Dashboard Interaction
    G --> H([👨‍💻 Human Review in Next.js Dashboard CRM])
    H -->|"Approve, Edit, or Send"| I[Webhook to n8n]
    I --> J[✉️ Send Final Reply\nGmail Threaded Reply]

    %% Spam Branch
    C -->|SPAM| K[🗑️ Route to Dashboard Spam Folder]
    
    %% No-Reply Branch
    C -->|"NO_REPLY / Fallback"| M[📁 Log No Reply\nSet Node Audit Trail]
```

---

## 🚀 System Features

1. **Native Thread-Aware Gmail Integration**:
   - Captures incoming emails, threads, and metadata via Gmail.
   - Replies are threaded using Gmail's `reply` operation with the originating `messageId`.

2. **AI Triage & Drafting**:
   - Uses GPT-4o-mini via OpenRouter to classify messages into:
     - `AUTO_REPLY`: Automatically answers routine emails.
     - `HUMAN_APPROVAL`: Moves sensitive/complex emails to the Dashboard CRM for human review and final sending.
     - `NO_REPLY`: Skips auto-replies for transactional emails but logs them.
     - `SPAM`: Directly routes to the Dashboard Spam folder.
   - Pre-drafts a professional, context-aware email response.

3. **Admin Dashboard CRM**: 
   - A central Next.js UI to view classified emails, approve/edit AI-drafted replies, and monitor stats.

4. **Telegram Notifications**: 
   - Alerts the team whenever an email needs human approval or when an auto-reply is successfully sent.

---

## 🛡 Mandatory Human Approval Rules

The workflow strictly enforces mandatory human approval. The AI agent will **never** auto-reply to emails involving any of the following:

| Topic | Criteria & Examples |
| :--- | :--- |
| **Pricing & Quotes** | Price inquiries, rate sheets, enterprise quotations, discount requests |
| **Contracts & Legal** | Agreements, NDAs, terms of service, SLA disputes, legal liabilities |
| **Refunds & Billing** | Refund demands, payment disputes, chargebacks, fee cancellations |
| **Complaints & Escalations** | Customer dissatisfaction, bug reports affecting business, escalations |
| **Commercial Negotiations** | Partnership discussions, vendor negotiations, custom commitments |
| **Sensitive Information** | Account credentials, PII, financial info, proprietary data |

---

## 🐳 Running Locally with Docker

The entire stack is configured to run using a single `docker-compose.yml` file. It spins up:
- **n8n** (port `5678`)
- **Dashboard Web** (Next.js - port `3000`)
- **Dashboard Database** (PostgreSQL - port `5433` on host, `5432` internally)

### 1. Environment Variables
Copy `.env.example` to `.env` in the root directory (if needed) and in `./dashboard`.
```bash
cp dashboard/.env.example dashboard/.env
```

### 2. Start Services
```bash
docker-compose up -d --build
```

### 3. Check Logs & Status
```bash
docker-compose logs -f
```

*(Note: The database is initialized automatically by the `dashboard-init` container pushing the Prisma schema on startup).*

---

## 🔑 Prerequisites & Credentials Setup

### 1. Gmail Integration (OAuth2)
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the **Gmail API**.
3. Set up **OAuth consent screen** (add yourself as a Test User!).
4. Create **OAuth client ID** (Web application). The Authorized redirect URI will be `http://localhost:5678/rest/oauth2-credential/callback`.

### 2. OpenRouter API
1. Go to [OpenRouter.ai](https://openrouter.ai/keys) and generate an API key.

### 3. Telegram Bot & Chat Setup
1. Use [@BotFather](https://t.me/BotFather) to create a bot and get the **HTTP API Token**.
2. Start a chat with the bot and find your Chat ID using [@get_id_bot](https://t.me/get_id_bot).

---

## ⚙️ n8n Configuration & Workflow Setup

1. **Access n8n**: Open [http://localhost:5678](http://localhost:5678). Create your local admin account.
2. **Import Workflow**:
   - Go to **Workflows** > **Add Workflow** > **Import from File**.
   - Select `final_workflow.json` located in the root of this project.
3. **Configure Credentials**:
   - Add **Gmail OAuth2** and sign in.
   - Add **OpenRouter API** and paste your key.
   - Add **Telegram API** and paste your Bot Token.
4. **Environment Variables / Constants**:
   - Ensure the Telegram Chat ID is set in the workflow. (You can replace `{{$env.TELEGRAM_CHAT_ID}}` in the Telegram nodes directly with your actual numeric Chat ID if it's not loading from `.env`).
5. **Activate the Workflow**: Toggle the switch in the top right corner of the n8n UI to turn the workflow "Active".

---

## 💻 Dashboard Usage

1. Open [http://localhost:3000](http://localhost:3000).
2. Create an account or sign in (powered by `better-auth`).
3. **Pending Approvals**: View emails that were classified as `HUMAN_APPROVAL`. You can click on them, review the AI's generated draft, edit the response, and click **Approve & Send**.
4. **Send Action**: Once approved, the Dashboard hits the n8n webhook (`/webhook/dashboard-response`), which then triggers the Gmail node to send the final reply.
5. **Spam**: Check emails routed as spam without manual intervention.

---

## ✏️ Customizing the AI System Prompt (Business Profile)

The **AI Email Analyzer** node contains a system prompt with two sections you must personalize before going live: the **Business Profile** (who you are) and the **Response Drafting Rules** (how the AI should write on your behalf).

### Where to Find the System Prompt
1. Open the workflow canvas in n8n.
2. Click the **`AI Email Analyzer`** node.
3. In the node settings panel, scroll down to **Options** and click on **System Message**.
4. Update the **BUSINESS PROFILE & KNOWLEDGE BASE** section with your actual company details, office hours, and services.
5. **Save** the workflow.

---

## 📂 Directory Structure

```text
.
├── docker-compose.yml       # Main deployment file for n8n, Next.js, Postgres
├── final_workflow.json      # Unified n8n workflow for AI Email Automation
├── dashboard/               # Next.js web application (Admin Dashboard CRM)
├── README.md                # This documentation file
├── .env.example             # Template for root environment variables
└── local-files/             # Mounted directory for n8n local file access
```

---

## 🔧 Troubleshooting

- **n8n Database Ballooning**: Execution pruning is enabled in `docker-compose.yml` to prevent the n8n database from growing indefinitely.
- **Dashboard Database Connection**: If the Next.js app cannot connect to Postgres, ensure the `DATABASE_URL` in `dashboard/.env` points to `postgresql://dashboard:dashboard_secret@dashboard-db:5432/dashboard_db`.
- **Webhook Secrets**: The environment variable `WEBHOOK_SECRET` must match between n8n's `Send to Dashboard` HTTP Request node and the Dashboard's `.env` configuration.
