import { z } from "zod";
import { PipelineTier } from "./debate.js";

export const AuthProvider = z.enum(["google", "apple", "email", "multiversx"]);
export type AuthProvider = z.infer<typeof AuthProvider>;

export const UserSchema = z.object({
  id: z.string().uuid().describe("Unique user identifier"),
  email: z.string().email().nullable().describe("Email address, null for wallet-only users"),
  displayName: z.string().min(1).max(100).describe("Public display name"),
  avatarUrl: z.string().url().nullable().default(null).describe("Profile avatar URL"),
  walletAddress: z
    .string()
    .nullable()
    .default(null)
    .describe("MultiversX wallet address, null for email-only users"),
  authProviders: z
    .array(AuthProvider)
    .min(1)
    .describe("Authentication providers linked to this account"),
  subscriptionTier: PipelineTier.default("explorer").describe("Current subscription tier"),
  argumentsUsedThisMonth: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Arguments generated in current billing period"),
  createdAt: z.string().datetime().describe("ISO 8601 account creation timestamp"),
  updatedAt: z.string().datetime().describe("ISO 8601 last update timestamp"),
});
export type User = z.infer<typeof UserSchema>;

export const SubscriptionInfoSchema = z.object({
  tier: PipelineTier.describe("Current subscription tier"),
  isActive: z.boolean().describe("Whether the subscription is currently active"),
  argumentsUsed: z.number().int().min(0).describe("Arguments used this billing period"),
  argumentsLimit: z.number().int().min(0).describe("Max arguments allowed this period"),
  renewalDate: z.string().datetime().nullable().describe("Next renewal date, null for free tier"),
  xmoneySubscriptionId: z
    .string()
    .nullable()
    .default(null)
    .describe("xMoney subscription ID for paid tiers"),
});
export type SubscriptionInfo = z.infer<typeof SubscriptionInfoSchema>;

export const GoogleAuthInputSchema = z.object({
  provider: z.literal("google").describe("Auth provider discriminator"),
  idToken: z.string().describe("Google ID token from OAuth flow"),
});
export type GoogleAuthInput = z.infer<typeof GoogleAuthInputSchema>;

export const AppleAuthInputSchema = z.object({
  provider: z.literal("apple").describe("Auth provider discriminator"),
  idToken: z.string().describe("Apple ID token from OAuth flow"),
  nonce: z.string().describe("Nonce for Apple Sign-In verification"),
});
export type AppleAuthInput = z.infer<typeof AppleAuthInputSchema>;

export const EmailPasswordRegisterInputSchema = z.object({
  provider: z.literal("email").describe("Auth provider discriminator"),
  email: z.string().email().describe("User email address"),
  password: z.string().min(8).max(128).describe("Password (min 8 characters)"),
  displayName: z.string().min(1).max(100).describe("Display name for the account"),
});
export type EmailPasswordRegisterInput = z.infer<typeof EmailPasswordRegisterInputSchema>;

export const EmailPasswordLoginInputSchema = z.object({
  provider: z.literal("email").describe("Auth provider discriminator"),
  email: z.string().email().describe("User email address"),
  password: z.string().describe("User password"),
});
export type EmailPasswordLoginInput = z.infer<typeof EmailPasswordLoginInputSchema>;

export const MultiversXAuthInputSchema = z.object({
  provider: z.literal("multiversx").describe("Auth provider discriminator"),
  address: z.string().describe("MultiversX wallet address (bech32)"),
  signature: z.string().describe("Native Auth signature"),
  token: z.string().describe("Native Auth token"),
});
export type MultiversXAuthInput = z.infer<typeof MultiversXAuthInputSchema>;

export const SessionSchema = z.object({
  userId: z.string().uuid().describe("Authenticated user ID"),
  email: z.string().email().nullable().describe("User email, null for wallet-only"),
  displayName: z.string().describe("User display name"),
  walletAddress: z.string().nullable().describe("Linked wallet address, null if not linked"),
  subscriptionTier: PipelineTier.describe("Current tier for authorization checks"),
  expiresAt: z.string().datetime().describe("Session expiry timestamp"),
});
export type Session = z.infer<typeof SessionSchema>;

export const LinkWalletInputSchema = z.object({
  address: z.string().describe("MultiversX wallet address to link"),
  signature: z.string().describe("Native Auth signature proving wallet ownership"),
  token: z.string().describe("Native Auth token"),
});
export type LinkWalletInput = z.infer<typeof LinkWalletInputSchema>;

export const RequestPasswordResetInputSchema = z.object({
  email: z.string().email().describe("Email to send reset link to"),
});
export type RequestPasswordResetInput = z.infer<typeof RequestPasswordResetInputSchema>;

export const ResetPasswordInputSchema = z.object({
  token: z.string().describe("Password reset token from email"),
  newPassword: z.string().min(8).max(128).describe("New password"),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;
