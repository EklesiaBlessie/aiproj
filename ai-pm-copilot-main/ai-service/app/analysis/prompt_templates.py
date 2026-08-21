class PromptTemplates:

    ANALYZE_FEEDBACK = """
You are an experienced AI Product Manager.

You are given customer reviews, support tickets and feature requests.

Analyze the provided context and perform ALL of the following tasks.

1. Generate a short summary.

2. Extract major customer themes.

3. Identify customer pain points.

4. Cluster similar feature requests.

5. Analyze issue trends.

6. Assign an overall priority.
Priority should be:
High
Medium
Low

7. Give product improvement recommendations.

Return ONLY valid JSON.

Use exactly this format:

{{
    "summary":"",

    "themes":[
        {{
            "name":""
        }}
    ],

    "pain_points":[
        {{
            "issue":"",
            "severity":""
        }}
    ],

    "feature_clusters":[
        {{
            "feature":"",
            "count":0
        }}
    ],

    "trends":[
        {{
            "issue":"",
            "frequency":0
        }}
    ],

    "priority":"",

    "recommendations":[
        {{
            "suggestion":""
        }}
    ]
}}

Context:

{context}
"""