import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Loader2, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/trpc';
import { requestAnalysis, AI_UNAVAILABLE_MESSAGE } from '@/lib/interactions';

/* ────────────────────────────────────────────────────────────────────────────
 * Roadmap board.
 *
 * Cards live in MongoDB (GET/POST/PATCH/DELETE /api/roadmap) and are scoped to
 * the signed-in user. Dragging a card writes its new column and the resulting
 * order of that column through PATCH /api/roadmap/reorder, so a drop survives a
 * refresh — the page previously rendered a hardcoded object with `cursor-move`
 * styling and no drag handlers at all, and the "Drop features here" lanes were
 * inert divs.
 *
 * Auto-suggest is the one thing here that needs Yash's NLP service. It calls
 * /api/analyze, detects the `mock: true` fallback, and says so. It does not
 * invent suggestions, and it does not substitute a non-AI heuristic.
 * ──────────────────────────────────────────────────────────────────────── */

const QUARTERS = ['Q3 2026', 'Q4 2026', 'Q1 2027'] as const;
const LANES = ['Growth', 'Core', 'Platform'] as const;
const EFFORTS = ['S', 'M', 'L', 'XL'] as const;

interface RoadmapCard {
  _id: string;
  title: string;
  quarter: string;
  lane?: string | null;
  status: 'planned' | 'in_progress' | 'done';
  effort?: string;
  team?: string;
  order: number;
}

/** Where a drag started, so the drop handler can rebuild both columns. */
interface DragOrigin {
  id: string;
  quarter: string;
  lane: string | null;
}

