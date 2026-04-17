"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import type { Role, Permission, CrmObject, RoleObject } from "@/types/database";

export default function RolesPage() {
  const t = useTranslations("roles");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [objects, setObjects] = useState<CrmObject[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [roleObjects, setRoleObjects] = useState<Record<string, RoleObject[]>>({});
  const [expandedRole, setExpandedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [rolesRes, permsRes, objsRes] = await Promise.all([
      supabase.from("roles").select("*").order("created_at"),
      supabase.from("permissions").select("*"),
      supabase.from("objects").select("*"),
    ]);

    const rolesData = rolesRes.data ?? [];
    setRoles(rolesData);
    setPermissions(permsRes.data ?? []);
    setObjects(objsRes.data ?? []);

    const rpMap: Record<string, string[]> = {};
    const roMap: Record<string, RoleObject[]> = {};
    for (const role of rolesData) {
      const [rpRes, roRes] = await Promise.all([
        supabase.from("role_permissions").select("permission_id").eq("role_id", role.id),
        supabase.from("role_objects").select("*").eq("role_id", role.id),
      ]);
      rpMap[role.id] = rpRes.data?.map((r) => r.permission_id) ?? [];
      roMap[role.id] = (roRes.data ?? []) as RoleObject[];
    }
    setRolePermissions(rpMap);
    setRoleObjects(roMap);
    setLoading(false);
  }

  async function togglePermission(roleId: string, permId: string) {
    const current = rolePermissions[roleId] ?? [];
    if (current.includes(permId)) {
      await supabase.from("role_permissions").delete().eq("role_id", roleId).eq("permission_id", permId);
    } else {
      await supabase.from("role_permissions").insert({ role_id: roleId, permission_id: permId });
    }
    loadData();
  }

  async function handleCreateRole(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await supabase.from("roles").insert({
      name_en: form.get("name_en") as string,
      name_vi: form.get("name_vi") as string,
      slug: (form.get("name_en") as string).toLowerCase().replace(/\s+/g, "_"),
      master_slug: (form.get("name_en") as string).toLowerCase().replace(/\s+/g, "_"),
      status: "active",
    });
    setDialogOpen(false);
    loadData();
  }

  const name = (item: { name_en: string; name_vi: string }) =>
    locale === "vi" ? item.name_vi : item.name_en;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            <Plus className="mr-2 h-4 w-4" />
            {t("createRole")}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t("createRole")}</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div className="space-y-2">
                <Label>Name (English)</Label>
                <Input name="name_en" required />
              </div>
              <div className="space-y-2">
                <Label>Tên (Tiếng Việt)</Label>
                <Input name="name_vi" required />
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
                <TableHead className="w-8" />
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>{t("permissions")}</TableHead>
                <TableHead>{tCommon("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {tCommon("loading")}
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <>
                    <TableRow
                      key={role.id}
                      className="cursor-pointer"
                      onClick={() => setExpandedRole(expandedRole === role.id ? null : role.id)}
                    >
                      <TableCell>
                        {expandedRole === role.id ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{name(role)}</TableCell>
                      <TableCell className="text-gray-500">{role.slug}</TableCell>
                      <TableCell>{(rolePermissions[role.id] ?? []).length}</TableCell>
                      <TableCell>
                        <Badge variant={role.status === "active" ? "default" : "secondary"}>
                          {role.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {expandedRole === role.id && (
                      <TableRow key={`${role.id}-perms`}>
                        <TableCell colSpan={5} className="bg-gray-50 p-4">
                          <div className="space-y-3">
                            {objects.map((obj) => {
                              const objPerms = permissions.filter((p) => p.object_id === obj.id);
                              if (objPerms.length === 0) return null;
                              const ro = roleObjects[role.id]?.find((r) => r.object_id === obj.id);
                              return (
                                <div key={obj.id}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm">{name(obj)}</span>
                                    {ro && (
                                      <Badge variant="outline" className="text-xs">
                                        {t("storeFilter")}: {ro.filter_store}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="ml-4 flex flex-wrap gap-3">
                                    {objPerms.map((perm) => (
                                      <label key={perm.id} className="flex items-center gap-1.5 text-sm">
                                        <Checkbox
                                          checked={(rolePermissions[role.id] ?? []).includes(perm.id)}
                                          onCheckedChange={() => togglePermission(role.id, perm.id)}
                                        />
                                        {name(perm)}
                                      </label>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
