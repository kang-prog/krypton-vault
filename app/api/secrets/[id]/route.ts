import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string" || !/^[a-f0-9]{24,64}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid secret ID format" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const shouldBurn = searchParams.get("burn") === "true";

    if (shouldBurn) {
      // Atomically retrieve and permanently delete the secret from Redis
      const raw = await redis.getdel(`secret:${id}`);
      if (!raw) {
        return NextResponse.json(
          { error: "Secret not found or has already been viewed and destroyed." },
          { status: 404 }
        );
      }

      const payload = JSON.parse(raw);
      return NextResponse.json({
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        burned: true,
      });
    }

    // Status check without burning
    const remainingTtl = await redis.ttl(`secret:${id}`);
    if (remainingTtl <= 0) {
      return NextResponse.json(
        { error: "Secret not found or has already expired.", exists: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      exists: true,
      ttl: remainingTtl,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error retrieving secret:", message);
    return NextResponse.json(
      { error: "Failed to access secret vault" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!id || typeof id !== "string" || !/^[a-f0-9]{24,64}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid secret ID format" }, { status: 400 });
    }

    // Atomically retrieve and delete in single Redis operation
    const raw = await redis.getdel(`secret:${id}`);

    if (!raw) {
      return NextResponse.json(
        { error: "This secret does not exist or has already been viewed and destroyed." },
        { status: 404 }
      );
    }

    const payload = JSON.parse(raw);
    return NextResponse.json({
      ciphertext: payload.ciphertext,
      iv: payload.iv,
      burned: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error burning secret:", message);
    return NextResponse.json(
      { error: "Failed to retrieve and destroy secret" },
      { status: 500 }
    );
  }
}