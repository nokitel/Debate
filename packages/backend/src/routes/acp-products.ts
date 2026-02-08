import { Router } from "express";

/**
 * ACP product feed — describes the products available for purchase by AI agents.
 * Per the OpenAI/Stripe ACP specification.
 */
export const acpProductsRouter = Router();

export interface AcpProduct {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
}

export const ACP_PRODUCTS: AcpProduct[] = [
  {
    id: "debate_argument_pro",
    name: "Generate PRO Argument",
    description:
      "Generate a high-quality PRO argument using the 9-stage AI pipeline with evidence grounding and adversarial testing.",
    priceCents: 10,
    currency: "USD",
  },
  {
    id: "debate_argument_con",
    name: "Generate CON Argument",
    description:
      "Generate a high-quality CON argument using the 9-stage AI pipeline with evidence grounding and adversarial testing.",
    priceCents: 10,
    currency: "USD",
  },
];

const productMap = new Map(ACP_PRODUCTS.map((p) => [p.id, p]));

/**
 * Get product by ID.
 */
export function getProduct(productId: string): AcpProduct | undefined {
  return productMap.get(productId);
}

/** GET /api/acp/products — list all available products. */
acpProductsRouter.get("/products", (_req, res) => {
  res.json({ products: ACP_PRODUCTS });
});

/** GET /api/acp/products/:id — get a single product. */
acpProductsRouter.get("/products/:id", (req, res) => {
  const product = productMap.get(req.params["id"] as string);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(product);
});
