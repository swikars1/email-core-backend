import crypto, { BinaryLike } from "crypto";

export function decryptRSAWithPrivateKey(
  privateKeyPem: string,
  encryptedData: string
) {
  try {
    const encryptedBuffer = Buffer.from(encryptedData, "base64");

    const decryptedBuffer = crypto.privateDecrypt(
      privateKeyPem,
      encryptedBuffer
    );

    return decryptedBuffer;
  } catch (error) {
    if (error instanceof Error && error.message.includes("bad decrypt")) {
      throw new Error("Incorrect decryption key or passphrase");
    } else {
      throw new Error("Decryption failed: " + error.message);
    }
  }
}

export function verifySignature(
  encodedSignature: string,
  signedPayload: any,
  symmetricKey: BinaryLike
) {
  const hmac = crypto.createHmac("sha256", symmetricKey);
  hmac.write(signedPayload, "base64");
  return encodedSignature === hmac.digest("base64");
}

export function decryptPayload(
  base64encodedPayload: string,
  decryptedSymetricKey: any
) {
  const iv = Buffer.alloc(16, 0);
  decryptedSymetricKey.copy(iv, 0, 0, 16);
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    decryptedSymetricKey,
    iv
  );
  let decryptedPayload = decipher.update(
    base64encodedPayload,
    "base64",
    "utf8"
  );
  decryptedPayload += decipher.final("utf8");

  return decryptedPayload;
}
