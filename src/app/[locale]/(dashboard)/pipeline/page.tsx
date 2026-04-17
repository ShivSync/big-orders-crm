"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Plus, User as UserIcon, Calendar, DollarSign, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Opportunity, OpportunityStage, OpportunityWithRelations, Lead, User, IndividualCustomer } from "@/types/database";

const STAGES: OpportunityStage[] = ["new", "consulting", "quoted", "negotiating", "won", "lost"];

const stageColors: Record<OpportunityStage, string> = {
  new: "bg-blue-50 border-blue-200",
  consulting: "bg-cyan-50 border-cyan-200",
  quoted: "bg-amber-50 border-amber-200",
  negotiating: "bg-orange-50 border-orange-200",
  won: "bg-green-50 border-green-200",
  lost: "bg-gray-50 border-gray-200",
};

const stageBadgeColors: Record<OpportunityStage, string> = {
  new: "bg-blue-100 text-blue-800",
  consulting: "bg-cyan-100 text-cyan-800",
  quoted: "bg-amber-100 text-amber-800",
  negotiating: "bg-orange-100 text-orange-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-gray-100 text-gray-800",
};

const STAGE_I18N_MAP: Record<OpportunityStage, string> = {
  new: "stageNew",
  consulting: "stageConsulting",
  quoted: "stageQuoted",
  negotiating: "stageNegotiating",
  won: "stageWon",
  lost: "stageLost",
};

function stageI18nKey(stage: OpportunityStage): string {
  return STAGE_I18N_MAP[stage];
}

function formatVND(value: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value);
}

