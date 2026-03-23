import { unstable_noStore as noStore } from "next/cache";
import { getWeeklySchedule, getTagLimits } from "@/app/actions/schedule";
import { getAllTags } from "@/app/actions/recipes";
import { ScheduleEditor } from "./ScheduleEditor";
import { TagLimitsEditor } from "./TagLimitsEditor";

export default async function SettingsPage() {
  noStore();
  const [schedule, tagLimits, allTags] = await Promise.all([
    getWeeklySchedule(),
    getTagLimits(),
    getAllTags(),
  ]);

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-stone-800">Settings</h1>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-700">Weekly Cooking Schedule</h2>
          <p className="text-sm text-muted-foreground">
            Set how much time you have to cook each day. Suggestions will respect these limits.
          </p>
        </div>
        <ScheduleEditor schedule={schedule} />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-stone-700">Weekly Tag Limits</h2>
          <p className="text-sm text-muted-foreground">
            Limit how many times a tag can appear per week (e.g., &quot;fried&quot; max 2 times).
          </p>
        </div>
        <TagLimitsEditor tagLimits={tagLimits} allTags={allTags} />
      </section>
    </div>
  );
}
