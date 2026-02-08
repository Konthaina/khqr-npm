import crypto from "node:crypto";

export type MerchantType = "individual" | "merchant";

export interface GenerateResult {
  qr: string;
  timestamp: string | null;
  type: MerchantType;
  md5: string;
}

/**
 * KHQR / EMVCo merchant-presented payload generator for Bakong Cambodia.
 *
 * - Individual: Tag 29
 * - Merchant:   Tag 30
 * - Additional: Tag 62
 * - Alt Lang:   Tag 64
 * - Timestamp:  Tag 99 (dynamic only)
 * - CRC:        Tag 63 (CRC-16/CCITT-FALSE)
 */
export class KHQRGenerator {
  static readonly MERCHANT_TYPE_INDIVIDUAL: MerchantType = "individual";
  static readonly MERCHANT_TYPE_MERCHANT: MerchantType = "merchant";

  private merchantType: MerchantType;

  private bakongAccountId?: string;
  private merchantName?: string;

  private merchantId?: string; // merchant type
  private acquiringBank?: string; // merchant required, individual optional
  private accountInformation?: string; // individual optional

  private merchantCity = "Phnom Penh";
  private currency: "KHR" | "USD" = "KHR";
  private amount?: string;

  // Tag 62 (Additional data)
  private billNumber?: string;
  private mobileNumber?: string;
  private storeLabel?: string;
  private terminalLabel?: string;
  private purposeOfTransaction?: string;

  // Tag 15 UPI (optional)
  private upiAccountInformation?: string;

  // Tag 64 (Alternate language)
  private merchantAlternateLanguagePreference?: string;
  private merchantNameAlternateLanguage?: string;
  private merchantCityAlternateLanguage?: string;

  private isStatic = false;

  constructor(merchantType: MerchantType) {
    this.merchantType = merchantType;
  }

  setStatic(v: boolean) {
    this.isStatic = !!v;
    return this;
  }

  setBakongAccountId(v: string) {
    this.bakongAccountId = v;
    return this;
  }

  setMerchantName(v: string) {
    this.merchantName = v;
    return this;
  }

  setMerchantId(v: string) {
    this.merchantId = v;
    return this;
  }

  setAcquiringBank(v: string) {
    this.acquiringBank = v;
    return this;
  }

  setAccountInformation(v: string) {
    this.accountInformation = v;
    return this;
  }

  setMerchantCity(v: string) {
    this.merchantCity = v;
    return this;
  }

  setCurrency(v: string) {
    const up = v.toUpperCase();
    if (up !== "KHR" && up !== "USD") throw new Error("currency must be KHR or USD");
    this.currency = up as "KHR" | "USD";
    return this;
  }

  setAmount(v: number | string) {
    this.amount = normalizeAmount(v, this.currency);
    return this;
  }

  setBillNumber(v: string) {
    this.billNumber = v;
    return this;
  }

  setMobileNumber(v: string) {
    this.mobileNumber = v;
    return this;
  }

  setStoreLabel(v: string) {
    this.storeLabel = v;
    return this;
  }

  setTerminalLabel(v: string) {
    this.terminalLabel = v;
    return this;
  }

  setPurposeOfTransaction(v: string) {
    this.purposeOfTransaction = v;
    return this;
  }

  setUpiAccountInformation(v: string) {
    this.upiAccountInformation = v;
    return this;
  }

  setMerchantAlternateLanguagePreference(v: string) {
    this.merchantAlternateLanguagePreference = v;
    return this;
  }

  setMerchantNameAlternateLanguage(v: string) {
    this.merchantNameAlternateLanguage = v;
    return this;
  }

  setMerchantCityAlternateLanguage(v: string) {
    this.merchantCityAlternateLanguage = v;
    return this;
  }

