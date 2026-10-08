import { proxyShlinkPath } from "@/lib/hosted/shlink-proxy";

export const runtime = "nodejs";

/**
 * Shlink 代理入口。
 *
 * 后端由 API Token 的绑定决定，所以地址里不需要再写 serverId：
 *
 *   /api/short-urls             使用该 Token 绑定的第一个后端
 *   /api/default/short-urls     同上（default / auto 别名，兼容保留）
 *   /api/srv_xxx/short-urls     显式指定某个后端
 *
 * `/api/hosted/shlink/<serverId>/<path...>` 同样保留为等价别名。
 *
 * 注意：这是 /api 下的根级 catch-all。Next.js 静态路由优先级更高，
 * 因此 /api/hosted/** 仍然走它自己的路由，不会被这里截走。
 */
const SERVER_ID_PREFIX = "srv_";
const SERVER_ALIASES = new Set(["default", "auto"]);
const DEFAULT_SERVER_ALIAS = "default";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

/** 第一段是别名或 srv_ 前缀时当作后端标识，否则整段都是 Shlink 路径。 */
function resolveTarget(segments: string[]) {
  const [head, ...rest] = segments;

  if (head) {
    if (SERVER_ALIASES.has(head.toLowerCase()) || head.startsWith(SERVER_ID_PREFIX)) {
      return { serverId: head, path: rest };
    }
  }

  return { serverId: DEFAULT_SERVER_ALIAS, path: segments };
}

function handle(request: Request, context: RouteContext) {
  return context.params.then(({ path }) => {
    const target = resolveTarget(path);
    return proxyShlinkPath(request, target.serverId, target.path);
  });
}

export function GET(request: Request, context: RouteContext) {
  return handle(request, context);
}

export function POST(request: Request, context: RouteContext) {
  return handle(request, context);
}

export function PATCH(request: Request, context: RouteContext) {
  return handle(request, context);
}

export function DELETE(request: Request, context: RouteContext) {
  return handle(request, context);
}
