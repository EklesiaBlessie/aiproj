# AI Product Manager Copilot - Design System & Ideas

## Design Philosophy: Modern Dark Intelligence

The AI PM Copilot dashboard embodies a **premium, data-driven aesthetic** that prioritizes clarity, depth, and intelligent information hierarchy. This is a professional tool for product leaders—the design must feel authoritative, responsive, and crafted.

### Core Design Principles

1. **Depth Through Subtle Layering**: Use soft shadows, glass-morphism effects, and layered backgrounds to create visual hierarchy without clutter.
2. **Data Clarity First**: Charts, metrics, and insights are the hero. Typography and spacing serve the data, not the reverse.
3. **Intentional Color**: Dark background (charcoal-to-black) with strategic accent colors (electric blue, emerald green) for CTAs and highlights.
4. **Responsive Micro-interactions**: Smooth transitions on hover, focus states, and state changes. Nothing feels static.
5. **Accessibility by Default**: High contrast ratios, clear focus rings, and semantic HTML ensure the tool is usable for all.

### Color Philosophy

- **Background**: Deep charcoal (`oklch(0.12 0.01 280)`) creating a calm, focused environment.
- **Cards/Surfaces**: Slightly lighter charcoal (`oklch(0.18 0.01 280)`) with subtle borders for definition.
- **Primary Accent**: Electric blue (`oklch(0.55 0.24 260)`) for CTAs, active states, and key highlights.
- **Secondary Accent**: Emerald green (`oklch(0.60 0.18 140)`) for positive metrics and success states.
- **Warning/Alert**: Amber (`oklch(0.70 0.20 60)`) for medium severity; Red (`oklch(0.60 0.25 25)`) for high severity.
- **Text**: Off-white (`oklch(0.92 0.01 280)`) for primary text; muted gray (`oklch(0.65 0.02 280)`) for secondary.

### Layout Paradigm

**Asymmetric Sidebar + Content Grid**: A persistent left sidebar (collapsible on mobile) houses navigation and workspace switcher. The main content area uses a flexible grid system that adapts from 1-column (mobile) to 3-column (desktop). This breaks away from centered, symmetric layouts and creates visual interest.

### Signature Elements

1. **Metric Cards with Micro-trends**: KPI cards show the main number, a sparkline chart, and a trend badge (e.g., "+12% this month"). The trend color changes based on sentiment (green for positive, red for negative).
2. **Glass-morphism Panels**: Feedback charts and data tables sit in semi-transparent containers with backdrop blur, creating a sense of depth and modernity.
3. **Animated Data Transitions**: When metrics update or filters change, numbers and charts animate smoothly (300–500ms) rather than snapping.

### Interaction Philosophy

- **Hover States**: Subtle lift effect (shadow increase) and background color shift on card hover.
- **Focus States**: Clear blue outline (3px) on keyboard focus for accessibility.
- **Loading States**: Skeleton screens for data-heavy sections; spinner icon for quick operations.
- **Empty States**: Friendly, illustrated empty states with clear CTAs to guide users to the next action.

### Animation Guidelines

- **Entrance**: Cards and charts fade in + slide up (200–300ms, ease-out).
- **Hover**: Lift effect (transform: translateY(-2px)) with shadow increase (100–150ms).
- **State Changes**: Smooth color/opacity transitions (200–250ms) for metric updates.
- **Modals/Drawers**: Slide in from the side or fade + scale (300–400ms).
- **Respect prefers-reduced-motion**: All animations gate behind `@media (prefers-reduced-motion: no-preference)`.

### Typography System

- **Display Font**: "Geist" or "Sora" (modern, geometric sans-serif) for headings and brand elements.
- **Body Font**: "Inter" or "Outfit" (clean, readable sans-serif) for body text and data.
- **Hierarchy**:
  - **H1**: 32px, 700 weight, letter-spacing -0.5px (page titles)
  - **H2**: 24px, 600 weight (section headers)
  - **H3**: 18px, 600 weight (subsection headers)
  - **Body**: 14px, 400 weight (default text)
  - **Small**: 12px, 400 weight (labels, metadata)
  - **Mono**: "Fira Code" or "JetBrains Mono" for code snippets and technical data.

### Brand Essence

**Positioning**: The intelligent copilot for product leaders—turning customer feedback and analytics into actionable insights, powered by AI.

**Personality Adjectives**: Analytical, Intuitive, Trustworthy.

**Brand Voice**:
- Headlines: Direct, action-oriented. Example: "Your top pain points this week" (not "Feedback Summary").
- CTAs: Clear and specific. Example: "Generate PRD for this feature" (not "Get Started").
- Microcopy: Helpful and concise. Example: "No feedback yet. Upload your first data source to begin." (not "Welcome to the app").

### Wordmark & Logo

**Logo Concept**: A stylized brain icon merged with an upward arrow, symbolizing intelligence and growth. The icon uses the primary accent color (electric blue) on a transparent background. The wordmark "Copilot" uses the display font in bold.

### Signature Brand Color

**Electric Blue** (`oklch(0.55 0.24 260)`): Unmistakably the brand's primary accent. Used for all primary CTAs, active navigation states, and key data highlights.

---

## UI Modules & Component Structure

### 1. **Sidebar Navigation**
- Persistent left sidebar with workspace switcher at the top.
- Navigation items grouped by category (Overview, Data Ingestion, AI Analysis, Generate, Assistant).
- Active state: blue background + white text.
- Collapsible on mobile (hamburger menu).

### 2. **Dashboard Page**
- **Header**: Page title, settings button, import data button.
- **KPI Cards**: 4 cards showing Total Feedback, Themes Found, Feature Requests, PRDs Generated.
- **Charts Section**: Feedback Volume (line chart), Data Sources (bar chart).
- **Tables**: Top Pain Points (table with theme, count, trend, severity).
- **Recent PRDs**: List of recently generated PRDs with status badges.

### 3. **Feedback Ingestion Page**
- Upload area for CSV/PDF files.
- Connected data sources list with sync status.
- Raw feedback items table with filtering and search.

### 4. **Theme Extraction Page**
- Themes list with clustering visualization (optional bubble chart).
- Manual merge/split controls.
- Theme details panel showing related feedback items.

### 5. **Feature Prioritization Page**
- RICE-scored backlog table (sortable by score, reach, impact, etc.).
- Detailed view showing AI-generated rationale.
- Editable fields for PM overrides.

### 6. **PRD Generator Page**
- Feature request selection.
- "Generate PRD" button triggering the AI.
- Rich text editor for PRD content.
- User stories list with acceptance criteria.
- Export options (PDF, Word).

### 7. **Roadmap Page**
- Drag-and-drop Kanban board or Gantt timeline.
- Lanes for product areas; columns for quarters.
- AI auto-suggest feature.

### 8. **Chat Assistant Page**
- Chat interface with message history.
- Streaming responses with citations.
- Tool-calling support (e.g., "Generate PRD for this theme").

---

## Implementation Notes

- Use Tailwind CSS 4 with custom theme variables in `index.css`.
- Leverage shadcn/ui components for consistency and accessibility.
- Implement Zustand for global state (workspace, user, filters).
- Use Recharts for all data visualizations.
- Ensure mobile responsiveness with breakpoints at 640px, 1024px, 1280px.
- Test keyboard navigation and screen reader compatibility.
