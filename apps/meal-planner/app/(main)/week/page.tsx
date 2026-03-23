import { redirect } from "next/navigation";
import { today, getWeekStart } from "@/lib/date-utils";

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const password = params.password;
  const weekStart = getWeekStart(today());
  const qs = password ? `?password=${encodeURIComponent(String(password))}` : "";
  redirect(`/week/${weekStart}${qs}`);
}
