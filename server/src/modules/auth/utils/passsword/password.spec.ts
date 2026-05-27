import { expect, describe, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";  

describe("Password Utils", () => {
  // Test Case 01: Test hashing when the password is valid
  it("should hash and compare passwords correctly", async () => {
    const password = "my_secure_password";
    const hashedPassword = await hashPassword(password);
    
    expect(hashedPassword).toBeDefined();
    expect(typeof hashedPassword).toBe("string");
    
    const isMatch = await verifyPassword(password, hashedPassword);
    expect(isMatch).toBe(true);
    
    const isNotMatch = await verifyPassword("wrong_password", hashedPassword);
    expect(isNotMatch).toBe(false);
  });

  // Test Case 02: Test hashing when the password is empty, it should throw an error because of the password validation
  it("should handle empty passwords", async () => {
    const password = "";
    
    await expect(hashPassword(password)).rejects.toThrow("Password must be at least 8 characters long");
  });

  // Test Case 03: Test hashing when the password is too long, it should throw an error because of the password validation
  it("should handle excessively long passwords", async () => {
    const password = "a".repeat(129); // 129 characters
    
    await expect(hashPassword(password)).rejects.toThrow("Password must be at most 128 characters long");
  });

});

describe("Password Verification Edge Cases", () => {
  // Test Case 04: Test verifying when the hash is invalid, it should return false
  it("should handle invalid hash formats", async () => {
    const password = "my_secure_password";
    const invalidHash = "invalid_hash_format";
  
    const isMatch = await verifyPassword(password, invalidHash);
    expect(isMatch).toBe(false);
  });
  
  // Test Case 05: Test verifying when the password is empty, it should throw an error because of the password validation
  it("should handle empty passwords during verification", async () => {
    const password = "";
    const hash = await hashPassword("valid_password");
    
    await expect(verifyPassword(password, hash)).rejects.toThrow("Password must be at least 8 characters long");
  }); 

  // Test Case 06: Test verifying when the password is too long, it should throw an error because of the password validation  
  it("should handle excessively long passwords during verification", async () => {
    const password = "a".repeat(129); // 129 characters
    const hash = await hashPassword("valid_password");
    
    await expect(verifyPassword(password, hash)).rejects.toThrow("Password must be at most 128 characters long");
  });
});