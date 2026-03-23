import { unstable_noStore as noStore } from "next/cache";
import { getWeekDates, shiftWeek, formatDateShort } from "@/lib/date-utils";
import { getRecipes } from "@/app/actions/recipes";
import { getWeeklySchedule } from "@/app/actions/schedule";
import { getMealLogsForWeek } from "@/app/actions/meals";
import { getSuggestionsForWeek } from "@/app/actions/suggestions";
import { WeekCalendar } from "@/components/WeekCalendar";
import { Link } from "@/components/Link";
import { Button } from "@/components/ui/button";

export default async function WeekDetailPage({
  params,
}: {
  params: Promise<{ weekStart: string }>;
}) {
  noStore();
  const { weekStart } = await params;
  const dates = getWeekDates(weekStart);

  const [recipes, schedule, meals, suggestions] = await Promise.all([
    getRecipes(),
    getWeeklySchedule(),
    getMealLogsForWeek(weekStart),
    getSuggestionsForWeek(weekStart),
  ]);

  const prevWeek = shiftWeek(weekStart, -1);
  const nextWeek = shiftWeek(weekStart, 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/week/${prevWeek}`}>
          <Button variant="outline" className="rounded-xl">&larr; Previous</Button>
        </Link>
        <h1 className="text-lg font-bold text-stone-800">
          {formatDateShort(dates[0])} &ndash; {formatDateShort(dates[6])}
        </h1>
        <Link href={`/week/${nextWeek}`}>
          <Button variant="outline" className="rounded-xl">Next &rarr;</Button>
        </Link>
      </div>

      <WeekCalendar
        dates={dates}
        schedule={schedule}
        meals={meals}
        suggestions={suggestions}
        allRecipes={recipes}
      />
    </div>
  );
}
