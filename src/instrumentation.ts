export async function register() {
  // only run the scheduler inside the node server, never in edge or during build
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { startScheduledRefresh } = await import("./lib/scheduledRefresh");
    startScheduledRefresh();
  }
}
