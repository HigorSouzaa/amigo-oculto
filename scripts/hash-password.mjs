import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Informe uma senha com pelo menos 12 caracteres: npm run hash-password -- <senha>");
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const hash = await promisify(scryptCallback)(password, salt, 64);
console.log(`${salt}:${hash.toString("hex")}`);
