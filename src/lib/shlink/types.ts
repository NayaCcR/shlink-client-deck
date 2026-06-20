export type ShlinkServerMode = "static" | "hosted";

export type ShlinkServer = {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
  apiKeyPreview?: string;
  workspaceId?: string;
  mode?: ShlinkServerMode;
  createdAt: string;
  updatedAt: string;
};

export type ShlinkServerPublic = Omit<ShlinkServer, "apiKey"> & {
  apiKeyPreview: string;
};

export type ShlinkClientCredentials = {
  baseUrl: string;
  apiKey?: string;
  id?: string;
  mode?: ShlinkServerMode;
};

export type ShlinkPagination = {
  currentPage: number;
  pagesCount: number;
  itemsPerPage: number;
  itemsInCurrentPage: number;
  totalItems: number;
};

export type ShlinkMeta = {
  validSince?: string | null;
  validUntil?: string | null;
  maxVisits?: number | null;
};

export type ShlinkDomain = {
  domain?: string;
  isDefault?: boolean;
};

export type ShlinkShortUrl = {
  shortCode: string;
  shortUrl: string;
  longUrl: string;
  linkConsole?: {
    protection?: {
      enabled?: boolean;
    };
  };
  dateCreated?: string;
  title?: string | null;
  tags?: string[];
  meta?: ShlinkMeta;
  domain?: string | null;
  visitsSummary?: {
    total?: number;
    nonBots?: number;
    bots?: number;
  };
  crawlable?: boolean;
  forwardQuery?: boolean;
  // TODO: Keep this open for Shlink version-specific fields such as authorApiKey,
  // deviceLongUrls or importSource once we decide the minimum supported API version.
  [key: string]: unknown;
};

export type ShlinkShortUrlsResponse = {
  shortUrls: {
    data: ShlinkShortUrl[];
    pagination: ShlinkPagination;
  };
};

export type ShlinkTagsResponse = {
  tags: {
    data: string[];
  };
};

export type ShlinkTagInfo = {
  tag: string;
  shortUrlsCount?: number;
  visitsSummary?: {
    total?: number;
    nonBots?: number;
    bots?: number;
  };
};

export type ShlinkVisitLocation = {
  countryCode?: string | null;
  countryName?: string | null;
  regionName?: string | null;
  cityName?: string | null;
  timezone?: string | null;
  latLong?: [number, number] | null;
};

export type ShlinkVisit = {
  referer?: string | null;
  date?: string;
  userAgent?: string | null;
  visitLocation?: ShlinkVisitLocation | null;
  potentialBot?: boolean;
  // Shlink versions can add extra visit fields.
  [key: string]: unknown;
};

export type ShlinkVisitsResponse = {
  visits: {
    data: ShlinkVisit[];
    pagination: ShlinkPagination;
  };
  unavailableReason?: string;
  unavailableReasonKey?: string;
};

export type ShlinkHealth = {
  status?: "pass" | "fail" | "warn" | string;
  version?: string;
  links?: Record<string, unknown>;
  checks?: Record<string, unknown>;
  [key: string]: unknown;
};

export type ShlinkCreateShortUrlInput = {
  longUrl: string;
  customSlug?: string;
  title?: string;
  tags?: string[];
  validSince?: string;
  validUntil?: string;
  domain?: string;
  crawlable?: boolean;
  forwardQuery?: boolean;
  linkConsole?: {
    protection?: {
      password: string;
    };
  };
};

export type ShlinkEditShortUrlInput = Partial<
  Pick<ShlinkCreateShortUrlInput, "longUrl" | "title" | "tags" | "validSince" | "validUntil">
>;

export type ShortUrlListParams = {
  page?: number;
  itemsPerPage?: number;
  searchTerm?: string;
  tags?: string[];
  orderBy?: string;
  startDate?: string;
  endDate?: string;
};

export type VisitsParams = {
  page?: number;
  itemsPerPage?: number;
  startDate?: string;
  endDate?: string;
};
