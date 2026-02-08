import { describe, it, expect } from "vitest";
import { KHQRGenerator, decodeTlv } from "../src/index";

describe("konthaina-khqr", () => {
  it("generates a QR with valid CRC", () => {
    const res = new KHQRGenerator("individual")
      .setBakongAccountId("john_smith@devb")
      .setMerchantName("John Smith")
      .setCurrency("USD")
      .setAmount("1.00")
      .generate();

    expect(KHQRGenerator.verify(res.qr)).toBe(true);
  });

  it("static mode omits timestamp (tag 99)", () => {
    const res = new KHQRGenerator("individual")
      .setStatic(true)
      .setBakongAccountId("john_smith@devb")
      .setMerchantName("John Smith")
      .setCurrency("USD")
      .generate();

    expect(res.timestamp).toBe(null);
    expect(KHQRGenerator.verify(res.qr)).toBe(true);

    const tlvs = decodeTlv(res.qr);
    expect(tlvs["99"]).toBeUndefined();
    expect(tlvs["63"]).toBeDefined();
  });

  it("merchant type requires merchantId and acquiringBank", () => {
    expect(() =>
      new KHQRGenerator("merchant")
        .setBakongAccountId("dev_merchant@devb")
        .setMerchantName("Dev Store")
        .generate(),
    ).toThrow();
  });
});
