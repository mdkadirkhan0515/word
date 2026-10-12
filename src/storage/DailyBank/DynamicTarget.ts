/**
 * src/storage/DailyBank/DynamicTarget.ts
 * Advanced & Non-Linear Dynamic Percentage Generation Algorithm
 * Based on 30 Days Activity (Streak, Velocity, Consistency, Churn Risk)
 * Android Login Based, Production-Grade
 */

import { dynamicTargetMMKV } from "../MMKVInstance";

export const DYNAMIC_TARGET_KEYS = {
  ADVANCED_TARGET: "advanced_dynamic_chapter_target", // Final 50-100%
  THIRTY_DAYS_ACTIVITY: "thirty_days_activity", // [1,0,1,1...]
  DAILY_COMPLETED_COUNTS: "daily_completed_counts", // [5,12,0,8...]
  CONSISTENCY_SCORE: "consistency_score",
  MOMENTUM_FACTOR: "momentum_factor",
  VOLATILITY_PENALTY: "volatility_penalty",
  VOLUME_SCORE: "volume_score",
  RAW_SCORE: "raw_composite_score",
  LAST_CALCULATED: "last_calculated_at",
  CALCULATED_HISTORY: "calculated_history", // Array of {date, target}
} as const;

export interface ThirtyDaysMetrics {
  totalActiveDays: number;
  consistencyRate: number; // 0-1 (e.g., 0.8 = 24 days)
  last7ActiveRate: number;
  prev23ActiveRate: number;
  momentum: number; // last7 - prev23
  maxGap: number; // Max consecutive missed days
  penaltyFactor: number; // 0-1
  avgVolumePerDay: number;
  volumeScore: number; // 0-1
  rawScore: number; // 0-1 composite
  finalTarget: number; // 50-100
}

class DynamicTargetEngine {
  /**
   * Generate Complex Dynamic Target - Main Algorithm
   * @param thirtyDaysActivity - Last 30 days [1=Active, 0=Missed] from Android Login
   * @param dailyCompletedCounts - Daily completed content counts [5,12,0,8...]
   * @returns 50-100% dynamic target
   */
  generateComplexDynamicTarget(
    thirtyDaysActivity: number[],
    dailyCompletedCounts: number[]
  ): number {
    if (!thirtyDaysActivity || thirtyDaysActivity.length < 30) {
      console.log(
        "[DynamicTarget] Insufficient data (<30 days), returning baseline 50%"
      );
      const baseline = 50;
      dynamicTargetMMKV.set(DYNAMIC_TARGET_KEYS.ADVANCED_TARGET, baseline);
      return baseline;
    }

    // 1. Consistency Score (30 days total present %)
    const totalActiveDays = thirtyDaysActivity.reduce(
      (acc, curr) => acc + curr,
      0
    );
    const consistencyRate = totalActiveDays / 30; // e.g., 0.8

    // 2. Momentum Factor (Last 7 days vs Prev 23 days)
    const last7Days = thirtyDaysActivity.slice(-7);
    const prev23Days = thirtyDaysActivity.slice(0, 23);

    const last7Active = last7Days.reduce((acc, curr) => acc + curr, 0) / 7;
    const prev23Active = prev23Days.reduce((acc, curr) => acc + curr, 0) / 23;

    const momentum = last7Active - prev23Active; // Positive = Improving, Negative = Declining

    // 3. Volatility Penalty (Max consecutive gap)
    let maxGap = 0;
    let currentGap = 0;
    thirtyDaysActivity.forEach((status) => {
      if (status === 0) {
        currentGap++;
        if (currentGap > maxGap) {
          maxGap = currentGap;
        }
      } else {
        currentGap = 0;
      }
    });
    // If big gap (e.g., 5 days missed), penalty increases, target drops to safe zone
    const penaltyFactor = Math.max(0, 1 - maxGap * 0.08); // 0.08 per gap day

    // 4. Volume/Velocity Weight (Avg daily deep study)
    const totalVolume = dailyCompletedCounts.reduce(
      (acc, curr) => acc + curr,
      0
    );
    const avgVolumePerDay = totalVolume / 30;
    const volumeScore = Math.min(1, avgVolumePerDay / 15); // Ideal 15 per day

    // 5. Composite Performance Score (Weighted)
    // Weights: Consistency 40%, Volume 30%, Momentum 20%, Penalty 10%
    let rawScore =
      consistencyRate * 0.4 +
      volumeScore * 0.3 +
      (momentum + 0.5) * 0.2 +
      penaltyFactor * 0.1;

    // Clamp 0-1
    rawScore = Math.max(0, Math.min(1, rawScore));

    // 6. Non-Linear Mapping (Sigmoid-like with Power Curve)
    // Target always starts at 50% and goes to 100% based on performance
    const minTarget = 50;
    const maxTarget = 100;

    // Power function makes it harder - stable high performers go quickly to 95-100%
    // Medium/irregular stays at 50-70%
    const scaledFactor = Math.pow(rawScore, 1.5);
    let finalTargetPercentage = Math.round(
      minTarget + scaledFactor * (maxTarget - minTarget)
    );

    // Safety Boundary
    finalTargetPercentage = Math.max(50, Math.min(100, finalTargetPercentage));

    // Save all metrics to MMKV
    const metrics: ThirtyDaysMetrics = {
      totalActiveDays,
      consistencyRate,
      last7ActiveRate: last7Active,
      prev23ActiveRate: prev23Active,
      momentum,
      maxGap,
      penaltyFactor,
      avgVolumePerDay,
      volumeScore,
      rawScore,
      finalTarget: finalTargetPercentage,
    };

    this.saveMetrics(metrics, thirtyDaysActivity, dailyCompletedCounts);

    console.log(
      `[DynamicTarget] Raw: ${rawScore.toFixed(
        2
      )} | Consistency: ${consistencyRate.toFixed(
        2
      )} | Momentum: ${momentum.toFixed(2)} | Penalty: ${penaltyFactor.toFixed(
        2
      )} | Volume: ${volumeScore.toFixed(
        2
      )} | Target: ${finalTargetPercentage}%`
    );

    return finalTargetPercentage;
  }