export default function Roadmap() {
  const [cards, setCards] = useState<RoadmapCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragOrigin | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  // Auto-suggest (AI) state — kept separate from the board so a failed
  // suggestion never blanks real cards.
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newQuarter, setNewQuarter] = useState<string>(QUARTERS[0]);
  const [newLane, setNewLane] = useState<string>(LANES[1]);
  const [newEffort, setNewEffort] = useState<string>('M');
  const [newTeam, setNewTeam] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const loadCards = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/roadmap');
      setCards(response.data.data ?? []);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Could not load your roadmap');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const byQuarter = useMemo(() => {
    const map = new Map<string, RoadmapCard[]>();
    for (const quarter of QUARTERS) map.set(quarter, []);
    for (const card of cards) {
      if (!map.has(card.quarter)) map.set(card.quarter, []);
      map.get(card.quarter)!.push(card);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return map;
  }, [cards]);

  const byLane = useMemo(() => {
    const map = new Map<string, RoadmapCard[]>();
    for (const lane of LANES) map.set(lane, []);
    const unassigned: RoadmapCard[] = [];
    for (const card of cards) {
      if (card.lane && map.has(card.lane)) map.get(card.lane)!.push(card);
      else unassigned.push(card);
    }
    for (const list of map.values()) list.sort((a, b) => a.order - b.order);
    return { map, unassigned: unassigned.sort((a, b) => a.order - b.order) };
  }, [cards]);

  /**
   * Persist a move. The optimistic state update is applied first so the card
   * appears in its new column immediately, then rolled back if the write fails
   * — a board that shows a move the database rejected is the same lie as one
   * that never saved.
   */
  const persistMove = async (moved: RoadmapCard[], previous: RoadmapCard[]) => {
    try {
      const response = await api.patch('/roadmap/reorder', {
        items: moved.map((card) => ({
          id: card._id,
          quarter: card.quarter,
          lane: card.lane ?? null,
          order: card.order,
        })),
      });
      const { modified } = response.data ?? {};
      if (modified === 0) {
        setCards(previous);
        toast.error('Move not saved', { description: 'The server did not accept the change.' });
        return;
      }
      toast.success('Roadmap updated', { description: 'Position saved — it will persist on reload.' });
    } catch (err: any) {
      setCards(previous);
      toast.error('Move failed', {
        description: err.response?.data?.error || err.message || 'Could not save the new position',
      });
    }
  };

  const handleDrop = (targetQuarter: string, targetLane: string | null, useLaneAsTarget: boolean) => {
    setDropTarget(null);
    const origin = dragging;
    setDragging(null);
    if (!origin) return;

    const card = cards.find((c) => c._id === origin.id);
    if (!card) return;

    // Dropping a card back where it came from is a no-op, not a save.
    const sameQuarter = useLaneAsTarget ? true : card.quarter === targetQuarter;
    const sameLane = useLaneAsTarget ? (card.lane ?? null) === targetLane : true;
    if (sameQuarter && sameLane) return;

    const previous = cards;
    const updated: RoadmapCard = {
      ...card,
      quarter: useLaneAsTarget ? card.quarter : targetQuarter,
      lane: useLaneAsTarget ? targetLane : card.lane ?? null,
    };

    // Append to the end of the destination column and renumber it, so `order`
    // stays dense and every sibling's stored position matches what is drawn.
    const destination = cards
      .filter((c) =>
        c._id !== card._id &&
        (useLaneAsTarget ? (c.lane ?? null) === targetLane : c.quarter === targetQuarter)
      )
      .sort((a, b) => a.order - b.order);

    const renumbered = [...destination, updated].map((c, index) => ({ ...c, order: index }));
    const renumberedById = new Map(renumbered.map((c) => [c._id, c]));

    setCards((current) => current.map((c) => renumberedById.get(c._id) ?? c));

    persistMove(renumbered, previous);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Give the item a title');
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post('/roadmap', {
        title: newTitle.trim(),
        quarter: newQuarter,
        lane: newLane,
        effort: newEffort,
        team: newTeam.trim() || undefined,
      });
      setCards((prev) => [...prev, response.data.data]);
      toast.success('Roadmap item added', { description: `"${response.data.data.title}" saved to ${newQuarter}` });
      setNewTitle('');
      setNewTeam('');
      setShowAdd(false);
    } catch (err: any) {
      const details = err.response?.data?.details;
      toast.error('Could not add item', {
        description: Array.isArray(details) && details.length
          ? details.map((d: any) => d.message).join('; ')
          : err.response?.data?.error || err.message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (card: RoadmapCard) => {
    const previous = cards;
    setCards((prev) => prev.filter((c) => c._id !== card._id));
    try {
      await api.delete(`/roadmap/${card._id}`);
      toast.success(`"${card.title}" deleted`);
    } catch (err: any) {
      setCards(previous);
      toast.error('Delete failed', { description: err.response?.data?.error || err.message });
    }
  };

  const cycleStatus = async (card: RoadmapCard) => {
    const next: RoadmapCard['status'] =
      card.status === 'planned' ? 'in_progress' : card.status === 'in_progress' ? 'done' : 'planned';

    const previous = cards;
    setCards((prev) => prev.map((c) => (c._id === card._id ? { ...c, status: next } : c)));
    try {
      await api.patch(`/roadmap/${card._id}`, { status: next });
      toast.success(`"${card.title}" → ${next.replace('_', ' ')}`);
    } catch (err: any) {
      setCards(previous);
      toast.error('Could not update status', { description: err.response?.data?.error || err.message });
    }
  };

  /**
   * Auto-suggest — Class B, blocked on Yash's /analyze service.
   *
   * Calls the real endpoint and reports exactly what came back. Because the
   * backend answers 200 with `mock: true` while FASTAPI_URL is unreachable,
   * this resolves within seconds to an explicit "not connected" message instead
   * of the old permanent "Processing your request..." toast. No suggestions are
   * fabricated here, by AI or otherwise.
   */
  const handleAutoSuggest = async () => {
    setIsSuggesting(true);
    setSuggestError(null);

    const context = cards.length
      ? `Suggest roadmap sequencing for: ${cards.map((c) => c.title).join(', ')}`
      : 'Suggest an initial product roadmap from recent customer feedback.';

    const result = await requestAnalysis(context);
    setIsSuggesting(false);

    if (!result.live) {
      setSuggestError(result.error ?? AI_UNAVAILABLE_MESSAGE);
      toast.warning('AI suggestions unavailable', { description: result.error ?? AI_UNAVAILABLE_MESSAGE });
      return;
    }

    // Reached only once a real service answers. Until then the endpoint always
    // reports mock, so there is deliberately nothing here that renders invented
    // roadmap content.
    toast.success('Analysis service responded', {
      description: 'Suggestion rendering lands with the real /analyze integration.',
    });
  };

  const renderCard = (card: RoadmapCard) => (
    <div
      key={card._id}
      draggable
      data-testid={`card-${card._id}`}
      onDragStart={(e) => {
        setDragging({ id: card._id, quarter: card.quarter, lane: card.lane ?? null });
        // Firefox ignores a drag without payload; the id also lets the drop
        // handler work if React state has not settled.
        e.dataTransfer.setData('text/plain', card._id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={() => {
        setDragging(null);
        setDropTarget(null);
      }}
      className={`p-4 rounded-lg bg-secondary/50 border border-border hover:bg-secondary transition-colors cursor-grab active:cursor-grabbing ${
        dragging?.id === card._id ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-medium text-foreground">{card.title}</p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => cycleStatus(card)}
            title="Click to change status"
            data-testid={`status-${card._id}`}
          >
            <Badge
              variant="outline"
              className={
                card.status === 'in_progress'
                  ? 'border-primary text-primary cursor-pointer'
                  : card.status === 'done'
                  ? 'border-chart-1 text-chart-1 cursor-pointer'
                  : 'border-muted-foreground text-muted-foreground cursor-pointer'
              }
            >
              {card.status === 'in_progress' ? 'In Progress' : card.status === 'done' ? 'Done' : 'Planned'}
            </Badge>
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive"
            onClick={() => handleDelete(card)}
            title="Delete item"
            data-testid={`delete-${card._id}`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex gap-2 text-xs">
        {card.effort && (
          <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
            {card.effort}
          </Badge>
        )}
        {card.team && (
          <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
            {card.team}
          </Badge>
        )}
        {card.lane && (
          <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
            {card.lane}
          </Badge>
        )}
      </div>
    </div>
  );

  /** Shared drop-zone props for both the quarter and lane boards. */
  const dropZone = (key: string, quarter: string, lane: string | null, useLane: boolean) => ({
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDropTarget(key);
    },
    onDragLeave: () => setDropTarget((current) => (current === key ? null : current)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      handleDrop(quarter, lane, useLane);
    },
    'data-testid': `drop-${key}`,
    className: dropTarget === key ? 'ring-2 ring-primary rounded-lg transition-all' : 'transition-all',
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Loading your roadmap...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-destructive">
          <AlertCircle className="w-12 h-12" />
          <p className="text-lg font-semibold">Failed to load roadmap</p>
          <p className="text-sm">{error}</p>
          <Button onClick={loadCards} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Product Roadmap</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Drag cards between quarters and lanes — positions are saved to your account
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowAdd((v) => !v)}
              variant="outline"
              className="gap-2 border-border hover:bg-secondary"
              data-testid="roadmap-add-toggle"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
            <Button
              onClick={handleAutoSuggest}
              disabled={isSuggesting}
              className="bg-primary hover:bg-primary/90 gap-2"
              data-testid="roadmap-autosuggest"
            >
              {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isSuggesting ? 'Checking service...' : 'Auto-suggest Roadmap'}
            </Button>
          </div>
        </div>

        {/* Honest AI state. Rendered only after a real round-trip, and phrased
            as unavailability rather than an error the user can act on. */}
        {suggestError && (
          <div
            className="mb-6 flex items-start gap-3 p-4 rounded-lg border border-chart-3/40 bg-chart-3/10"
            data-testid="roadmap-ai-unavailable"
          >
            <AlertCircle className="w-5 h-5 text-chart-3 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">AI suggestions unavailable</p>
              <p className="text-xs text-muted-foreground mt-1">{suggestError}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Everything else on this page works — add items and drag them between quarters.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setSuggestError(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}

        {showAdd && (
          <Card className="bg-card border-border mb-6">
            <CardHeader>
              <CardTitle className="text-lg">New roadmap item</CardTitle>
              <CardDescription>Saved to your account and placed at the end of its quarter</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="rm-title">Title</Label>
                  <Input
                    id="rm-title"
                    data-testid="roadmap-title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Improve checkout speed"
                    className="bg-secondary/50 border-border"
                    disabled={isCreating}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rm-quarter">Quarter</Label>
                  <select
                    id="rm-quarter"
                    data-testid="roadmap-quarter"
                    value={newQuarter}
                    onChange={(e) => setNewQuarter(e.target.value)}
                    disabled={isCreating}
                    className="w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground text-sm"
                  >
                    {QUARTERS.map((q) => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rm-lane">Lane</Label>
                  <select
                    id="rm-lane"
                    data-testid="roadmap-lane"
                    value={newLane}
                    onChange={(e) => setNewLane(e.target.value)}
                    disabled={isCreating}
                    className="w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground text-sm"
                  >
                    {LANES.map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rm-effort">Effort</Label>
                  <select
                    id="rm-effort"
                    data-testid="roadmap-effort"
                    value={newEffort}
                    onChange={(e) => setNewEffort(e.target.value)}
                    disabled={isCreating}
                    className="w-full px-3 py-2 rounded-md bg-secondary/50 border border-border text-foreground text-sm"
                  >
                    {EFFORTS.map((eff) => (
                      <option key={eff} value={eff}>{eff}</option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="rm-team">Team (optional)</Label>
                  <Input
                    id="rm-team"
                    data-testid="roadmap-team"
                    value={newTeam}
                    onChange={(e) => setNewTeam(e.target.value)}
                    placeholder="e.g. Backend"
                    className="bg-secondary/50 border-border"
                    disabled={isCreating}
                  />
                </div>
                <div className="md:col-span-3 flex gap-3">
                  <Button
                    type="submit"
                    disabled={isCreating}
                    className="bg-primary hover:bg-primary/90 gap-2"
                    data-testid="roadmap-create"
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Add to roadmap
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setShowAdd(false)} disabled={isCreating}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="bg-secondary border-border">
            <TabsTrigger value="timeline">Timeline View</TabsTrigger>
            <TabsTrigger value="lanes">By Lane</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-6">
            {QUARTERS.map((quarter) => {
              const items = byQuarter.get(quarter) ?? [];
              return (
                <Card key={quarter} className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">{quarter}</CardTitle>
                    <CardDescription>
                      {items.length} {items.length === 1 ? 'item' : 'items'} planned
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div {...dropZone(quarter, quarter, null, false)}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[120px] p-2">
                        {items.length > 0 ? (
                          items.map(renderCard)
                        ) : (
                          <div className="md:col-span-2 flex items-center justify-center h-[100px] rounded-lg border-2 border-dashed border-border">
                            <p className="text-sm text-muted-foreground">
                              Drag an item here, or add one above
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="lanes" className="space-y-6">
            {LANES.map((lane) => {
              const items = byLane.map.get(lane) ?? [];
              return (
                <Card key={lane} className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-lg">{lane}</CardTitle>
                    <CardDescription>
                      {items.length} {items.length === 1 ? 'item' : 'items'} in this lane
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div {...dropZone(`lane-${lane}`, '', lane, true)}>
                      <div className="space-y-3 min-h-[140px] p-4 rounded-lg bg-secondary/30 border-2 border-dashed border-border">
                        {items.length > 0 ? (
                          items.map(renderCard)
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-8">
                            Drop items here to assign them to {lane}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {byLane.unassigned.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg">Unassigned</CardTitle>
                  <CardDescription>Not yet in a lane — drag them into one above</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">{byLane.unassigned.map(renderCard)}</div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
