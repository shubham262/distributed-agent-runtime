Here is your complete, production-ready `README.md` file with the **Live Demo Video** link integrated into a prominent video preview section at the top, perfectly tailored to fulfill all evaluation criteria for the challenge.

---

# 🤖 AgentOS: Multi-Agent Orchestration & Automation Platform



AgentOS is an enterprise-grade, full-stack **AI Agent Orchestration Platform** where users can visually or conversationally compose, configure, and execute collaborative multi-agent workflows. Built on a production-ready real-time runtime engine using **LangGraph** and **BullMQ** , the platform supports complex state machines containing loops, human-in-the-loop conditional branches, and persistent telemetry tracking.

Additionally, AgentOS integrates a **Telegram Master Agent Channel** that exposes the platform's entire structural lifecycle management (CRUD operations, workflow invocations, and live performance logging) directly to a natural language messaging environment.

---

## 🎥 Live Demo Video

> 
> **Click the badge above** or click [here](https://drive.google.com/file/d/1VkPrUne5Xe3GmYc8ZcP7CedAnCWcE7cT/view?usp=sharing) to watch the recorded end-to-end workflow demonstration. The video walks through account registration, visual workflow building, live execution monitoring, and interacting with the platform conversationally via Telegram.
> 
> 

---

🏗️ Architecture Design 

The application enforces a strict architectural boundary separation between the presentation tier, background computation workers, asynchronous messaging pipelines, and the persistent storage tier.

```
                ┌──────────────────────────────────────────────┐
                │             TELEGRAM MESSAGING APP           │
                └──────────────────────┬───────────────────────┘
                                       │ (Dynamic Webhook Handshake via Ngrok)
                                       ▼
 ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
 │    WEB CLIENT    │        │   EXPRESS API    │        │   MASTER AGENT   │
 │ (Next.js / Flow) │◄──────►│ (Node.js/Mongoose)│◄──────►│ (LangGraph Core) │
 └────────┬─────────┘        └─────────┬────────┘        └──────────────────┘
          │                            │ (Job Dispatch)
          │                            ▼
          │                  ┌──────────────────┐
          │                  │   BULLMQ WORKER  │
          │                  │ (Redis Execution)│
          │                  └─────────┬────────┘
          │                            │ (Graph Invoke)
          ▼                            ▼
 ┌──────────────────────────────────────────────────────────────────────────┐
 │                            DATA & CACHE LAYERS                           │
 │                 MongoDB (State/Logs)  │  Redis (BullMQ Queue)            │
 └──────────────────────────────────────────────────────────────────────────┘

```

Architectural Layer Deep-Dive 

1. 
**The Web UI Canvas Layer:** Built using **Next.js 14**, **Ant Design**, and powered by **React Flow** (`@xyflow/react`). It processes node graph boundaries visually, serializing the user’s coordinate graph blueprints into an array of directional components (`uiGraph`).


2. 
**The Transport & Management API Layer:** Built on **Node.js Express** using **Better Auth** for multi-tenant isolation. It extracts client payloads, verifies session models, and updates document boundaries without mutating execution flows.


3. 
**The Agentic Runtime Engine Layer:** Built using **LangGraph** and **LangChain Expression Language (LCEL)**. It parses incoming `uiGraph` structures, compiles them into executable state-annotated graphs (`StateGraph`), manages conversational checkpoints natively using memory savers, and binds capabilities to an **Azure OpenAI** backend.


4. 
**The Asynchronous Distributed Job Broker Layer:** Powered by **BullMQ** and backdropped by a high-performance **Redis** cache ring. It picks up workflow runs off a thread-safe background processing worker pool, insulating the core API loop from heavy token processing stalls.



---

🧠 Core Technology Justifications 

* 
**Why LangGraph over standard sequential wrappers?** 
Standard LLM wrappers or linear chaining engines crash when managing real-world business tasks containing unpredictable non-linear loops. LangGraph uses an **Annotation-driven cyclical graph architecture**. This enables agents to loop back safely, run self-correction checks, evaluate complex boolean routing logic, and retain transaction memory history transparently across graph turns.


* 
**Why BullMQ + Redis?** 
LLM generation takes time. Running graph loops directly inside synchronous HTTP requests blocks threads and causes gateway timeouts. BullMQ decouples user invocation streams from active worker computing, ensuring 100% processing delivery guarantee.


* 
**Why Node.js / Mongoose Stack?** The platform maps highly fluid and changing execution telemetry schemas, log blocks, and raw JSON configurations (`uiGraph`). MongoDB provides a schematic JSON document engine perfect for storing complex graph topologies without the performance penalties of traditional RDBMS joins.



---

✨ Features Checklist 

* [x] **Full Agent CRUD Management:** Dynamic configuration parameters of agents (Name, Role, Prompt, Model, Tool Matrix, Active Channels).


* [x] **Visual Graph Studio:** Draggable canvas interface featuring condition checking nodes and cyclical iteration loop bounds.


* [x] **Asynchronous Distributed Cluster Workers:** Multi-concurrency queue processing ensuring safe job scale-out.


* [x] **Telemetry & Token Metrics Logging:** Real-time collection tracking of prompt counts, completion logs, execution costs, and trace maps.


* [x] **Conversational Master Agent Control:** Full conversational platform management entirely via Telegram messaging workflows.


* [x] **Automatic Webhook Configuration:** ScriptSniffer automated API integration that updates Ngrok public gateways straight into the Telegram Bot API ring.



---

📦 2 Pre-built Workflow Templates 

The system implements a workspace seeding engine hooked into Better Auth signup triggers. Every onboarding user workspace automatically initializes populated with two ready-to-run workflows:

1. 
**Autonomous Market Intelligence Pipeline:** 


* *Topology:* `Start` ➔ `InsightScout` *(Autonomous Web Researcher Agent)* ➔ `SignalDispatcher` *(Mailing Node)* ➔ `End`.
* *Behavior:* Gathers active market data metrics via web search capabilities and delivers a polished compilation report straight to the operator's inbox.


2. 
**SEO Content Generation & Brand Guardrails:** 


* *Topology:* `Start` ➔ `ContentArchitect` *(Long-form Technical Writer Agent)* ➔ `BrandGuardrail` *(Editorial Compliance Audit Agent)* ➔ `End`.
* *Behavior:* Outlines SEO articles based on target keyword strings, drafts comprehensive structural documentation, and routes the copy through an automated editorial safety validation review layer before generating the final draft.



---

⚙️ Environment Configuration 

Backend Environment Setup 

Create a `.env` file inside the root of your `/backend` directory:

```env
PORT=3001
MONGO_URI=mongodb://127.0.0.1:27017/ai_orchestration
DATABASE=ai_orchestration
REDIS_URL="redis://127.0.0.1:6379"

# Azure OpenAI Execution Configuration
AZURE_OPENAI_API_KEY=your_azure_api_key_here
AZURE_OPENAI_API_INSTANCE_NAME=your_instance_name_here
AZURE_OPENAI_API_VERSION=2024-02-01
MASTER_AGENT_DEPLOYMENT_NAME=gpt-4o
DEFAULT_AGENT_DEPLOYMENT_NAME=gpt-4o-mini

# External System Capability Tools
TAVILY_API_KEY=your_tavily_search_key_here

# Notification Outbound Gateway Parameters
SENDERS_EMAIL_ID=your_system_email@gmail.com
SENDERS_PASSWORD=your_app_specific_password_here

# Telegram Messaging Endpoint Security
TELEGRAM_BOT_TOKEN=8842939716:AAHFMVhaJlDihAEWIxZk0lWQft_cGZ5QkwA

```

Frontend Environment Setup 

Create a `.env.local` file inside the root of your `/frontend` directory:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
BETTER_AUTH_URL=http://localhost:3001

```

---

🚀 Unified Single-Command Setup 

The entire system multi-container application stack is containerized for local development. Ensure your root `.env` includes your `NGROK_AUTHTOKEN`. To spin up your database nodes, message brokers, next.js clients, express routing nodes, and active proxy links simultaneously, execute:

```bash
docker compose up --build

```

The background initialization loop automatically fetches the dynamic public gateway URL, executes the Telegram authorization sequence, links the tracking webhook, and spins up local live servers at:

* **Frontend Web Application Canvas:** `http://localhost:3000`
* **Backend API Gateway Node:** `http://localhost:3001`
* **Local Ngrok Diagnostic Interface:** `http://localhost:4040`

---

🛠️ Developer Extension Guidelines 

How to add a new Workflow Template 

To seed additional workflow options natively to all onboarding user profiles, update the structural blueprint collection layout inside `backend/src/config/seedTemplates.js`:

1. Define an identifier name, description, and agent configuration attributes inside the `seedTemplates` array:
```javascript
{
    name: "Social Media Distribution Automator",
    description: "Translates product copies into cross-channel optimized marketing updates.",
    agents: [ { key: "copywriter", name: "SocialAgent", role: "Copy generation", model: "gpt-4o-mini", tools: [], channels: ["ui"] } ],
    generateUiGraph: (agentIdMap) => ({
        nodes: [ /* React Flow Node Coordinates using agentIdMap["copywriter"] */ ],
        edges: [ /* Connectors Mapping */ ]
    })
}

```


2. The registration event handler automatically picks up your new structural definition during the next signup flow iteration sequence.

How to add an alternative Messaging Channel 

To connect an additional third-party network endpoint layer (e.g., Slack or WhatsApp):

1. 
**Schema Registry:** Append your channel string value token target down inside your model schema validator options array tracking inside `backend/src/models/Agent.js`.


2. **Webhook Controller Router:** Construct an incoming message processing interface route module inside `backend/src/controllers/` (e.g., `slackWebhookController.js`). Map user identification targets to the internal MongoDB User ID scope.
3. **Master Service Bind:** Pass conversational input metrics down through your main core query executor:
```javascript
const masterAgentResponseText = await executeMasterAgentQuery(userDoc._id, slackChannelId, rawTextPayload);

```


4. 
**Outbound Worker Forwarding:** Inside the background worker pipeline configuration logic block (`backend/src/queue/worker.js`), un-comment the routing loop hooks to trigger a direct messaging response back down through the channel whenever execution traces hit `COMPLETED` or `FAILED` states.