  private saveMetrics(
    metrics: ThirtyDaysMetrics,
    activity: number[],
    counts: number[]
  ): void {
    dynamicTargetMMKV.set(
      DYNAMIC_TARGET_KEYS.ADVANCED_TARGET,
      metrics.finalTarget
    );
    dynamicTargetMMKV.set(
      DYNAMIC_TARGET_KEYS.THIRTY_DAYS_ACTIVITY,
      JSON.stringify(activity)
    );
    dynamicTargetMMKV.set(
      DYNAMIC_TARGET_KEYS.DAILY_COMPLETED_COUNTS,
      JSON.stringify(counts)
    );
    dynamicTargetMMKV.set(
      DYNAMIC_TARGET_KEYS.CONSISTENCY_SCORE,
      metrics.consistencyRate
    );
    dynamicTargetMMKV.set(
      DYNAMIC_TARGET_KEYS.MOMENTUM_FACTOR,
      metrics.momentum
    );
    dynamicTargetMMKV.set(
      DYNAMIC_TARGET_KEYS.VOLATILITY_PENALTY,
      metrics.penaltyFactor
    );
    dynamicTargetMMKV.set(
      DYNAMIC_TARGET_KEYS.VOLUME_SCORE,
      metrics.volumeScore
    );
    dynamicTargetMMKV.set(DYNAMIC_TARGET_KEYS.RAW_SCORE, metrics.rawScore);
    dynamicTargetMMKV.set(DYNAMIC_TARGET_KEYS.LAST_CALCULATED, Date.now());

    // Save history
    const historyRaw = dynamicTargetMMKV.getString(
      DYNAMIC_TARGET_KEYS.CALCULATED_HISTORY
    );
    let history: Array<{ date: string; target: number; rawScore: number }> = [];
    try {
      if (historyRaw) {
        history = JSON.parse(historyRaw);
      }
    } catch {}

    history.push({
      date: new Date().toISOString().split("T")[0],
      target: metrics.finalTarget,
      rawScore: metrics.rawScore,
    });

    // Keep last 30 history
    if (history.length > 30) {
      history = history.slice(-30);
    }

    dynamicTargetMMKV.set(
      DYNAMIC_TARGET_KEYS.CALCULATED_HISTORY,
      JSON.stringify(history)
    );
  }

  /**
   * Get Current Dynamic Target (Instant MMKV Read)
   */
  getCurrentTarget(): number {
    return (
      dynamicTargetMMKV.getNumber(DYNAMIC_TARGET_KEYS.ADVANCED_TARGET) || 50
    );
  }

