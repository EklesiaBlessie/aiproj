from app.llm.gemini import GeminiService

class AgentsService:
    def __init__(self, retriever=None):
        self.retriever = retriever
        self.llm = GeminiService()

    def run_research(self, topic: str) -> str:
        """
        Research Agent compiles customer feedback context and generates a deep insights report.
        """
        # Retrieve relevant user feedback if retriever is available
        context_docs = ""
        if self.retriever:
            docs = self.retriever.search(topic, limit=8)
            context_docs = "\n".join([f"- {d['text']}" for d in docs])
        
        prompt = f"""
You are an expert AI Research Agent for a product team.
Generate a comprehensive Product Research Report on the following topic: "{topic}".

Use the customer feedback context below (if any) to ground your research:
{context_docs if context_docs else "No specific customer feedback context provided."}

Structure your report into the following sections:
1. Executive Summary
2. Core Customer Pain Points (extracted from feedback)
3. Severity and Impact Analysis
4. Strategic Opportunities
5. Immediate Next Steps / Recommended Features
"""
        return self.llm.generate(prompt)

    def run_competitor_analysis(self, topic: str) -> str:
        """
        Competitor Agent analyses market dynamics and maps competitor positioning matrices.
        """
        prompt = f"""
You are an expert AI Competitive Intelligence Agent.
Generate a deep Market & Competitor Analysis Report on the following feature/topic: "{topic}".

Evaluate key competitors (including fictional or standard industry competitors in this delivery app domain).
Structure your report into:
1. Competitor Landscape Overview
2. Benchmarking Matrix (Features, Usability, Tech Stack comparison)
3. Competitor Weaknesses & Gaps
4. Differentiation Strategy (How our application can win)
"""
        return self.llm.generate(prompt)

    def run_sprint_planning(self, features: list) -> str:
        """
        Sprint Planning Agent breaks down a list of features or user stories into sprint sprints.
        """
        features_str = "\n".join([f"- {f}" for f in features])
        prompt = f"""
You are an expert Agile Scrum Master Agent.
You are tasked with breaking down the following product backlog items into a Sprint Plan:
{features_str}

Analyze the features, estimate typical priorities/dependencies, and structure a 2-week Sprint Plan.
Your plan must include:
1. Sprint Goal (for the upcoming sprint)
2. Backlog Items allocated to Sprint 1
3. Backlog Items allocated to Sprint 2 (future sprint)
4. Key sprint dependencies & technical preparation steps
"""
        return self.llm.generate(prompt)

    def run_risk_analysis(self, prd_content: str) -> str:
        """
        Risk Agent analyzes a product PRD draft or description to identify technical, operational, and delivery risks.
        """
        prompt = f"""
You are an expert AI Risk & Dependency Analysis Agent.
Review the following Product Requirement Document (PRD) or project outline:
"{prd_content}"

Perform a thorough Risk Assessment. Structure your analysis into:
1. High-Level Technical Risk Assessment (scale 1-10)
2. Operational & Business Risks
3. Technical Blocker Analysis (system integrations, performance, scale)
4. Risk Mitigation Matrix (listing each risk, probability, impact, and concrete mitigation steps)
5. Crucial project dependencies & critical paths
"""
        return self.llm.generate(prompt)
