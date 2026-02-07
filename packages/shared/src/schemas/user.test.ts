import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import {
  UserSchema,
  SubscriptionInfoSchema,
  GoogleAuthInputSchema,
  AppleAuthInputSchema,
  EmailPasswordRegisterInputSchema,
  EmailPasswordLoginInputSchema,
  MultiversXAuthInputSchema,
  SessionSchema,
  LinkWalletInputSchema,
  RequestPasswordResetInputSchema,
  ResetPasswordInputSchema,
  AuthProvider,
} from "./user.js";

describe("AuthProvider", () => {
  it("accepts all providers", () => {
    for (const p of ["google", "apple", "email", "multiversx"]) {
      expect(AuthProvider.parse(p)).toBe(p);
    }
  });

  it("rejects unknown provider", () => {
    expect(() => AuthProvider.parse("github")).toThrow();
  });
});

describe("UserSchema", () => {
  const now = new Date().toISOString();

  it("parses a full email+wallet user", () => {
    const user = {
      id: randomUUID(),
      email: "user@example.com",
      displayName: "Test User",
      walletAddress: "erd1qqqqqqqqqqqqqpgq0tajepcazernwt74820t8ef7t28s0gulmhwsm6xhag",
      authProviders: ["google", "multiversx"],
      createdAt: now,
      updatedAt: now,
    };
    const result = UserSchema.parse(user);
    expect(result.subscriptionTier).toBe("explorer");
    expect(result.argumentsUsedThisMonth).toBe(0);
    expect(result.avatarUrl).toBeNull();
  });

  it("parses wallet-only user (null email)", () => {
    const user = {
      id: randomUUID(),
      email: null,
      displayName: "Wallet User",
      walletAddress: "erd1abc123",
      authProviders: ["multiversx"],
      createdAt: now,
      updatedAt: now,
    };
    const result = UserSchema.parse(user);
    expect(result.email).toBeNull();
  });

  it("parses email-only user (null wallet)", () => {
    const user = {
      id: randomUUID(),
      email: "test@test.com",
      displayName: "Email User",
      authProviders: ["email"],
      createdAt: now,
      updatedAt: now,
    };
    const result = UserSchema.parse(user);
    expect(result.walletAddress).toBeNull();
  });

  it("rejects empty authProviders", () => {
    expect(() =>
      UserSchema.parse({
        id: randomUUID(),
        email: "a@b.com",
        displayName: "Test",
        authProviders: [],
        createdAt: now,
        updatedAt: now,
      }),
    ).toThrow();
  });

  it("rejects invalid email format", () => {
    expect(() =>
      UserSchema.parse({
        id: randomUUID(),
        email: "not-an-email",
        displayName: "Test",
        authProviders: ["email"],
        createdAt: now,
        updatedAt: now,
      }),
    ).toThrow();
  });
});

describe("SubscriptionInfoSchema", () => {
  it("parses free tier info", () => {
    const info = {
      tier: "explorer",
      isActive: true,
      argumentsUsed: 0,
      argumentsLimit: 999999,
      renewalDate: null,
    };
    const result = SubscriptionInfoSchema.parse(info);
    expect(result.xmoneySubscriptionId).toBeNull();
  });

  it("parses paid tier info", () => {
    const info = {
      tier: "scholar",
      isActive: true,
      argumentsUsed: 150,
      argumentsLimit: 1000,
      renewalDate: new Date().toISOString(),
      xmoneySubscriptionId: "sub_abc123",
    };
    const result = SubscriptionInfoSchema.parse(info);
    expect(result.tier).toBe("scholar");
  });
});

describe("GoogleAuthInputSchema", () => {
  it("parses valid Google auth input", () => {
    const result = GoogleAuthInputSchema.parse({
      provider: "google",
      idToken: "eyJhbGciOiJSUzI1NiJ9.test",
    });
    expect(result.provider).toBe("google");
  });

  it("rejects wrong provider literal", () => {
    expect(() => GoogleAuthInputSchema.parse({ provider: "apple", idToken: "token" })).toThrow();
  });
});

describe("AppleAuthInputSchema", () => {
  it("parses valid Apple auth input", () => {
    const result = AppleAuthInputSchema.parse({
      provider: "apple",
      idToken: "apple-id-token",
      nonce: "random-nonce-value",
    });
    expect(result.provider).toBe("apple");
  });
});

describe("EmailPasswordRegisterInputSchema", () => {
  it("parses valid registration", () => {
    const result = EmailPasswordRegisterInputSchema.parse({
      provider: "email",
      email: "new@user.com",
      password: "securepassword123",
      displayName: "New User",
    });
    expect(result.email).toBe("new@user.com");
  });

  it("rejects password shorter than 8 chars", () => {
    expect(() =>
      EmailPasswordRegisterInputSchema.parse({
        provider: "email",
        email: "new@user.com",
        password: "short",
        displayName: "User",
      }),
    ).toThrow();
  });
});

describe("EmailPasswordLoginInputSchema", () => {
  it("parses valid login", () => {
    const result = EmailPasswordLoginInputSchema.parse({
      provider: "email",
      email: "user@test.com",
      password: "mypassword",
    });
    expect(result.provider).toBe("email");
  });
});

describe("MultiversXAuthInputSchema", () => {
  it("parses valid MultiversX auth", () => {
    const result = MultiversXAuthInputSchema.parse({
      provider: "multiversx",
      address: "erd1qqqqqqqqqqqqqpgq0tajepcazernwt74820t8ef7t28s0gulmhwsm6xhag",
      signature: "deadbeef",
      token: "native-auth-token",
    });
    expect(result.provider).toBe("multiversx");
  });
});

describe("SessionSchema", () => {
  it("parses valid session", () => {
    const session = {
      userId: randomUUID(),
      email: "user@test.com",
      displayName: "Test User",
      walletAddress: null,
      subscriptionTier: "explorer",
      expiresAt: new Date().toISOString(),
    };
    const result = SessionSchema.parse(session);
    expect(result.walletAddress).toBeNull();
  });

  it("parses session with wallet", () => {
    const session = {
      userId: randomUUID(),
      email: null,
      displayName: "Wallet User",
      walletAddress: "erd1abc",
      subscriptionTier: "scholar",
      expiresAt: new Date().toISOString(),
    };
    const result = SessionSchema.parse(session);
    expect(result.email).toBeNull();
    expect(result.subscriptionTier).toBe("scholar");
  });
});

describe("LinkWalletInputSchema", () => {
  it("parses valid wallet link input", () => {
    const result = LinkWalletInputSchema.parse({
      address: "erd1abc",
      signature: "sig123",
      token: "token123",
    });
    expect(result.address).toBe("erd1abc");
  });
});

describe("RequestPasswordResetInputSchema", () => {
  it("parses valid email", () => {
    const result = RequestPasswordResetInputSchema.parse({ email: "user@test.com" });
    expect(result.email).toBe("user@test.com");
  });

  it("rejects invalid email", () => {
    expect(() => RequestPasswordResetInputSchema.parse({ email: "notanemail" })).toThrow();
  });
});

describe("ResetPasswordInputSchema", () => {
  it("parses valid reset input", () => {
    const result = ResetPasswordInputSchema.parse({
      token: "reset-token-123",
      newPassword: "newpassword123",
    });
    expect(result.token).toBe("reset-token-123");
  });

  it("rejects short password", () => {
    expect(() => ResetPasswordInputSchema.parse({ token: "t", newPassword: "short" })).toThrow();
  });
});
