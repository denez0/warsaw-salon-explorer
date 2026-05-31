import { NextRequest } from "next/server";
import { jsonError, jsonOk, parseIdParam } from "@/lib/api/http";
import { getSalonById, updateSalon } from "@/lib/db/salon-queries";
import { validateSalonUpdate } from "@/lib/db/salon-validation";

export const dynamic = "force-dynamic";

type RouteContext = { params: { id: string } };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const id = parseIdParam(context.params.id);
    if (id === null) {
      return jsonError("Invalid salon id", 400);
    }

    const salon = getSalonById(id);
    if (!salon) {
      return jsonError("Salon not found", 404);
    }

    return jsonOk(salon);
  } catch (error) {
    console.error(`GET /api/salons/${context.params.id} failed:`, error);
    return jsonError("Failed to load salon", 500);
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const id = parseIdParam(context.params.id);
    if (id === null) {
      return jsonError("Invalid salon id", 400);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON body", 400);
    }

    const validation = validateSalonUpdate(body);
    if (!validation.ok) {
      return jsonError("Validation failed", 400, validation.errors);
    }

    const salon = updateSalon(id, validation.data);
    if (!salon) {
      return jsonError("Salon not found", 404);
    }

    return jsonOk(salon);
  } catch (error) {
    console.error(`PUT /api/salons/${context.params.id} failed:`, error);
    return jsonError("Failed to update salon", 500);
  }
}
