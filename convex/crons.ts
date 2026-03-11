import { cronJobs } from "convex/server";

const crons = cronJobs();

// Placeholder schedule hooks. Actual internal actions are added once live sync is enabled.
crons.daily("ghars-daily-refresh-placeholder", { hourUTC: 7, minuteUTC: 0 }, "internal.reports.storeReport");
crons.interval("ghars-watchlist-refresh-placeholder", { hours: 4 }, "internal.github.fetchStarredRepos");

export default crons;
