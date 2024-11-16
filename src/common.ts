export const taskNamePrefix = "ScheduledTask";

export const scheduleFileName = "taskDatabase.json";

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export function getFullDayName(day: DayOfWeek): string {
  const dayNames: Record<DayOfWeek, string> = {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday",
  };

  return dayNames[day];
}

export const githubRepository =
  "https://github.com/hichemfantar/ShutdownScheduler/";
export const githubRepositoryLatestRelease = `${githubRepository}releases/latest`;
