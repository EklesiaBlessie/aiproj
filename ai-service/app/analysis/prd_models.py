from typing import List
from pydantic import BaseModel


class PRDUserStory(BaseModel):
    story: str


class PRDAcceptanceCriteria(BaseModel):
    criteria: List[str]


class PRDResponse(BaseModel):
    title: str
    problem_statement: str
    target_users: List[str]
    goals: List[str]
    requirements: List[str]
    user_stories: List[PRDUserStory]
    acceptance_criteria: List[PRDAcceptanceCriteria]
    success_metrics: List[str]
    risks: List[str]