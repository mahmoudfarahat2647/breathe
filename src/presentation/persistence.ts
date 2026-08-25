import {
  BreathingSettings,
  type BreathingSettingsDto,
} from "@/domain/breathing-settings";

import type { ClientSessionSnapshot } from "./session-snapshot";

export const SETTINGS_SAVE_DEBOUNCE_MS = 800;

export type SaveSettingsOptions = {
  keepalive?: boolean;
};

export type BreathingPersistence = {
  initialize(): Promise<BreathingSettingsDto>;
  saveSettings(
    settings: BreathingSettingsDto,
    options?: SaveSettingsOptions,
  ): Promise<void>;
  saveSession(session: ClientSessionSnapshot): Promise<void>;
};

const DEFAULT_SETTINGS: BreathingSettingsDto = BreathingSettings.default().toDto();

type FetchLike = typeof fetch;

export function createHttpBreathingPersistence(options?: {
  fetch?: FetchLike;
}): BreathingPersistence {
  const fetchImpl = options?.fetch ?? fetch;
  let authReady: Promise<void> | null = null;

  async function request(url: string, init: RequestInit = {}): Promise<Response> {
    return fetchImpl(url, {
      credentials: "same-origin",
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  }

  async function ensureAnonymous(): Promise<Response | null> {
    try {
      return await request("/api/auth/anonymous", {
        method: "POST",
      });
    } catch {
      return null;
    }
  }

  function trackAuth(task: Promise<unknown>): Promise<void> {
    authReady = task.then(
      () => undefined,
      () => undefined,
    );
    return authReady;
  }

  function awaitAuthReady(): Promise<void> {
    if (!authReady) {
      trackAuth(ensureAnonymous());
    }
    return authReady!;
  }

  return {
    async initialize() {
      try {
        const authTask = ensureAnonymous();
        await trackAuth(authTask);
        const authResponse = await authTask;
        if (!authResponse?.ok) {
          return { ...DEFAULT_SETTINGS };
        }

        const settingsResponse = await request("/api/settings");
        if (!settingsResponse.ok) {
          return { ...DEFAULT_SETTINGS };
        }

        const body: unknown = await settingsResponse.json();
        return BreathingSettings.fromDto(body as BreathingSettingsDto).toDto();
      } catch {
        return { ...DEFAULT_SETTINGS };
      }
    },

    async saveSettings(settings, saveOptions) {
      try {
        await awaitAuthReady();

        const putOnce = () =>
          request("/api/settings", {
            method: "PUT",
            body: JSON.stringify(settings),
            ...(saveOptions?.keepalive ? { keepalive: true } : {}),
          });

        let response = await putOnce();
        if (response.ok) {
          return;
        }

        if (response.status === 401 || response.status === 403) {
          await trackAuth(ensureAnonymous());
          response = await putOnce();
          if (response.ok) {
            return;
          }
        }
      } catch {
        // Persistence must never block the breathing exercise.
      }
    },

    async saveSession(session) {
      try {
        await awaitAuthReady();

        const postOnce = () =>
          request("/api/sessions", {
            method: "POST",
            body: JSON.stringify(session),
          });

        let response = await postOnce();
        if (response.ok) {
          return;
        }

        if (response.status === 401 || response.status === 403) {
          await trackAuth(ensureAnonymous());
          response = await postOnce();
        }
      } catch {
        // Persistence must never block the breathing exercise.
      }
    },
  };
}
