import { fullRebuild, pruneOldEvents, rollupRecent } from "./rollup";
import { pruneOldSalts } from "./salt";

const FIVE_MIN = 5 * 60 * 1000;

interface SchedulerHandles {
  rollupTimer: ReturnType<typeof setInterval>;
  dailyTimer: ReturnType<typeof setTimeout>;
  stop(): void;
}

function msUntilNextDaily0300Utc(now = new Date()): number {
  const target = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      3,
      0,
      0,
      0,
    ),
  );
  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return target.getTime() - now.getTime();
}

export function startAnalyticsScheduler(): SchedulerHandles {
  let dailyTimer: ReturnType<typeof setTimeout>;

  const rollupTimer = setInterval(() => {
    void (async () => {
      try {
        const res = await rollupRecent();
        if (res.questions > 0 || res.tags > 0) {
          console.log(
            `[analytics] rolled up ${res.questions} question(s), ${res.tags} tag(s)`,
          );
        }
      } catch (err) {
        console.error("[analytics] rollup failed:", err);
      }
    })();
  }, FIVE_MIN);

  const runDaily = async () => {
    try {
      const events = await pruneOldEvents();
      const salts = await pruneOldSalts();
      const rebuilt = await fullRebuild();
      console.log(
        `[analytics] daily cleanup: pruned ${events} event(s), ${salts} salt(s); rebuilt stats for ${rebuilt.questions} question(s), ${rebuilt.tags} tag(s)`,
      );
    } catch (err) {
      console.error("[analytics] daily cleanup failed:", err);
    } finally {
      // Schedule the next run
      dailyTimer = setTimeout(runDaily, msUntilNextDaily0300Utc());
    }
  };
  dailyTimer = setTimeout(runDaily, msUntilNextDaily0300Utc());

  console.log(
    `[analytics] scheduler: rollup every ${FIVE_MIN / 1000}s; daily cleanup at next 03:00 UTC`,
  );

  return {
    rollupTimer,
    get dailyTimer() {
      return dailyTimer;
    },
    stop() {
      clearInterval(rollupTimer);
      clearTimeout(dailyTimer);
    },
  };
}
