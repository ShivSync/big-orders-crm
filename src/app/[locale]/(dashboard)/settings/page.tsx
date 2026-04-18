"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface Profile {
  name: string;
  phone: string;
  language_preference: string;
}

export default function ProfilePage() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile>({ name: "", phone: "", language_preference: "vi" });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("users")
        .select("name, phone, language_preference")
        .eq("id", user.id)
        .single();
      if (data) {
        setProfile({
          name: data.name || "",
          phone: data.phone || "",
          language_preference: data.language_preference || "vi",
        });
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  const handleSaveProfile = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase
      .from("users")
      .update({
        name: profile.name.trim(),
        phone: profile.phone.trim(),
        language_preference: profile.language_preference,
      })
      .eq("id", user.id);

    if (error) {
      toast.error(t("saveError"));
    } else {
      toast.success(t("saveSuccess"));
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error(t("currentPasswordRequired"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("passwordMismatch"));
      return;
    }
    if (newPassword.length < 8) {
      toast.error(t("passwordTooShort"));
      return;
    }

    setChangingPassword(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      toast.error(t("passwordError"));
      setChangingPassword(false);
      return;
    }

    const { error: reAuthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reAuthError) {
      toast.error(t("currentPasswordWrong"));
      setChangingPassword(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error(t("passwordError"));
    } else {
      toast.success(t("passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>{t("tabs.profile")}</CardTitle>
          <CardDescription>{t("profileDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("fullName")}</Label>
            <Input
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("phone")}</Label>
            <Input
              value={profile.phone}
              onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("languagePreference")}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={profile.language_preference}
              onChange={(e) => setProfile((p) => ({ ...p, language_preference: e.target.value }))}
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            {tc("save")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("changePassword")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("currentPassword")}</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("newPassword")}</Label>
            <div className="relative">
              <Input
                type={showNewPw ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setShowNewPw(!showNewPw)}
              >
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("confirmPassword")}</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <Button onClick={handleChangePassword} disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}>
            {changingPassword ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
            {t("changePassword")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
