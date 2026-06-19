export type HostedUser = {
  id: string;
  name: string;
  email: string;
};

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type HostedWorkspace = {
  id: string;
  name: string;
  role: WorkspaceRole;
};

export type HostedModeAdapter = {
  getCurrentUser: () => Promise<HostedUser | null>;
  listWorkspaces: () => Promise<HostedWorkspace[]>;
  proxyShlinkRequest: <T>(workspaceId: string, request: Request) => Promise<T>;
};

export function createHostedModeAdapterExtensionPoint(): HostedModeAdapter {
  return {
    async getCurrentUser() {
      return null;
    },
    async listWorkspaces() {
      return [];
    },
    async proxyShlinkRequest() {
      throw new Error("Provide a Hosted Mode adapter before using this extension point.");
    }
  };
}
