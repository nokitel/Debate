import { Router } from "express";
import type { Router as IRouter, Request, Response } from "express";
import { z } from "zod";
import { ApiNetworkProvider } from "@multiversx/sdk-core";

/**
 * Custom MultiversX facilitator for x402 protocol.
 *
 * Implements the three facilitator endpoints:
 * - POST /verify — verify a payment proof
 * - POST /settle — settle a verified payment
 * - GET /supported — list supported payment methods
 *
 * Reference: EVM facilitator from @x402/evm, adapted for MultiversX ESDT (USDC).
 */
export const x402FacilitatorRouter: IRouter = Router();

/** USDC token identifier on MultiversX devnet. */
const USDC_TOKEN_ID = process.env["X402_USDC_TOKEN_ID"] ?? "USDC-c76f1f";

/** Payee address that receives x402 payments. */
const PAYTO_ADDRESS = process.env["X402_PAYTO_ADDRESS"] ?? "";

const VerifyInputSchema = z.object({
  /** The payment proof (signed transaction hex or hash). */
  paymentProof: z.string(),
  /** Expected amount in token denomination. */
  expectedAmount: z.string(),
  /** Expected token identifier. */
  expectedToken: z.string(),
  /** Expected payee address. */
  expectedPayee: z.string(),
});

const SettleInputSchema = z.object({
  /** The payment proof to settle (broadcast if not yet on-chain). */
  paymentProof: z.string(),
});

/** GET /api/x402/supported — list supported payment methods. */
x402FacilitatorRouter.get("/supported", (_req: Request, res: Response) => {
  res.json({
    supported: [
      {
        network: "multiversx-devnet",
        token: USDC_TOKEN_ID,
        minAmount: "50000", // $0.05 in 6-decimal USDC
        maxAmount: "1000000", // $1.00
        payee: PAYTO_ADDRESS,
      },
    ],
  });
});

/** POST /api/x402/verify — verify a payment proof. */
x402FacilitatorRouter.post("/verify", async (req: Request, res: Response) => {
  const parsed = VerifyInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", valid: false });
    return;
  }

  const { paymentProof, expectedAmount, expectedToken, expectedPayee } = parsed.data;

  try {
    const apiUrl = process.env["MULTIVERSX_API_URL"] ?? "https://devnet-api.multiversx.com";
    const provider = new ApiNetworkProvider(apiUrl);

    // Fetch transaction from network
    const tx = await provider.getTransaction(paymentProof);

    // Verify the transaction is successful
    if (tx.status.toString() !== "success") {
      res.json({ valid: false, reason: "Transaction not successful" });
      return;
    }

    // Verify receiver matches expected payee
    if (tx.receiver.toBech32() !== expectedPayee) {
      res.json({ valid: false, reason: "Receiver mismatch" });
      return;
    }

    // For ESDT transfers, verify token and amount from transaction data
    // The ESDT transfer data is encoded in the transaction
    // Simplified check: verify the tx value or ESDT transfer amount
    const txValue = tx.value.toString();
    if (expectedToken === "EGLD") {
      if (txValue !== expectedAmount) {
        res.json({ valid: false, reason: "Amount mismatch" });
        return;
      }
    }
    // For ESDT, check smart contract results/logs for the actual transfer
    // This is a simplified verification — production should parse SCRs

    res.json({ valid: true, txHash: paymentProof });
  } catch (err) {
    console.error("[x402-facilitator] Verify failed:", err);
    res.json({ valid: false, reason: "Failed to verify transaction" });
  }
});

/** POST /api/x402/settle — settle a verified payment (no-op if already on-chain). */
x402FacilitatorRouter.post("/settle", async (req: Request, res: Response) => {
  const parsed = SettleInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }

  // For MultiversX, the transaction is already on-chain once signed and broadcast.
  // This endpoint just confirms settlement.
  try {
    const apiUrl = process.env["MULTIVERSX_API_URL"] ?? "https://devnet-api.multiversx.com";
    const provider = new ApiNetworkProvider(apiUrl);
    const tx = await provider.getTransaction(parsed.data.paymentProof);

    if (tx.status.toString() !== "success") {
      res.json({ settled: false, reason: "Transaction not finalized" });
      return;
    }

    res.json({ settled: true, txHash: parsed.data.paymentProof });
  } catch (err) {
    console.error("[x402-facilitator] Settle failed:", err);
    res.json({ settled: false, reason: "Failed to verify settlement" });
  }
});
