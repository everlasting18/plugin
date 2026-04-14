export type LicenseTier = "free" | "pro";

export interface VerifyResult {
  valid: boolean;
  tier: LicenseTier;
  expires: number | null;
  message: string;
}

export interface UsageSummary {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
}

export interface AuthContext {
  tier: LicenseTier;
  siteUrl: string;
  domainId: string;
  isPro: boolean;
  usageCount: number;
  usageLimit: number;
  usageRemaining: number;
}
