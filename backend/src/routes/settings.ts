import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { integrationSettings } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { encryptSecret, decryptSecret, maskPreview } from "../lib/crypto.js";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

/**
 * Fixed catalog of integration credentials the platform knows how to use.
 * This is intentionally NOT free-form — the frontend renders exactly these
 * fields with proper labels/help text, and other modules (traffic.ts,
 * whatsapp.ts once built) read specific keys by name. Add a new entry here
 * before a new integration can store a credential.
 */
export const SETTINGS_CATALOG = [
  {
    key: "here_api_key",
    label: "HERE Traffic API Key",
    module: "Module 6 — Traffic Diversion Engine",
    helpUrl: "https://developer.here.com",
  },
  {
    key: "tomtom_api_key",
    label: "TomTom API Key",
    module: "Module 6 — Traffic Diversion Engine",
    helpUrl: "https://developer.tomtom.com",
  },
  {
    key: "google_maps_api_key",
    label: "Google Maps / Traffic API Key",
    module: "Module 6 — Traffic Diversion Engine",
    helpUrl: "https://console.cloud.google.com/google/maps-apis",
  },
  {
    key: "whatsapp_account_sid",
    label: "Twilio Account SID",
    module: "Module 9 — WhatsApp Advisory Bot",
    helpUrl: "https://console.twilio.com",
  },
  {
    key: "whatsapp_auth_token",
    label: "Twilio Auth Token",
    module: "Module 9 — WhatsApp Advisory Bot",
    helpUrl: "https://console.twilio.com",
  },
  {
    key: "whatsapp_from_number",
    label: "WhatsApp Sender Number (e.g. whatsapp:+14155238886)",
    module: "Module 9 — WhatsApp Advisory Bot",
    helpUrl: "https://console.twilio.com",
  },
] as const;

export type SettingKey = (typeof SETTINGS_CATALOG)[number]["key"];

/** Server-side helper other routes (traffic.ts, whatsapp.ts) will use to
 * read a decrypted credential. Returns null if not configured — callers
 * must handle that gracefully, never assume a key is present. */
export async function getSetting(key: SettingKey): Promise<string | null> {
  const [row] = await db.select().from(integrationSettings).where(eq(integrationSettings.key, key)).limit(1);
  if (!row) return null;
  return decryptSecret(row.encryptedValue);
}

// GET /api/settings — catalog merged with configured/preview state.
// Never returns the decrypted value.
settingsRouter.get("/", requireRole("admin", "commander"), async (_req, res) => {
  const rows = await db.select().from(integrationSettings);
  const byKey = new Map(rows.map((r) => [r.key, r]));

  const settings = SETTINGS_CATALOG.map((entry) => {
    const row = byKey.get(entry.key);
    let preview: string | null = null;
    if (row) {
      try {
        preview = maskPreview(decryptSecret(row.encryptedValue));
      } catch {
        preview = "••••(unreadable — re-enter)";
      }
    }
    return {
      ...entry,
      configured: !!row,
      preview,
      updatedAt: row?.updatedAt ?? null,
    };
  });

  res.json({ settings });
});

const upsertSchema = z.object({
  key: z.enum(SETTINGS_CATALOG.map((s) => s.key) as [SettingKey, ...SettingKey[]]),
  value: z.string().min(1),
});

// PUT /api/settings — add or replace one credential.
settingsRouter.put("/", requireRole("admin", "commander"), async (req, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { key, value } = parsed.data;

  let encryptedValue: string;
  try {
    encryptedValue = encryptSecret(value);
  } catch (e: any) {
    // Most likely SETTINGS_ENCRYPTION_KEY isn't set on the server yet —
    // surface that plainly instead of a generic 500.
    return res.status(500).json({ error: e.message });
  }

  const [existing] = await db.select().from(integrationSettings).where(eq(integrationSettings.key, key)).limit(1);

  if (existing) {
    await db.update(integrationSettings)
      .set({ encryptedValue, updatedBy: req.user!.id, updatedAt: new Date() })
      .where(eq(integrationSettings.key, key));
  } else {
    await db.insert(integrationSettings).values({ key, encryptedValue, updatedBy: req.user!.id });
  }

  res.json({ key, configured: true, preview: maskPreview(value) });
});

settingsRouter.delete("/:key", requireRole("admin", "commander"), async (req, res) => {
  const key = req.params.key;
  await db.delete(integrationSettings).where(eq(integrationSettings.key, key));
  res.json({ key, configured: false });
});
