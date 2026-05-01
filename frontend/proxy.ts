import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
    const token = req.cookies.get("token")?.value;
    const pathname = req.nextUrl.pathname;

    if (pathname === "/dashboard/login") {
        return NextResponse.next();
    }

    if (pathname.startsWith("/dashboard") && !token) {
        return NextResponse.redirect(new URL("/dashboard/login?error=no-token", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*"],
};
