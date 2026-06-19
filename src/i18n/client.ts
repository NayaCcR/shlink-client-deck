"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { resources } from "@/i18n/resources";

let initialized = false;

export function initI18n(locale = "zh-CN") {
  if (!initialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: locale,
      fallbackLng: "zh-CN",
      interpolation: {
        escapeValue: false
      },
      ns: ["common"],
      defaultNS: "common"
    });
    initialized = true;
  } else if (i18n.language !== locale) {
    void i18n.changeLanguage(locale);
  }

  return i18n;
}

export { i18n };
