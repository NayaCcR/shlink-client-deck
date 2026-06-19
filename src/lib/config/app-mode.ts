export type AppMode = "static" | "hosted";

export const appMode: AppMode =
  process.env.NEXT_PUBLIC_APP_MODE === "hosted" ? "hosted" : "static";

export function isHostedAppMode() {
  return appMode === "hosted";
}
