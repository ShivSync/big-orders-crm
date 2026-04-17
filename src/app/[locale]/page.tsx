import { redirect } from "@/i18n/routing";
import { getLocale } from "next-intl/server";

export default async function RootPage() {
  const locale = await getLocale();
  redirect({ href: "/dashboard", locale });
}
