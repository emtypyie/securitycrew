import { Router } from "express";
import tls from "tls";

export const tlsRouter = Router();

interface TLSResult {
  valid: boolean;
  issuer?: string;
  validFrom?: string;
  validTo?: string;
  daysUntilExpiry?: number;
  protocol?: string;
  weakCipher?: boolean;
  selfSigned?: boolean;
}

const WEAK_PROTOCOLS = ["TLSv1", "TLSv1.1", "SSLv3", "SSLv2"];

tlsRouter.get("/", (req, res) => {
  const domain = req.query.domain as string;

  if (!domain) {
    res.status(400).json({ error: "domain parameter is required" });
    return;
  }

  try {
    const socket = tls.connect(443, domain, { rejectUnauthorized: false }, () => {
      const cert = socket.getPeerCertificate();
      const protocol = socket.getProtocol() || "unknown";

      const result: TLSResult = {
        valid: socket.authorized || false,
        protocol,
        weakCipher: WEAK_PROTOCOLS.includes(protocol),
        selfSigned: cert.subject?.CN === cert.issuer?.CN,
      };

      if (cert.valid_from) result.validFrom = cert.valid_from;
      if (cert.valid_to) {
        result.validTo = cert.valid_to;
        const expiry = new Date(cert.valid_to);
        result.daysUntilExpiry = Math.floor(
          (expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
      }
      if (cert.issuer) {
        const issuer = cert.issuer;
        const issuerO = Array.isArray(issuer.O) ? issuer.O[0] : issuer.O;
        const issuerCN = Array.isArray(issuer.CN) ? issuer.CN[0] : issuer.CN;
        const issuerOU = Array.isArray(issuer.OU) ? issuer.OU[0] : issuer.OU;
        result.issuer = issuerO || issuerCN || issuerOU || "Unknown";
      }

      socket.destroy();
      res.json(result);
    });

    socket.on("error", () => {
      if (res.headersSent) return;
      res.json({
        valid: false,
        protocol: "none",
        selfSigned: false,
        weakCipher: false,
      });
    });

    socket.setTimeout(5000, () => {
      socket.destroy();
      if (res.headersSent) return;
      res.json({
        valid: false,
        protocol: "timeout",
        selfSigned: false,
        weakCipher: false,
      });
    });
  } catch {
    res.json({
      valid: false,
      protocol: "error",
      selfSigned: false,
      weakCipher: false,
    });
  }
});
