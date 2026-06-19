export type EncryptedStoreAdapter = {
  saveSecret: (scope: string, value: string) => Promise<void>;
  readSecret: (scope: string) => Promise<string | null>;
  deleteSecret: (scope: string) => Promise<void>;
};

export function createHostedEncryptedStoreExtensionPoint(): EncryptedStoreAdapter {
  return {
    async saveSecret() {
      throw new Error("Provide an encrypted store adapter before using this extension point.");
    },
    async readSecret() {
      throw new Error("Provide an encrypted store adapter before using this extension point.");
    },
    async deleteSecret() {
      throw new Error("Provide an encrypted store adapter before using this extension point.");
    }
  };
}
