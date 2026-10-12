/**
 * Src/services/TTSEngine/BackgroundAudio.ts & src/services/TTSEngine/BackgroundAudio.ts
 * Background Audio Engine - Handles App Background/Inactive State
 * Rule: m2 & m5 can play in background if background_enabled=true
 * m1,m3,m4 stop on Navigation Exit or Background
 */

import TTSController, { TTSMode } from "./TTSController";
import TTSStateKey from "../../storage/keys/TTSStateKey";
import { AppState, AppStateStatus } from "react-native";
import { ttsBrainMMKV } from "../../storage/MMKVInstance";

class BackgroundAudioSingleton {
  private appStateSubscription: any = null;
  private isBackgroundEnabled = false;

  /**
   * Initialize Background Listener
   */
  initialize(): void {
    this.isBackgroundEnabled = TTSStateKey.isBackgroundEnabled();

    this.appStateSubscription = AppState.addEventListener(
      "change",
      this.handleAppStateChange.bind(this)
    );

    console.log(
      `[BackgroundAudio] Initialized, background_enabled=${this.isBackgroundEnabled}`
    );
  }

  private handleAppStateChange(nextAppState: AppStateStatus): void {
    const activeMode = TTSStateKey.getActiveMode() as TTSMode | null;
    const currentState = TTSStateKey.getCurrentState();

    console.log(
      `[BackgroundAudio] AppState changed to ${nextAppState}, mode=${activeMode}, state=${currentState}`
    );

    if (nextAppState.match(/inactive|background/)) {
      // App going to background
      this.onAppBackground(activeMode, currentState);
    } else if (nextAppState === "active") {
      // App returning to foreground
      this.onAppForeground();
    }
  }

  private onAppBackground(
    activeMode: TTSMode | null,
    currentState: string
  ): void {
    const bgEnabled = TTSStateKey.isBackgroundEnabled();

    // Rule: Only m2 & m5 can continue in background if enabled
    if (!bgEnabled) {
      console.log("[BackgroundAudio] Background disabled, stopping TTS");
      TTSController.onNavigationExit();
      return;
    }

    if (activeMode !== "m2" && activeMode !== "m5") {
      console.log(
        `[BackgroundAudio] Mode ${activeMode} cannot play in background, stopping`
      );
      TTSController.onNavigationExit();
      return;
    }

    // m2/m5 + background_enabled = continue playing
    console.log(`[BackgroundAudio] Mode ${activeMode} continues in background`);
    // Keep playing, don't stop
  }

  private onAppForeground(): void {
    console.log("[BackgroundAudio] App returned to foreground");
    // Optionally resume if paused due to background
  }

  /**
   * Set Background Enabled (From Settings ControlPanel2)
   */
  setBackgroundEnabled(enabled: boolean): void {
    this.isBackgroundEnabled = enabled;
    TTSStateKey.setBackgroundEnabled(enabled);
    ttsBrainMMKV.set("tts_background_enabled", enabled);
    console.log(`[BackgroundAudio] Background enabled set to ${enabled}`);
  }

  isBackgroundEnabledState(): boolean {
    return TTSStateKey.isBackgroundEnabled();
  }

  /**
   * Should Continue In Background?
   */
  shouldContinueInBackground(mode: TTSMode): boolean {
    if (!this.isBackgroundEnabled) {
      return false;
    }
    return mode === "m2" || mode === "m5";
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

export const BackgroundAudio = new BackgroundAudioSingleton();
export default BackgroundAudio;
