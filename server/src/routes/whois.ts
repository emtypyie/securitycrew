import { Router } from "express";

export const whoisRouter = Router();

interface WhoisResult {
  domain: string;
  ageDays?: number;
  creationDate?: string;
  registrar?: string;
}

// Simple WHOIS lookup using rdap (Registration Data Access Protocol)
// This is a free alternative to traditional WHOIS
async function lookupRDAP(domain: string): Promise<WhoisResult> {
  const tld = domain.split(".").pop() || "com";

  // Try RDAP bootstrap
  const bootstrapUrl = `https://rdap.org/domain/${domain}`;

  try {
    const resp = await fetch(bootstrapUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) {
      return { domain };
    }

    const data = await resp.json() as any;
    const events = data.events || [];
    const registrationEvent = events.find(
      (e: any) => e.eventAction === "registration"
    );

    let ageDays: number | undefined;
    let creationDate: string | undefined;

    if (registrationEvent?.eventDate) {
      creationDate = registrationEvent.eventDate as string;
      const created = new Date(creationDate);
      ageDays = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
    }

    const registrar = data.entities?.[0]?.vcardArray?.[1]?.find(
      (v: any) => v[0] === "fn"
    )?.[3];

    return {
      domain,
      ageDays,
      creationDate,
      registrar: registrar || "Unknown",
    };
  } catch {
    return { domain };
  }
}

whoisRouter.get("/", async (req, res) => {
  const domain = req.query.domain as string;

  if (!domain) {
    res.status(400).json({ error: "domain parameter is required" });
    return;
  }

  const result = await lookupRDAP(domain);
  res.json(result);
});