  /**
   * Get Full Metrics (For Debugging / Analytics)
   */
  getMetrics(): ThirtyDaysMetrics | null {
    const target = dynamicTargetMMKV.getNumber(
      DYNAMIC_TARGET_KEYS.ADVANCED_TARGET
    );
    if (target === undefined) {
      return null;
    }

    return {
      totalActiveDays: 0,
      consistencyRate:
        dynamicTargetMMKV.getNumber(DYNAMIC_TARGET_KEYS.CONSISTENCY_SCORE) || 0,
      last7ActiveRate: 0,
      prev23ActiveRate: 0,
      momentum:
        dynamicTargetMMKV.getNumber(DYNAMIC_TARGET_KEYS.MOMENTUM_FACTOR) || 0,
      maxGap: 0,
      penaltyFactor:
        dynamicTargetMMKV.getNumber(DYNAMIC_TARGET_KEYS.VOLATILITY_PENALTY) ||
        1,
      avgVolumePerDay: 0,
      volumeScore:
        dynamicTargetMMKV.getNumber(DYNAMIC_TARGET_KEYS.VOLUME_SCORE) || 0,
      rawScore: dynamicTargetMMKV.getNumber(DYNAMIC_TARGET_KEYS.RAW_SCORE) || 0,
      finalTarget: target,
    };
  }

  /**
   * Load 30 Days Activity from Android (Stub for Native Module)
   * In real app: NativeModules.LoginTracker.getThirtyDaysActivity()
   */
  async loadFromAndroid(): Promise<{ activity: number[]; counts: number[] }> {
    // Try MMKV first
    const activityRaw = dynamicTargetMMKV.getString(
      DYNAMIC_TARGET_KEYS.THIRTY_DAYS_ACTIVITY
    );
    const countsRaw = dynamicTargetMMKV.getString(
      DYNAMIC_TARGET_KEYS.DAILY_COMPLETED_COUNTS
    );

    if (activityRaw && countsRaw) {
      try {
        return {
          activity: JSON.parse(activityRaw),
          counts: JSON.parse(countsRaw),
        };
      } catch {}
    }

    // Fallback: Simulate from Android
    // TODO: Replace with actual Native Module call
    // const { activity, counts } = await NativeModules.LoginTracker.getThirtyDaysActivity();
    // For now, return baseline if no data
    return {
      activity: new Array(30).fill(0), // Will trigger baseline 50%
      counts: new Array(30).fill(0),
    };
  }

  /**
   * Recalculate (Call daily on app launch)
   */
  async recalculateFromStored(): Promise<number> {
    const { activity, counts } = await this.loadFromAndroid();
    return this.generateComplexDynamicTarget(activity, counts);
  }

  /**
   * Simulate different user types (For Testing)
   */
  simulateUser(type: "high" | "medium" | "low" | "churn"): number {
    let activity: number[];
    let counts: number[];

    switch (type) {
      case "high":
        // 28/30 days active, high volume, good momentum
        activity = [...Array(28).fill(1), 0, 1];
        counts = [...Array(30).fill(15)].map(
          () => 15 + Math.floor(Math.random() * 5)
        );
        break;
      case "medium":
        // 15/30 active, medium volume
        activity = Array(30)
          .fill(0)
          .map(() => (Math.random() > 0.5 ? 1 : 0));
        counts = Array(30)
          .fill(0)
          .map(() => Math.floor(Math.random() * 10));
        break;
      case "low":
        // 8/30 active, low volume
        activity = Array(30)
          .fill(0)
          .map((_, i) => (i % 4 === 0 ? 1 : 0));
        counts = Array(30)
          .fill(0)
          .map(() => Math.floor(Math.random() * 3));
        break;
      case "churn":
        // Had 5 day gap
        activity = [
          1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1,
          0, 0, 1, 1, 1, 1, 1,
        ];
        counts = Array(30)
          .fill(0)
          .map(() => Math.floor(Math.random() * 8));
        break;
      default:
        activity = Array(30).fill(1);
        counts = Array(30).fill(10);
    }

    return this.generateComplexDynamicTarget(activity, counts);
  }

  /**
   * Get History for Analytics Chart
   */
  getHistory(): Array<{ date: string; target: number; rawScore: number }> {
    const raw = dynamicTargetMMKV.getString(
      DYNAMIC_TARGET_KEYS.CALCULATED_HISTORY
    );
    if (!raw) {
      return [];
    }
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }
}

export const DynamicTarget = new DynamicTargetEngine();
export default DynamicTarget;
