# AI Product Manager Copilot - Architecture & UI Overview

Based on the files provided in the `AI-Product-Manager-Copilot-main.zip` archive, here is a comprehensive summary of the project architecture and the requirements for building the UI from scratch.

## Project Overview

The **AI Product Manager Copilot** is an intelligent assistant designed to streamline the product development lifecycle. It ingests multi-source product data (tickets, feedback, analytics), processes it through an AI pipeline (classification, clustering, prioritization), and outputs structured artifacts like Product Requirement Documents (PRDs), user stories, and roadmaps.

## Tech Stack

The project utilizes a modern, scalable tech stack:

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS, shadcn/ui, Zustand | User interface, state management, and styling |
| **Backend** | Node.js + Express.js + TypeScript | REST API gateway, CRUD metadata, user authentication |
| **AI Service (FastAPI)** | FastAPI (Python 3.11+) | Asynchronous AI service proxy, RAG pipeline, copilot route |
| **Database (Metadata)** | MongoDB (Mongoose) | Users, feedback data, roadmap items, and PRD drafts |
| **Vector DB** | Qdrant (Local storage) | Local vector database storing text chunks and embeddings |
| **Embedding Model** | Hugging Face `BAAI/bge-base-en-v1.5` | Free, local sentence embeddings generation (768 dimensions) |
| **AI/LLM** | Google Gemini (Gemini 3.5 Flash) | Generative reasoning for PRD creation and Ask Copilot chat |
| **Pipeline Service** | Groq (Llama-3 models) | Preprocessing pipelines and batch feedback ingestion/classification |

## UI Architecture & Key Modules

To build the UI from scratch, we need to focus on the following core modules and their corresponding views:

### 1. Dashboard & Reporting
- **Purpose:** Provide a high-level overview of product health and AI insights.
- **Key Components:**
  - Sentiment trends over time (charts using Recharts/Tremor).
  - Theme volume heatmaps.
  - RICE-ranked backlog summary table.
  - Recent activity and weekly digests.

### 2. Feedback & Theme Management
- **Purpose:** View and manage ingested customer feedback and AI-generated themes.
- **Key Components:**
  - List view of raw and processed feedback items.
  - Theme clustering visualization.
  - Manual override controls for AI classifications (merge/split themes).

### 3. Feature Prioritization (Backlog)
- **Purpose:** Rank and prioritize feature requests using the RICE scoring framework.
- **Key Components:**
  - Sortable and filterable table of feature requests.
  - Detailed view showing RICE score breakdown (Reach, Impact, Confidence, Effort) and AI-generated rationale.
  - Editable fields for PM overrides.

### 4. PRD & User Story Generation
- **Purpose:** Generate and edit Product Requirement Documents and user stories.
- **Key Components:**
  - Trigger button ("Generate PRD") from a feature request.
  - Rich text editor for reviewing and modifying the generated PRD.
  - List view of generated user stories with acceptance criteria.
  - Version history and export options (PDF, Word).

### 5. Roadmap Planning
- **Purpose:** Visualize and plan the product roadmap.
- **Key Components:**
  - Drag-and-drop Kanban board or Gantt-style timeline.
  - Lanes for different product areas (e.g., Growth, Core) and columns for quarters/sprints.
  - AI auto-suggest feature for roadmap placement.

### 6. Conversational Assistant (Chat)
- **Purpose:** Interact with the AI copilot for context-aware Q&A.
- **Key Components:**
  - Chat interface with streaming responses.
  - Citation links back to source feedback or documents.
  - Support for triggering actions (e.g., "Generate a PRD for this theme").

## Next Steps for UI Development

Since you are focusing on the UI part and will upload a UI architecture file, the next steps are:

1.  **Review UI Architecture:** I will analyze the UI architecture file you plan to upload to understand the specific component hierarchy, routing, and design system choices.
2.  **Initialize Project:** Set up the React frontend project with TypeScript, Tailwind CSS, and shadcn/ui.
3.  **Build Core Layout:** Create the main application shell, including navigation (sidebar/header) and routing structure.
4.  **Develop Modules:** Iteratively build out the UI components for each module (Dashboard, Feedback, Backlog, PRD, Roadmap, Chat) based on your design specifications.

I am ready to receive your UI architecture file and begin building the frontend!
