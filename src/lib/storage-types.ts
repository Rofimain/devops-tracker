export type StorageVolumeInfo = {
  name: string;
  path?: string;
  status?: string;
  totalBytes: number;
  usedBytes: number;
  fsType?: string;
};

export type StorageUsageResult = {
  serverId: string;
  serverName: string;
  serverType: string;
  host: string;
  port: number;
  ok: boolean;
  error?: string;
  fetchedAt: string;
  volumes: StorageVolumeInfo[];
  system?: {
    model?: string;
    serial?: string;
    version?: string;
    uptime?: number;
  };
};

export type HttpJsonStoragePayload = {
  volumes?: Array<{
    name?: string;
    path?: string;
    status?: string;
    totalBytes?: number;
    usedBytes?: number;
    freeBytes?: number;
    fsType?: string;
  }>;
};
