import { argon2id, type Options, verify, hash } from "argon2";
import { tryCatch } from "@/lib/try-catch-wrapper";
import z from "zod";

const options: Options = {
  type: argon2id,
  memoryCost: 2 ** 16, // 64 MiB
  timeCost: 3,
  parallelism: 1,
  hashLength: 32,
  salt: Buffer.alloc(16), // 16 bytes salt
  secret: Buffer.alloc(32), // 32 bytes secret
};

const passwordSchema = z.string().min(8, "Password must be at least 8 characters long").max(128, "Password must be at most 128 characters long");

export async function hashPassword(password: string): Promise<string> {
  passwordSchema.parse(password);

  return tryCatch({
    ctx: async () => {
      return await hash(password, options);
    },
    errorMessage: "FAILED_TO_HASH_PASSWORD",
  })
};

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  passwordSchema.parse(password);

  // Argon2 PHC hashes start with "$"; treat invalid formats as non-matching.
  if (!hash.startsWith("$")) {
    return false;
  }

  return tryCatch({
    ctx: async () => {
      return await verify(hash, password, options);
    },
    errorMessage: "FAILED_TO_VERIFY_PASSWORD",
  });
};