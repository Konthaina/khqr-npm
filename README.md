# konthaina-khqr (npm)

KHQR / EMVCo merchant-presented QR payload generator for Bakong (Cambodia), inspired by `konthaina/khqr-php`.

## Install

```bash
npm i konthaina-khqr
```

## Quick usage

### Individual (Tag 29)

```ts
import { KHQRGenerator } from "konthaina-khqr";

const { qr, md5, timestamp, expirationTimestamp } = new KHQRGenerator("individual")
  .setStatic(true) // static QR (no timestamp)
  .setBakongAccountId("john_smith@devb")
  .setMerchantName("John Smith")
  .setCurrency("USD")
  // .setAmount("1.00") // usually leave empty for static
  // .setStatic(false) // dynamic QR has timestamp and expirationTimestamp
  // .setExpirationDurationMs(5 * 60 * 1000) // default: 5 minutes
  .setMerchantCity("Phnom Penh")
  .generate();

console.log(qr);
console.log(md5);
console.log(timestamp);
console.log(expirationTimestamp);
console.log(KHQRGenerator.verify(qr)); // true/false
```

### Merchant (Tag 30)

```ts
import { KHQRGenerator } from "konthaina-khqr";

const { qr } = new KHQRGenerator("merchant")
  .setBakongAccountId("dev_merchant@devb")
  .setMerchantId("YOUR_MERCHANT_ID")
  .setAcquiringBank("Dev Bank")
  .setMerchantName("Dev Store")
  .setCurrency("KHR")
  .setAmount("1000")
  .generate();
```

## API

- `new KHQRGenerator("individual" | "merchant")`
- `.setStatic(boolean)` (static QR sets POI=11 and omits timestamps; dynamic uses Tag 99 sub-tags 00 and 01)
- `.setExpirationTimestamp(number|string|Date)` (absolute expiration timestamp in milliseconds)
- `.setExpirationDurationMs(number)` (duration from generation time; defaults to 300000)
- `.setBakongAccountId(string)`
- `.setMerchantName(string)`
- `.setMerchantCity(string)`
- `.setCurrency("KHR" | "USD")`
- `.setAmount(number|string)`
- `.setBillNumber(string)`
- `.setMobileNumber(string)`
- `.setStoreLabel(string)`
- `.setTerminalLabel(string)`
- `.setPurposeOfTransaction(string)`
- `.setMerchantAlternateLanguagePreference(string)`
- `.setMerchantNameAlternateLanguage(string)`
- `.setMerchantCityAlternateLanguage(string)`
- merchant-only:
  - `.setMerchantId(string)`
  - `.setAcquiringBank(string)`
- individual optional:
  - `.setAccountInformation(string)`
  - `.setAcquiringBank(string)`

Helpers:
- `KHQRGenerator.verify(qr: string): boolean`
- `verifyCrc(qr: string): boolean`
- `decodeTlv(qr: string): Record<string,string>`

## Dev

```bash
npm i
npm run build
npm test
```

## Publish

1) Update `package.json` name/version.
2) Build:
```bash
npm run build
```
3) Publish:
```bash
npm login
npm publish --access public
```

## Release (Update version)

1) Bump version:
```bash
npm version patch
```
(0.1.0 → 0.1.1)

2) Tag release:
```bash
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0
```

3) Build + Publish:
```bash
npm run build
npm publish
```