function OpportunityCard({
  opp,
  t,
  onView,
}: {
  opp: OpportunityWithRelations;
  t: ReturnType<typeof useTranslations>;
  onView: (o: OpportunityWithRelations) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: opp.id,
    data: { stage: opp.stage },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0" {...listeners}>
              <p className="font-medium text-sm truncate">{opp.title}</p>
              {opp.expected_value > 0 && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {formatVND(opp.expected_value)}
                </p>
              )}
              {opp.stage === "won" && opp.actual_value && (
                <p className="text-xs text-green-700 font-medium mt-1">
                  {formatVND(opp.actual_value)}
                </p>
              )}
              {opp.stage === "lost" && opp.lost_reason && (
                <p className="text-xs text-gray-500 mt-1 truncate">{opp.lost_reason}</p>
              )}
            </div>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={() => onView(opp)}>
              <Eye className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            {opp.assigned_user && (
              <span className="flex items-center gap-1 truncate">
                <UserIcon className="h-3 w-3" />
                {opp.assigned_user.name}
              </span>
            )}
            {opp.expected_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(opp.expected_date).toLocaleDateString("vi-VN")}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StageColumn({
  stage,
  opportunities,
  t,
  onView,
}: {
  stage: OpportunityStage;
  opportunities: OpportunityWithRelations[];
  t: ReturnType<typeof useTranslations>;
  onView: (o: OpportunityWithRelations) => void;
}) {
  const stageKey = `stage${stage.charAt(0).toUpperCase()}${stage.slice(1)}` as
    | "stageNew" | "stageConsulting" | "stageQuoted" | "stageNegotiating" | "stageWon" | "stageLost";
  const totalValue = opportunities.reduce(
    (sum, o) => sum + (o.stage === "won" ? (o.actual_value ?? o.expected_value) : o.expected_value),
    0
  );

  return (
    <div className={`rounded-lg border-2 ${stageColors[stage]} p-3 flex flex-col min-h-[200px] max-h-[400px]`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm">{t(stageKey)}</h3>
          <p className="text-xs text-muted-foreground">
            {opportunities.length} &middot; {formatVND(totalValue)}
          </p>
        </div>
        <Badge variant="secondary" className={stageBadgeColors[stage]}>
          {opportunities.length}
        </Badge>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SortableContext items={opportunities.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          {opportunities.map((opp) => (
            <OpportunityCard key={opp.id} opp={opp} t={t} onView={onView} />
          ))}
        </SortableContext>
        {opportunities.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">{t("noOpportunities")}</p>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const t = useTranslations("pipeline");
  const tCommon = useTranslations("common");
  const supabase = useMemo(() => createClient(), []);

  const [opportunities, setOpportunities] = useState<OpportunityWithRelations[]>([]);
  const [users, setUsers] = useState<Pick<User, "id" | "name">[]>([]);
  const [qualifiedLeads, setQualifiedLeads] = useState<Pick<Lead, "id" | "full_name">[]>([]);
  const [customers, setCustomers] = useState<Pick<IndividualCustomer, "id" | "full_name">[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailOpp, setDetailOpp] = useState<OpportunityWithRelations | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Stage-change dialogs
  const [wonDialogOpen, setWonDialogOpen] = useState(false);
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [pendingStageChange, setPendingStageChange] = useState<{ id: string; stage: OpportunityStage } | null>(null);
  const [actualValue, setActualValue] = useState("");
  const [lostReason, setLostReason] = useState("");

  // Create form
  const [formTitle, setFormTitle] = useState("");
  const [formLeadId, setFormLeadId] = useState("");
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formExpectedValue, setFormExpectedValue] = useState("");
  const [formExpectedDate, setFormExpectedDate] = useState("");
  const [formAssignedTo, setFormAssignedTo] = useState("");
  const [formNotes, setFormNotes] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    const [oppsRes, usersRes, leadsRes, customersRes] = await Promise.all([
      supabase
        .from("opportunities")
        .select("*, lead:leads(id, full_name), customer:individual_customers(id, full_name), assigned_user:users!opportunities_assigned_to_fkey(id, name)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("users").select("id, name").eq("status", "active"),
      supabase.from("leads").select("id, full_name").eq("stage", "qualified").is("deleted_at", null),
      supabase.from("individual_customers").select("id, full_name").is("deleted_at", null),
    ]);

    if (oppsRes.data) setOpportunities(oppsRes.data as OpportunityWithRelations[]);
    if (usersRes.data) setUsers(usersRes.data);
    if (leadsRes.data) setQualifiedLeads(leadsRes.data);
    if (customersRes.data) setCustomers(customersRes.data);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateStage = async (id: string, newStage: OpportunityStage, extraFields?: Record<string, unknown>) => {
    const res = await fetch(`/api/opportunities/${id}/stage`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage, ...extraFields }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to update stage");
      return;
    }
    toast.success(t("opportunityUpdated"));
    loadData();
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeOpp = opportunities.find((o) => o.id === active.id);
    if (!activeOpp) return;

    // Determine target stage from the over element
    let targetStage: OpportunityStage | null = null;

    // Check if dropped over another opportunity
    const overOpp = opportunities.find((o) => o.id === over.id);
    if (overOpp) {
      targetStage = overOpp.stage;
    } else if (STAGES.includes(over.id as OpportunityStage)) {
      targetStage = over.id as OpportunityStage;
    }

    if (!targetStage || targetStage === activeOpp.stage) return;

    if (targetStage === "won") {
      setPendingStageChange({ id: activeOpp.id, stage: "won" });
      setActualValue(String(activeOpp.expected_value || ""));
      setWonDialogOpen(true);
      return;
    }
    if (targetStage === "lost") {
      setPendingStageChange({ id: activeOpp.id, stage: "lost" });
      setLostReason("");
      setLostDialogOpen(true);
      return;
    }

    updateStage(activeOpp.id, targetStage);
  };

  const handleWonConfirm = () => {
    if (!pendingStageChange || !actualValue) return;
    updateStage(pendingStageChange.id, "won", { actual_value: parseInt(actualValue, 10) });
    setWonDialogOpen(false);
    setPendingStageChange(null);
  };

  const handleLostConfirm = () => {
    if (!pendingStageChange || !lostReason.trim()) return;
    updateStage(pendingStageChange.id, "lost", { lost_reason: lostReason.trim() });
    setLostDialogOpen(false);
    setPendingStageChange(null);
  };

  const handleCreate = async () => {
    if (!formTitle.trim()) return;
    const res = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: formTitle.trim(),
        lead_id: formLeadId || null,
        customer_id: formCustomerId || null,
        expected_value: formExpectedValue ? parseInt(formExpectedValue, 10) : 0,
        expected_date: formExpectedDate || null,
        assigned_to: formAssignedTo || null,
        notes: formNotes || null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Failed to create opportunity");
      return;
    }
    toast.success(t("opportunityCreated"));
    setCreateDialogOpen(false);
    resetForm();
    loadData();
  };

  const resetForm = () => {
    setFormTitle("");
    setFormLeadId("");
    setFormCustomerId("");
    setFormExpectedValue("");
    setFormExpectedDate("");
    setFormAssignedTo("");
    setFormNotes("");
  };

  // Pipeline summary
  const openOpps = opportunities.filter((o) => !["won", "lost"].includes(o.stage));
  const pipelineValue = openOpps.reduce((sum, o) => sum + (o.expected_value || 0), 0);
  const wonOpps = opportunities.filter((o) => o.stage === "won");
  const wonValue = wonOpps.reduce((sum, o) => sum + (o.actual_value || o.expected_value || 0), 0);

  const activeOpp = activeId ? opportunities.find((o) => o.id === activeId) : null;

  const oppsByStage = (stage: OpportunityStage) => opportunities.filter((o) => o.stage === stage);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("dragToChangeStage")}
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            {t("createOpportunity")}
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t("createOpportunity")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t("opportunityTitle")} *</Label>
                <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("sourceLead")}</Label>
                  <Select value={formLeadId} onValueChange={(v) => setFormLeadId(v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {qualifiedLeads.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">{t("qualifiedLeadsOnly")}</p>
                </div>
                <div>
                  <Label>{t("linkedCustomer")}</Label>
                  <Select value={formCustomerId} onValueChange={(v) => setFormCustomerId(v ?? "")}>
                    <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t("expectedValue")} (VND)</Label>
                  <Input type="number" value={formExpectedValue} onChange={(e) => setFormExpectedValue(e.target.value)} />
                </div>
                <div>
                  <Label>{t("expectedDate")}</Label>
                  <Input type="date" value={formExpectedDate} onChange={(e) => setFormExpectedDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>{t("assignedTo")}</Label>
                <Select value={formAssignedTo} onValueChange={(v) => setFormAssignedTo(v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("notes")}</Label>
                <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{tCommon("cancel")}</Button>
              <Button onClick={handleCreate} disabled={!formTitle.trim()}>{tCommon("create")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Pipeline Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("totalOpportunities")}</p>
            <p className="text-2xl font-bold">{opportunities.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("openOpportunities")}</p>
            <p className="text-2xl font-bold">{openOpps.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("totalPipelineValue")}</p>
            <p className="text-2xl font-bold text-orange-600">{formatVND(pipelineValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">{t("wonValue")}</p>
            <p className="text-2xl font-bold text-green-600">{formatVND(wonValue)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <p className="text-center py-12 text-muted-foreground">{tCommon("loading")}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 pb-4">
            {STAGES.map((stage) => (
              <StageColumn
                key={stage}
                stage={stage}
                opportunities={oppsByStage(stage)}
                t={t}
                onView={setDetailOpp}
              />
            ))}
          </div>

          <DragOverlay>
            {activeOpp ? (
              <Card className="w-[230px] shadow-lg rotate-2">
                <CardContent className="p-3">
                  <p className="font-medium text-sm">{activeOpp.title}</p>
                  {activeOpp.expected_value > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">{formatVND(activeOpp.expected_value)}</p>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Won Dialog */}
      <Dialog open={wonDialogOpen} onOpenChange={setWonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stageWon")}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>{t("actualValue")} (VND) *</Label>
            <Input
              type="number"
              value={actualValue}
              onChange={(e) => setActualValue(e.target.value)}
              placeholder={t("wonRequiresActualValue")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setWonDialogOpen(false); setPendingStageChange(null); }}>{tCommon("cancel")}</Button>
            <Button onClick={handleWonConfirm} disabled={!actualValue}>{tCommon("confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lost Dialog */}
      <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stageLost")}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>{t("lostReason")} *</Label>
            <Textarea
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder={t("lostRequiresReason")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLostDialogOpen(false); setPendingStageChange(null); }}>{tCommon("cancel")}</Button>
            <Button onClick={handleLostConfirm} disabled={!lostReason.trim()}>{tCommon("confirm")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailOpp} onOpenChange={(open) => !open && setDetailOpp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("opportunityDetail")}</DialogTitle>
          </DialogHeader>
          {detailOpp && (
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground text-xs">{t("opportunityTitle")}</Label>
                <p className="font-medium">{detailOpp.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Stage</Label>
                  <Badge className={stageBadgeColors[detailOpp.stage]}>
                    {t(stageI18nKey(detailOpp.stage))}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">{t("expectedValue")}</Label>
                  <p>{formatVND(detailOpp.expected_value)}</p>
                </div>
              </div>
              {detailOpp.stage === "won" && detailOpp.actual_value && (
                <div>
                  <Label className="text-muted-foreground text-xs">{t("actualValue")}</Label>
                  <p className="text-green-700 font-medium">{formatVND(detailOpp.actual_value)}</p>
                </div>
              )}
              {detailOpp.stage === "lost" && detailOpp.lost_reason && (
                <div>
                  <Label className="text-muted-foreground text-xs">{t("lostReason")}</Label>
                  <p className="text-gray-600">{detailOpp.lost_reason}</p>
                </div>
              )}
              {detailOpp.expected_date && (
                <div>
                  <Label className="text-muted-foreground text-xs">{t("expectedDate")}</Label>
                  <p>{new Date(detailOpp.expected_date).toLocaleDateString("vi-VN")}</p>
                </div>
              )}
              {detailOpp.assigned_user && (
                <div>
                  <Label className="text-muted-foreground text-xs">{t("assignedTo")}</Label>
                  <p>{detailOpp.assigned_user.name}</p>
                </div>
              )}
              {detailOpp.lead && (
                <div>
                  <Label className="text-muted-foreground text-xs">{t("sourceLead")}</Label>
                  <p>{detailOpp.lead.full_name}</p>
                </div>
              )}
              {detailOpp.customer && (
                <div>
                  <Label className="text-muted-foreground text-xs">{t("linkedCustomer")}</Label>
                  <p>{detailOpp.customer.full_name}</p>
                </div>
              )}
              {detailOpp.notes && (
                <div>
                  <Label className="text-muted-foreground text-xs">{t("notes")}</Label>
                  <p className="text-sm whitespace-pre-wrap">{detailOpp.notes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground pt-2 border-t">
                <p>{t("createdAt")}: {new Date(detailOpp.created_at).toLocaleString("vi-VN")}</p>
                <p>{t("updatedAt")}: {new Date(detailOpp.updated_at).toLocaleString("vi-VN")}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
