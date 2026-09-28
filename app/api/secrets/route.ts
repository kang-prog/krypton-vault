import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import crypto from "node:crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const { ciphertext, iv, ttlSeconds } = body;

    if (!ciphertext || typeof ciphertext !== "string" || !iv || typeof iv !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid required fields (ciphertext, iv)" },
        { status: 400 }
      );
    }

    // Limit payload length to prevent abuse (e.g., max 500KB)
    if (ciphertext.length > 500_000 || iv.length > 100) {
      return NextResponse.json(
        { error: "Payload exceeds maximum allowed size" },
        { status: 413 }
      );
    }

    // Sanitize TTL between 60 seconds (1 min) and 604800 seconds (7 days)
    const parsedTtl = typeof ttlSeconds === "number" ? Math.floor(ttlSeconds) : 3600;
    const ttl = Math.min(Math.max(parsedTtl, 60), 604800);

    // 16-byte random hex ID (32 chars)
    const id = crypto.randomBytes(16).toString("hex");
    const payload = JSON.stringify({ ciphertext, iv });

    // Store in Redis with TTL expiration
    await redis.set(`secret:${id}`, payload, "EX", ttl);

    return NextResponse.json({ id, ttlSeconds: ttl, success: true }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error creating secret:", message);
    return NextResponse.json(
      { error: "Failed to store secret in vault. Please try again." },
      { status: 500 }
    );
  }
}
