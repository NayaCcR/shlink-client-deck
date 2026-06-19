"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppTheme = "light" | "dark" | "system";

type SettingsState = {
  locale: string;
  theme: AppTheme;
  setLocale: (locale: string) => void;
  setTheme: (theme: AppTheme) => void;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      locale: "zh-CN",
      theme: "system",
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme })
    }),
    {
      name: "link-console-settings",
      partialize: (state) => ({
        locale: state.locale,
        theme: state.theme
      })
    }
  )
);
