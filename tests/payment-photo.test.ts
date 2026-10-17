import test from "node:test";
import assert from "node:assert/strict";
import { paymentPhotoError, detectPaymentPhotoMime, PAYMENT_PHOTO_MAX_BYTES } from "../shared/payment-photo";

test("photos are accepted, including gallery photos with no MIME information", () => {
  for (const type of ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"]) {
    assert.equal(paymentPhotoError({ type, name: "photo", size: 100 }), null);
  }
  assert.equal(paymentPhotoError({ type: "", name: "PHOTO.JPG", size: 100 }), null);
  assert.equal(paymentPhotoError({ type: "application/octet-stream", name: "photo.heic", size: 100 }), null);
});

test("PDF, text, video and SVG documents are not accepted as photos", () => {
  for (const type of ["application/pdf", "text/plain", "video/mp4", "image/svg+xml"]) {
    assert.ok(paymentPhotoError({ type, name: "renamed.jpg", size: 100 }));
  }
  assert.ok(paymentPhotoError({ type: "", name: "proof.pdf", size: 100 }));
});

test("empty and oversized photos have explicit errors", () => {
  assert.ok(paymentPhotoError({ type: "image/png", name: "proof.png", size: 0 }));
  assert.ok(paymentPhotoError({ type: "image/png", name: "proof.png", size: PAYMENT_PHOTO_MAX_BYTES + 1 }));
});

test("actual image signatures are recognized and renamed documents rejected", () => {
  assert.equal(detectPaymentPhotoMime(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])), "image/png");
  assert.equal(detectPaymentPhotoMime(Buffer.from([255, 216, 255, 224, 0, 0, 0, 0, 0, 0, 0, 0])), "image/jpeg");
  assert.equal(detectPaymentPhotoMime(Buffer.from("RIFF0000WEBP0000")), "image/webp");
  assert.equal(detectPaymentPhotoMime(Buffer.from("0000ftypheic0000")), "image/heic");
  assert.equal(detectPaymentPhotoMime(Buffer.from("0000ftypavif0000")), "image/avif");
  assert.equal(detectPaymentPhotoMime(Buffer.from("%PDF-1.7 document")), null);
  assert.equal(detectPaymentPhotoMime(Buffer.from("<svg>not a photo</svg>")), null);
  assert.equal(detectPaymentPhotoMime(Buffer.from("not a photo")), null);
});
