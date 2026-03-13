import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "refresh watching and started portfolios",
  { hours: 4 },
  internal.github.refreshConnectedPortfolios,
  { mode: "priority" }
);

crons.interval(
  "refresh imported portfolios",
  { hours: 24 },
  internal.github.refreshConnectedPortfolios,
  { mode: "full" }
);

export default crons;
