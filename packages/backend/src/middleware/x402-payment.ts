import type { Request, Response, NextFunction } from "express";

/**
 * x402 payment middleware.
 *
 * Flow:
 * 1. Request without payment proof → 402 with payment requirements.
 * 2. Request with X-Payment-Proof header → validate with facilitator → pass through.
 *
 * Pricing by tier (in USDC, 6 decimals):
 * - Explorer: $0.05 = 50000
 * - Thinker:  $0.10 = 100000
 * - Scholar:  $0.20 = 200000
 * - Premium:  $0.20 = 200000
 */

interface X402Config {
  /** Amount in USDC smallest unit (6 decimals). */
  amount: string;
  /** Token identifier. */
  token: string;
  /** Facilitator URL for verification. */
  facilitatorUrl: string;
  /** Payee address to receive payment. */
  payToAddress: string;
}

function getPaymentConfig(): X402Config {
  return {
    amount: "100000", // $0.10 default
    token: process.env["X402_USDC_TOKEN_ID"] ?? "USDC-c76f1f",
    facilitatorUrl: process.env["X402_FACILITATOR_URL"] ?? `http://localhost:4000/api/x402`,
    payToAddress: process.env["X402_PAYTO_ADDRESS"] ?? "",
  };
}

/**
 * Express middleware that enforces x402 payment for a route.
 * If no payment proof is provided, returns HTTP 402 with payment requirements.
 * If a proof is provided, validates it with the facilitator before allowing through.
 */
export async function x402PaymentMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const paymentProof = req.headers["x-payment-proof"] as string | undefined;
  const config = getPaymentConfig();

  if (!paymentProof) {
    // Return 402 with payment requirements
    res.status(402).json({
      error: "Payment Required",
      paymentRequirements: {
        amount: config.amount,
        token: config.token,
        network: "multiversx-devnet",
        payTo: config.payToAddress,
        facilitatorUrl: config.facilitatorUrl,
      },
    });
    res.setHeader("X-Payment-Amount", config.amount);
    res.setHeader("X-Payment-Token", config.token);
    res.setHeader("X-Payment-Facilitator-URL", config.facilitatorUrl);
    return;
  }

  // Verify payment proof with facilitator
  try {
    const verifyUrl = `${config.facilitatorUrl}/verify`;
    const verifyResponse = await fetch(verifyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentProof,
        expectedAmount: config.amount,
        expectedToken: config.token,
        expectedPayee: config.payToAddress,
      }),
    });

    const result = (await verifyResponse.json()) as { valid: boolean; reason?: string };
    if (!result.valid) {
      res.status(402).json({
        error: "Payment verification failed",
        reason: result.reason,
      });
      return;
    }

    // Payment verified — proceed
    next();
  } catch (err) {
    console.error("[x402-payment] Verification request failed:", err);
    res.status(500).json({ error: "Payment verification service unavailable" });
  }
}