  generate(): GenerateResult {
    if (!this.bakongAccountId) throw new Error("BakongAccountID is required");
    if (!this.merchantName) throw new Error("MerchantName is required");

    if (this.merchantType === "merchant") {
      if (!this.merchantId) throw new Error("MerchantID is required for merchant type");
      if (!this.acquiringBank) throw new Error("AcquiringBank is required for merchant type");
    }

    // Truncation limits commonly used in KHQR implementations
    const bakongAccountId = truncUtf8(this.bakongAccountId, 32);
    const merchantName = truncUtf8(this.merchantName, 25);
    const merchantCity = truncUtf8(this.merchantCity || "Phnom Penh", 15);

    const merchantId = this.merchantId ? truncUtf8(this.merchantId, 32) : undefined;
    const acquiringBank = this.acquiringBank ? truncUtf8(this.acquiringBank, 32) : undefined;
    const accountInformation = this.accountInformation ? truncUtf8(this.accountInformation, 32) : undefined;

    const billNumber = this.billNumber ? truncUtf8(this.billNumber, 25) : undefined;
    const mobileNumber = this.mobileNumber ? truncUtf8(this.mobileNumber, 25) : undefined;
    const storeLabel = this.storeLabel ? truncUtf8(this.storeLabel, 25) : undefined;
    const terminalLabel = this.terminalLabel ? truncUtf8(this.terminalLabel, 25) : undefined;
    const purpose = this.purposeOfTransaction ? truncUtf8(this.purposeOfTransaction, 25) : undefined;

    const upi = this.upiAccountInformation ? truncUtf8(this.upiAccountInformation, 31) : undefined;

    const langPref = this.merchantAlternateLanguagePreference
      ? truncUtf8(this.merchantAlternateLanguagePreference, 2)
      : undefined;
    const nameAlt = this.merchantNameAlternateLanguage
      ? truncUtf8(this.merchantNameAlternateLanguage, 25)
      : undefined;
    const cityAlt = this.merchantCityAlternateLanguage
      ? truncUtf8(this.merchantCityAlternateLanguage, 15)
      : undefined;

    const poi = this.isStatic ? "11" : "12";
    const currencyNumeric = this.currency === "KHR" ? "116" : "840";

    // Common defaults in KHQR samples
    const merchantCategoryCode = "5999";
    const countryCode = "KH";

    let payload = "";
    payload += tlv("00", "01");
    payload += tlv("01", poi);

    if (upi) payload += tlv("15", upi);

    if (this.merchantType === "individual") {
      let t = "";
      t += tlv("00", bakongAccountId);
      if (accountInformation) t += tlv("01", accountInformation);
      if (acquiringBank) t += tlv("02", acquiringBank);
      payload += tlv("29", t);
    } else {
      let t = "";
      t += tlv("00", bakongAccountId);
      t += tlv("01", merchantId!);
      t += tlv("02", acquiringBank!);
      payload += tlv("30", t);
    }

    payload += tlv("52", merchantCategoryCode);
    payload += tlv("53", currencyNumeric);
    if (this.amount != null) payload += tlv("54", this.amount);
    payload += tlv("58", countryCode);
    payload += tlv("59", merchantName);
    payload += tlv("60", merchantCity);

    // Tag 62: Additional data (optional)
    {
      let t = "";
      if (billNumber) t += tlv("01", billNumber);
      if (mobileNumber) t += tlv("02", mobileNumber);
      if (storeLabel) t += tlv("03", storeLabel);
      if (terminalLabel) t += tlv("07", terminalLabel);
      if (purpose) t += tlv("08", purpose);
      if (t) payload += tlv("62", t);
    }

    // Tag 64: Alternate language (optional)
    {
      let t = "";
      if (langPref) t += tlv("00", langPref);
      if (nameAlt) t += tlv("01", nameAlt);
      if (cityAlt) t += tlv("02", cityAlt);
      if (t) payload += tlv("64", t);
    }

    // Tag 99: Timestamp template (dynamic only)
    // KHQR implementations commonly wrap the timestamp in sub-tag 00.
    const timestamp = this.isStatic ? null : String(Date.now());
    if (timestamp) {
      const t99 = tlv("00", timestamp);
      payload += tlv("99", t99);
    }

    // CRC: Tag 63 (length 04). Compute over payload + "6304"
    const crcInput = payload + "6304";
    const crc = crc16CcittFalseHex(crcInput);
    const qr = crcInput + crc;

    const md5 = crypto.createHash("md5").update(qr, "utf8").digest("hex");

    return { qr, timestamp, type: this.merchantType, md5 };
  }

  static verify(qr: string): boolean {
    return verifyCrc(qr);
  }
}

export function verifyCrc(qr: string): boolean {
  const i = qr.lastIndexOf("6304");
  if (i < 0) return false;
  const provided = qr.slice(i + 4, i + 8);
  if (provided.length !== 4) return false;

  const crcInput = qr.slice(0, i + 4); // include "6304"
  const expected = crc16CcittFalseHex(crcInput);
  return provided.toUpperCase() === expected.toUpperCase();
}

/** Top-level TLV decoder (does not recursively decode nested templates). */
export function decodeTlv(qr: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  while (i + 4 <= qr.length) {
    const tag = qr.slice(i, i + 2);
    const lenStr = qr.slice(i + 2, i + 4);
    if (!/^\d{2}$/.test(lenStr)) break;
    const len = Number(lenStr);
    const vStart = i + 4;
    const vEnd = vStart + len;
    const value = qr.slice(vStart, vEnd);
    out[tag] = value;
    i = vEnd;
  }
  return out;
}

// ---------------- helpers ----------------

function tlv(tag: string, value: string): string {
  if (!/^\d{2}$/.test(tag)) throw new Error(`Invalid tag: ${tag}`);
  const len = utf8ByteLength(value);
  if (len > 99) throw new Error(`TLV value too long for tag ${tag}: ${len}`);
  return tag + String(len).padStart(2, "0") + value;
}

function utf8ByteLength(s: string): number {
  return Buffer.byteLength(s, "utf8");
}

function truncUtf8(s: string, maxBytes: number): string {
  if (utf8ByteLength(s) <= maxBytes) return s;
  let out = "";
  for (const ch of s) {
    const next = out + ch;
    if (utf8ByteLength(next) > maxBytes) break;
    out = next;
  }
  return out;
}

/** CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) */
function crc16CcittFalseHex(input: string): string {
  const bytes = Buffer.from(input, "utf8");
  let crc = 0xffff;
  for (const b of bytes) {
    crc ^= (b & 0xff) << 8;
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function normalizeAmount(v: number | string, currency: "KHR" | "USD"): string {
  if (typeof v === "string") {
    const s = v.trim();
    if (!/^\d+(\.\d+)?$/.test(s)) throw new Error("Amount must be numeric");
    return normalizeAmountString(s, currency);
  }

  if (!Number.isFinite(v)) throw new Error("Amount must be finite");
  if (v < 0) throw new Error("Amount must be >= 0");
  return normalizeAmountString(String(v), currency);
}

function normalizeAmountString(s: string, currency: "KHR" | "USD"): string {
  if (currency === "USD") {
    const n = Number(s);
    return n.toFixed(2);
  }

  if (!s.includes(".")) return s;
  s = s.replace(/0+$/, "").replace(/\.$/, "");
  return s.length ? s : "0";
}
