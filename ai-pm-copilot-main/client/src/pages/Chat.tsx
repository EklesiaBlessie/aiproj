import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

import {
  AlertCircle,
  Lightbulb,
  Loader2,
  MessageCircle,
  Send,
} from 'lucide-react';

import {
  AI_UNAVAILABLE_MESSAGE,
  requestCopilot,
} from '@/lib/interactions';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  unavailable?: boolean;
}

interface PrioritizedFeature {
  rank: number;
  name: string;
  score: number;
}

interface PrioritizationAnswer {
  framework?: string;
  ranked_features?: PrioritizedFeature[];
}

const suggestedQuestions = [
  'What are our top pain points this month?',
  'Generate a PRD for the PDF export feature',
  'Show me the RICE scores for all features',
  "What's the trend for mobile-related issues?",
];

const quickActions = [
  {
    label: 'Generate PRD',
    href: '/prd',
    hint: 'Create and manage PRD drafts',
  },
  {
    label: 'Show RICE Scores',
    href: '/prioritization',
    hint: 'RICE scores from real feedback',
  },
  {
    label: 'Analyze Trends',
    href: '/analytics',
    hint: 'Sentiment and category breakdowns',
  },
];

const now = () =>
  new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

export default function Chat() {
  const [, navigate] = useLocation();

  const [sessionId] = useState(() => Math.random().toString(36).substring(2, 15));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const send = async (text: string) => {
    const question = text.trim();

    if (!question || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: 'user',
      content: question,
      timestamp: now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      /*
       * IMPORTANT:
       *
       * Chat must use requestCopilot(), NOT requestAnalysis().
       *
       * requestCopilot() calls:
       *
       * POST http://127.0.0.1:8001/copilot
       *
       * The CopilotService then decides:
       *
       * RICE / ICE / MoSCoW -> PrioritizationService
       * PRD -> PRDService
       * Normal product question -> AIService / RAG
       */

      const result = await requestCopilot(question, sessionId);

      let content = '';

      if (result.live) {
        /*
         * NORMAL AI / RAG RESPONSE
         *
         * Most conversational questions return:
         *
         * {
         *   intent: "analyze",
         *   answer: "human readable answer",
         *   sources: [...]
         * }
         *
         * We display only the answer.
         * The raw sources are kept in the backend response
         * but are NOT dumped into the chat window.
         */
        if (typeof result.answer === 'string') {
          content = result.answer;
        } else if (result.data) {
          const copilotAnswer = result.data['answer'] as
            | string
            | PrioritizationAnswer
            | Record<string, unknown>
            | undefined;
          const intent =
            typeof result.data['intent'] === 'string'
              ? result.data['intent']
              : undefined;

          /*
           * NORMAL STRING ANSWER
           */
          if (typeof copilotAnswer === 'string') {
            content = copilotAnswer;
          }

          /*
           * FEATURE PRIORITIZATION
           *
           * Instead of displaying:
           *
           * {
           *   "framework": "RICE",
           *   "ranked_features": [...]
           * }
           *
           * display a clean conversational ranking.
           */
          else if (
            intent === 'prioritize' &&
            copilotAnswer &&
            typeof copilotAnswer === 'object' &&
            Array.isArray(
              (copilotAnswer as PrioritizationAnswer)
                .ranked_features,
            )
          ) {
            const prioritization =
              copilotAnswer as PrioritizationAnswer;
            const framework =
              prioritization.framework ||
              'Feature Prioritization';

            const ranked = prioritization.ranked_features!
              .map(
                (feature: PrioritizedFeature) =>
                  `${feature.rank}. ${feature.name} — ${feature.score}`,
              )
              .join('\n');

            content = `${framework} Prioritization\n\n${ranked}`;
          }

          /*
           * PRD / OTHER STRUCTURED RESPONSE
           *
           * Keep structured responses readable rather than
           * exposing the entire outer Copilot object.
           */
          else if (copilotAnswer) {
            content = JSON.stringify(copilotAnswer, null, 2);
          }

          /*
           * EMPTY RESPONSE
           */
          else {
            content = 'No response received from Copilot.';
          }
        } else {
          content = 'No response received from Copilot.';
        }
      } else {
        /*
         * AI SERVICE UNAVAILABLE
         */
        content =
          result.error ??
          AI_UNAVAILABLE_MESSAGE;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: 'assistant',
          content,
          timestamp: now(),
          unavailable: !result.live,
        },
      ]);
    } catch (error) {
      console.error(
        'Copilot request failed:',
        error,
      );

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: 'assistant',
          content:
            'Unable to connect to the AI Product Manager service. Please make sure the backend and FastAPI AI service are running.',
          timestamp: now(),
          unavailable: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 h-screen flex flex-col">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            Ask Copilot
          </h1>

          <p className="text-sm text-muted-foreground mt-2">
            AI Product Manager Assistant — ask about feedback,
            pain points, trends, features and product priorities.
          </p>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-0">

          {/* Chat */}
          <div className="lg:col-span-3 flex flex-col min-h-0">
            <Card className="bg-card border-border flex-1 flex flex-col overflow-hidden">

              <CardHeader className="border-b border-border">
                <CardTitle>Chat</CardTitle>

                <CardDescription>
                  Ask product-related questions and get AI-powered
                  insights from customer feedback.
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 overflow-hidden p-0">
                <div
                  ref={scrollRef}
                  className="h-full overflow-y-auto p-4 space-y-4"
                >

                  {/* Empty state */}
                  {messages.length === 0 && (
                    <div className="flex justify-start">
                      <div className="max-w-md px-4 py-3 rounded-lg bg-secondary/50 border border-border">

                        <div className="flex items-center gap-2 mb-1">
                          <MessageCircle className="w-4 h-4 text-primary" />

                          <span className="text-xs font-semibold text-primary">
                            AI Product Manager
                          </span>
                        </div>

                        <p className="text-sm">
                          Hi! I’m your AI Product Manager Assistant.
                          Ask me about customer pain points, trends,
                          feature priorities, PRDs, or product improvements.
                        </p>

                        <p className="text-xs opacity-70 mt-2">
                          {now()}
                        </p>

                      </div>
                    </div>
                  )}

                  {/* Messages */}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.role === 'user'
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : msg.unavailable
                              ? 'bg-chart-3/10 border border-chart-3/40 text-foreground'
                              : 'bg-secondary/50 border border-border text-foreground'
                        }`}
                        data-testid={
                          msg.unavailable
                            ? 'chat-unavailable'
                            : undefined
                        }
                      >

                        {msg.unavailable && (
                          <div className="flex items-center gap-2 mb-1">
                            <AlertCircle className="w-4 h-4 text-chart-3" />

                            <span className="text-xs font-semibold text-chart-3">
                              AI assistant unavailable
                            </span>
                          </div>
                        )}

                        <p className="text-sm whitespace-pre-wrap">
                          {msg.content}
                        </p>

                        <p className="text-xs opacity-70 mt-1">
                          {msg.timestamp}
                        </p>

                      </div>
                    </div>
                  ))}

                  {/* Loading */}
                  {isSending && (
                    <div className="flex justify-start">
                      <div className="px-4 py-3 rounded-lg bg-secondary/50 border border-border flex items-center gap-2">

                        <Loader2 className="w-4 h-4 animate-spin text-primary" />

                        <span className="text-sm text-muted-foreground">
                          AI Product Manager is thinking...
                        </span>

                      </div>
                    </div>
                  )}

                </div>
              </CardContent>

              {/* Input */}
              <div className="border-t border-border p-4">
                <div className="flex gap-2">

                  <Input
                    placeholder="Ask your product question..."
                    value={input}
                    onChange={(e) =>
                      setInput(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        send(input);
                      }
                    }}
                    disabled={isSending}
                    data-testid="chat-input"
                    className="bg-secondary border-border"
                  />

                  <Button
                    onClick={() => send(input)}
                    disabled={
                      isSending ||
                      !input.trim()
                    }
                    data-testid="chat-send"
                    className="bg-primary hover:bg-primary/90 gap-2"
                  >
                    {isSending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>

                </div>
              </div>

            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">

            {/* Suggested Questions */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="w-4 h-4" />
                  Suggested Questions
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-2">
                {suggestedQuestions.map(
                  (question, idx) => (
                    <button
                      key={idx}
                      onClick={() => send(question)}
                      disabled={isSending}
                      data-testid={`chat-suggested-${idx}`}
                      className="w-full text-left p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-sm text-foreground border border-border disabled:opacity-50"
                    >
                      {question}
                    </button>
                  ),
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageCircle className="w-4 h-4" />
                  Quick Actions
                </CardTitle>

                <CardDescription className="text-xs">
                  Open product tools directly
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.href}
                    variant="outline"
                    onClick={() =>
                      navigate(action.href)
                    }
                    title={action.hint}
                    data-testid={`quick-${action.href.slice(1)}`}
                    className="w-full border-border hover:bg-secondary justify-start text-sm"
                  >
                    {action.label}
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Agent Status */}
            <Card className="bg-card border-border">
              <CardContent className="pt-6">

                <Badge
                  variant="outline"
                  className="border-green-500 text-green-500 mb-2"
                >
                  AI Product Manager Agent
                </Badge>

                <p className="text-xs text-muted-foreground">
                  Ask Copilot uses the connected AI analysis service
                  to generate product insights from customer feedback.
                </p>

              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}