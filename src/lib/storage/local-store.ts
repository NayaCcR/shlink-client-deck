"use client";

export type LocalConfigEnvelope<T> = {
  version: 1;
  exportedAt: string;
  payload: T;
};

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function readJsonFile<T>(file: File): Promise<T> {
  const text = await file.text();
  return JSON.parse(text) as T;
}

export function createExportEnvelope<T>(payload: T): LocalConfigEnvelope<T> {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    payload
  };
}
