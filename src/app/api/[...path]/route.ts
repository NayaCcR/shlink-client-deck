import { proxyShlinkPath } from "@/lib/hosted/shlink-proxy";

export const runtime = "nodejs";

/**
 * Shlink 代理入口。
 *
 *   /api/short-urls              使用该 API Token 绑定的后端
 *   /api/srv_xxx/short-urls      显式指定某个后端
 *
 * 后端由 Token 的绑定决定，所以地址里不需要再写 serverId。
 *
 * 注意：这是 /api 下的根级 catch-all。Next.js 的静态路由优先级更高，
 * 因此 /api/hosted/** 仍然走它自己的路由，不会被这里截走。
 */
const SERVER_ID_PREFIX = "srv_";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

/** 第一段带 srv_ 前缀时当作后端标识，否则整段都是 Shlink 路径。 */
function resolveTarget(segments: string[]) {
  const [head, ...rest] = segments;

  if (head?.startsWith(SERVER_ID_PREFIX)) {
    return { serverId: head, path: rest };
  }

  return { serverId: null, path: segments };
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
