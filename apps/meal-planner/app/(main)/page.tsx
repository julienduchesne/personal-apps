import { redirect } from "next/navigation";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const password = params.password;
  const qs = password ? `?password=${encodeURIComponent(String(password))}` : "";
  redirect(`/week${qs}`);
}
