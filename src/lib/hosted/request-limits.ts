import type { HostedApiTokenRestrictions } from "@/lib/hosted/types";

/**
 * 调用来源解析与限制匹配。
 *
 * 本站点部署在 Cloudflare 之后，且 nginx 已用 real_ip 模块还原真实访客 IP，
 * 因此优先取 CF-Connecting-IP，其次 X-Real-IP，最后退回 X-Forwarded-For。
 */
export type ClientRequestContext = {
  ip: string | null;
  country: string | null;
  origin: string | null;
  host: string | null;
};

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

export function readClientContext(request: Request): ClientRequestContext {
  const requestHeaders = request.headers;
  const referer = requestHeaders.get("referer");

  return {
    ip:
      firstHeaderValue(requestHeaders.get("cf-connecting-ip")) ||
      firstHeaderValue(requestHeaders.get("x-real-ip")) ||
      firstHeaderValue(requestHeaders.get("x-forwarded-for")),
    country: resolveCountry(requestHeaders.get("cf-ipcountry")),
    origin: resolveOrigin(requestHeaders.get("origin"), referer),
    host: firstHeaderValue(requestHeaders.get("host"))
  };
}

function resolveCountry(value: string | null) {
  const normalized = value?.trim().toUpperCase();
  // Cloudflare 用 XX / T1 表示无法识别，按「未知」处理。
  return normalized && !["XX", "T1"].includes(normalized) ? normalized : null;
}

function resolveOrigin(origin: string | null, referer: string | null) {
  const direct = origin?.trim();
  if (direct) {
    return direct;
  }

  if (!referer) {
    return null;
  }

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ IP 匹配

function parseIpv4(value: string): bigint | null {
  const parts = value.split(".");
  if (parts.length !== 4) {
    return null;
  }

  let result = 0n;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) {
      return null;
    }
    const octet = Number(part);
    if (octet > 255) {
      return null;
    }
    result = (result << 8n) | BigInt(octet);
  }

  return result;
}

function parseIpv6(value: string): bigint | null {
  let source = value.trim();

  // ::ffff:1.2.3.4 这类内嵌 IPv4 先展开成两组十六进制。
  const embedded = source.match(/^(.*:)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (embedded) {
    const octets = parseIpv4(embedded[2]);
    if (octets === null) {
      return null;
    }
    const high = ((octets >> 16n) & 0xffffn).toString(16);
    const low = (octets & 0xffffn).toString(16);
    source = `${embedded[1]}${high}:${low}`;
  }

  const halves = source.split("::");
  if (halves.length > 2) {
    return null;
  }

  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  if (halves.length === 1 && head.length !== 8) {
    return null;
  }
  if (halves.length === 2 && head.length + tail.length > 7) {
    return null;
  }

  const groups =
    halves.length === 2
      ? [...head, ...Array<string>(8 - head.length - tail.length).fill("0"), ...tail]
      : head;
  if (groups.length !== 8) {
    return null;
  }

  let result = 0n;
  for (const group of groups) {
    if (!/^[0-9a-fA-F]{1,4}$/.test(group)) {
      return null;
    }
    result = (result << 16n) | BigInt(parseInt(group, 16));
  }

  return result;
}

function parseIp(value: string): { family: 4 | 6; bits: bigint } | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes(":")) {
    const bits = parseIpv6(trimmed);
    return bits === null ? null : { family: 6, bits };
  }

  const bits = parseIpv4(trimmed);
  return bits === null ? null : { family: 4, bits };
}

/** 单条规则支持 `1.2.3.4` 精确匹配与 `1.2.3.0/24` CIDR（IPv4/IPv6 均可）。 */
export function matchesIpRule(ip: string, rule: string): boolean {
  const target = parseIp(ip);
  if (!target) {
    return false;
  }

  const [addressPart, prefixPart] = rule.trim().split("/");
  const network = parseIp(addressPart ?? "");
  if (!network || network.family !== target.family) {
    return false;
  }

  const totalBits = target.family === 4 ? 32 : 128;
  const prefix = prefixPart === undefined ? totalBits : Number(prefixPart);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > totalBits) {
    return false;
  }

  const shift = BigInt(totalBits - prefix);
  return target.bits >> shift === network.bits >> shift;
}

// ------------------------------------------------------------------ 域名匹配

/**
 * 规则可以是完整来源 `https://sub.31n.cc`、主机名 `sub.31n.cc`，
 * 或通配 `*.31n.cc`（匹配子域，不含裸域本身）。
 */
export function matchesOriginRule(
  value: { origin: string | null; host: string | null },
  rule: string
): boolean {
  const normalized = rule.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  const candidates = new Set<string>();
  if (value.origin) {
    const origin = value.origin.toLowerCase();
    candidates.add(origin);
    try {
      candidates.add(new URL(origin).hostname);
    } catch {
      // 非法来源直接跳过主机名候选。
    }
  }
  if (value.host) {
    candidates.add(value.host.toLowerCase().split(":")[0]);
  }

  if (normalized.startsWith("*.")) {
    const suffix = normalized.slice(2);
    return [...candidates].some(
      (candidate) => candidate.endsWith(`.${suffix}`) && candidate !== suffix
    );
  }

  if (normalized.includes("://")) {
    return candidates.has(normalized);
  }

  return [...candidates].some(
    (candidate) => candidate === normalized || candidate.endsWith(`.${normalized}`)
  );
}

// ------------------------------------------------------------------ 综合校验

export function checkTokenRestrictions(
  request: Request,
  restrictions: HostedApiTokenRestrictions | null | undefined,
  serverId: string
): string | null {
  if (!restrictions) {
    return null;
  }

  const serverIds = restrictions.serverIds ?? [];
  if (serverIds.length > 0 && !serverIds.includes(serverId)) {
    return "This API token is not allowed to access the requested Shlink server.";
  }

  const client = readClientContext(request);

  const allowedIps = restrictions.allowedIps ?? [];
  if (allowedIps.length > 0) {
    if (!client.ip) {
      return "This API token requires a verifiable client IP address.";
    }
    const clientIp = client.ip;
    if (!allowedIps.some((rule) => matchesIpRule(clientIp, rule))) {
      return "Client IP is not allowed by this API token.";
    }
  }

  const allowedOrigins = restrictions.allowedOrigins ?? [];
  if (allowedOrigins.length > 0) {
    if (!allowedOrigins.some((rule) => matchesOriginRule(client, rule))) {
      return "Request origin is not allowed by this API token.";
    }
  }

  const allowedCountries = restrictions.allowedCountries ?? [];
  if (allowedCountries.length > 0) {
    if (!client.country || !allowedCountries.includes(client.country)) {
      return "Client region is not allowed by this API token.";
    }
  }

  return null;
}

function unique(values: string[] | undefined) {
  return [...new Set((values ?? []).map((item) => item.trim()).filter(Boolean))];
}

/** 把创建请求里的限制字段规整化；全部为空时返回 undefined，表示不限制。 */
export function normalizeTokenRestrictions(input: {
  serverIds?: string[];
  allowedOrigins?: string[];
  allowedIps?: string[];
  allowedCountries?: string[];
}): HostedApiTokenRestrictions | undefined {
  const restrictions: HostedApiTokenRestrictions = {
    serverIds: unique(input.serverIds),
    allowedOrigins: unique(input.allowedOrigins),
    allowedIps: unique(input.allowedIps),
    allowedCountries: unique(input.allowedCountries).map((item) => item.toUpperCase())
  };

  const isEmpty = Object.values(restrictions).every((list) => list.length === 0);
  return isEmpty ? undefined : restrictions;
}
