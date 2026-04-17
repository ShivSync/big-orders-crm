"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import type { Team } from "@/types/database";

export default function TeamsPage() {
  const t = useTranslations("teams");
  const tCommon = useTranslations("common");
  const tRegions = useTranslations("regions");
  const [teams, setTeams] = useState<(Team & { member_count: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const { data } = await supabase.from("teams").select("*").order("created_at");
    if (data) {
      const enriched = await Promise.all(
        data.map(async (team) => {
          const { count } = await supabase
            .from("user_teams")
            .select("*", { count: "exact", head: true })
            .eq("team_id", team.id);
          return { ...team, member_count: count ?? 0 };
        })
      );
      setTeams(enriched);
    }
    setLoading(false);
  }

  async function handleCreateTeam(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from("teams").insert({
      name: form.get("name") as string,
      region: form.get("region") as string,
    });
    setDialogOpen(false);
    loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            <Plus className="mr-2 h-4 w-4" />
            {t("createTeam")}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("createTeam")}</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("editTeam")}</Label>
                <Input name="name" required />
              </div>
              <div className="space-y-2">
                <Label>{t("region")}</Label>
                <Select name="region" defaultValue="ALL">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["ALL", "N", "T", "B"] as const).map((r) => (
                      <SelectItem key={r} value={r}>{tRegions(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" className="bg-red-600 hover:bg-red-700">{tCommon("save")}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("editTeam")}</TableHead>
                <TableHead>{t("region")}</TableHead>
                <TableHead>{t("members")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                    {tCommon("loading")}
                  </TableCell>
                </TableRow>
              ) : teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                    {tCommon("noData")}
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{tRegions(team.region)}</Badge>
                    </TableCell>
                    <TableCell>{team.member_count}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
