import { NextRequest } from "next/server";
import { jsonError, jsonOk } from "@/lib/api/http";
import { listSalonsApi } from "@/lib/db/salon-queries";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const district = request.nextUrl.searchParams.get("district")?.trim();
    const search = request.nextUrl.searchParams.get("search")?.trim();

    const salons = listSalonsApi({
      district: district || undefined,
      search: search || undefined,
    });

    return jsonOk(salons);
  } catch (error) {
    console.error("GET /api/salons failed:", error);
    return jsonError("Failed to load salons", 500);
  }
}
