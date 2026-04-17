"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import type { UserWithRoles, Role, Store } from "@/types/database";

export default function UsersPage() {
  const t = useTranslations("users");
  const tCommon = useTranslations("common");
  const tRegions = useTranslations("regions");
  const locale = useLocale();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [usersRes, rolesRes, storesRes] = await Promise.all([
      supabase.from("users").select("*").order("created_at", { ascending: false }),
      supabase.from("roles").select("*").eq("status", "active"),
      supabase.from("stores").select("*").eq("active", true),
    ]);

    if (usersRes.data) {
      const enriched = await Promise.all(
        usersRes.data.map(async (u) => {
          const [rolesData, storesData] = await Promise.all([
            supabase.from("user_roles").select("roles(*)").eq("user_id", u.id),
            supabase.from("user_stores").select("stores(*)").eq("user_id", u.id),
          ]);
          return {
            ...u,
            roles: rolesData.data?.map((r: any) => r.roles).filter(Boolean) ?? [],
            teams: [],
            stores: storesData.data?.map((s: any) => s.stores).filter(Boolean) ?? [],
          };
        })
      );
      setUsers(enriched);
    }
    setRoles(rolesRes.data ?? []);
    setStores(storesRes.data ?? []);
    setLoading(false);
  }

  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = form.get("email") as string;
    const name = form.get("name") as string;
    const phone = form.get("phone") as string;
    const roleId = form.get("role") as string;
    const region = form.get("region") as string;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: "TempPass123!",
      email_confirm: true,
    });

    if (authError) {
      // Fallback: create via service role API
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, phone, roleId, region }),
      });
      if (!res.ok) return;
    } else if (authData.user) {
      await supabase.from("users").insert({
        id: authData.user.id,
        email,
        name,
        phone,
        region,
        status: "active",
      });
      if (roleId) {
        await supabase.from("user_roles").insert({
          user_id: authData.user.id,
          role_id: roleId,
        });
      }
    }

    setDialogOpen(false);
    loadData();
  }

  async function toggleUserStatus(userId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    await supabase.from("users").update({ status: newStatus }).eq("id", userId);
    loadData();
  }

  const roleName = (role: Role) => locale === "vi" ? role.name_vi : role.name_en;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            <Plus className="mr-2 h-4 w-4" />
            {t("createUser")}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("createUser")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label>{t("name")}</Label>
                <Input name="name" required />
              </div>
              <div className="space-y-2">
                <Label>{t("email")}</Label>
                <Input name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label>{t("phone")}</Label>
                <Input name="phone" />
              </div>
              <div className="space-y-2">
                <Label>{t("role")}</Label>
                <Select name="role">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{roleName(r)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <Button type="submit" className="bg-red-600 hover:bg-red-700">
                  {tCommon("save")}
                </Button>
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
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("role")}</TableHead>
                <TableHead>{t("region")}</TableHead>
                <TableHead>{tCommon("status")}</TableHead>
                <TableHead>{tCommon("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {tCommon("loading")}
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {tCommon("noData")}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name || "—"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.roles.map((r) => (
                        <Badge key={r.id} variant="secondary" className="mr-1">
                          {roleName(r)}
                        </Badge>
                      ))}
                    </TableCell>
                    <TableCell>{tRegions(user.region)}</TableCell>
                    <TableCell>
                      <Badge variant={user.status === "active" ? "default" : "secondary"}>
                        {user.status === "active" ? tCommon("active") : tCommon("inactive")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleUserStatus(user.id, user.status)}
                      >
                        {user.status === "active" ? t("deactivate") : t("activate")}
                      </Button>
                    </TableCell>
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
