import { proxyShlinkPath } from "@/lib/hosted/shlink-proxy";

const DEFAULT_SERVER_ALIAS = "default";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    path: string[];
  }>;
};

function handle(request: Request, context: RouteContext) {
  return context.params.then(({ path }) => proxyShlinkPath(request, DEFAULT_SERVER_ALIAS, path));
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
