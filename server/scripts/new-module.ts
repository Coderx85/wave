/**
 * Enhanced Module Generator with Clean Architecture Support
 * 
 * Usage:
 *   pnpm new-module <moduleName>              # Default structure
 *   pnpm new-module <moduleName> --clean      # Clean architecture structure
 * 
 * Examples:
 *   pnpm new-module payment                  # Creates src/modules/payment
 *   pnpm new-module orders --clean           # Creates with clean architecture
 */

import { mkdirSync, existsSync, writeFileSync, readFileSync, appendFileSync } from "fs";
import { join } from "path";

// Utility helpers
function writeFile(file: string, content: string) {
  writeFileSync(file, content, { flag: "w" });
}

function appendLine(file: string, line: string) {
  appendFileSync(file, line + "\n");
}

// Get arguments
const moduleName = process.argv[2];
const useCleanArch = process.argv.includes("--clean");

if (!moduleName) {
  console.error(
    "Please provide a module name as an argument.\nUsage: pnpm new-module <module> [--clean]"
  );
  process.exit(1);
}

if (!/^[a-z][a-zA-Z0-9]+$/.test(moduleName)) {
  console.error(
    "Error: Module name must start with a lowercase letter and contain only alphanumeric characters."
  );
  process.exit(1);
}

// Create directory structure
const moduleDir = join("src", "modules", moduleName);
mkdirSync(moduleDir, { recursive: true });

const ServiceName = `${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Service`;

if (useCleanArch) {
  // Clean Architecture structure
  console.log("Creating module with Clean Architecture pattern...");

  // Create domain layer
  const domainDir = join(moduleDir, "domain");
  mkdirSync(join(domainDir, "entities"), { recursive: true });
  mkdirSync(join(domainDir, "value-objects"), { recursive: true });
  mkdirSync(join(domainDir, "interfaces"), { recursive: true });

  // Create use-cases layer
  const useCasesDir = join(moduleDir, "use-cases");
  mkdirSync(join(useCasesDir, "dto"), { recursive: true });

  // Create adapters layer
  const adaptersDir = join(moduleDir, "adapters");
  mkdirSync(join(adaptersDir, "repositories"), { recursive: true });
  mkdirSync(join(adaptersDir, "controllers"), { recursive: true });

  // Create test layer
  mkdirSync(join(moduleDir, "test"), { recursive: true });

  // Domain entity example
  writeFile(
    join(domainDir, "entities", `${moduleName}.ts`),
    `/**
 * ${ServiceName} Entity
 * Core domain entity with business logic.
 * Pure TypeScript - no framework dependencies.
 */

export class ${ServiceName} {
  readonly id: string;
  readonly createdAt: Date;

  constructor(id: string, createdAt: Date) {
    this.id = id;
    this.createdAt = createdAt;
  }

  static create(id: string): ${ServiceName} {
    return new ${ServiceName}(id, new Date());
  }

  toPlainObject() {
    return {
      id: this.id,
      createdAt: this.createdAt,
    };
  }
}
`
  );

  // Repository interface (port)
  writeFile(
    join(domainDir, "interfaces", `${moduleName}-repository.interface.ts`),
    `/**
 * ${ServiceName} Repository Interface (Port)
 * Defines the contract for persistence.
 */

import { ${ServiceName} } from "../entities/${moduleName}";

export interface I${ServiceName}Repository {
  findById(id: string): Promise<${ServiceName} | null>;
  save(item: ${ServiceName}): Promise<${ServiceName}>;
  delete(id: string): Promise<boolean>;
}
`
  );

  // Use case example
  writeFile(
    join(useCasesDir, `create-${moduleName}.use-case.ts`),
    `/**
 * Create ${ServiceName} Use Case
 * Application business rule - orchestrates domain objects.
 */

import { ${ServiceName} } from "../domain/entities/${moduleName}";
import { I${ServiceName}Repository } from "../domain/interfaces/${moduleName}-repository.interface";
import { randomUUID } from "crypto";

export class Create${ServiceName}UseCase {
  constructor(private repository: I${ServiceName}Repository) {}

  async execute(): Promise<${ServiceName}> {
    const item = ${ServiceName}.create(randomUUID());
    return this.repository.save(item);
  }
}
`
  );

  // In-memory repository for testing
  writeFile(
    join(adaptersDir, "repositories", `in-memory-${moduleName}-repository.ts`),
    `/**
 * In-Memory ${ServiceName} Repository (Test Adapter)
 * Used for unit testing - no database required.
 */

import { ${ServiceName} } from "../../domain/entities/${moduleName}";
import { I${ServiceName}Repository } from "../../domain/interfaces/${moduleName}-repository.interface";

export class InMemory${ServiceName}Repository implements I${ServiceName}Repository {
  private store: Map<string, ${ServiceName}> = new Map();

  async findById(id: string): Promise<${ServiceName} | null> {
    return this.store.get(id) ?? null;
  }

  async save(item: ${ServiceName}): Promise<${ServiceName}> {
    this.store.set(item.id, item);
    return item;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }
}
`
  );

  // Controller example
  writeFile(
    join(adaptersDir, "controllers", `${moduleName}.controller.ts`),
    `/**
 * ${ServiceName} Controller
 * Fastify HTTP handlers - only HTTP concerns.
 */

import { FastifyRequest, FastifyReply } from "fastify";
import { Create${ServiceName}UseCase } from "../../use-cases/create-${moduleName}.use-case";

export class ${ServiceName}Controller {
  constructor(private useCase: Create${ServiceName}UseCase) {}

  async create(request: FastifyRequest, reply: FastifyReply) {
    const result = await this.useCase.execute();
    return reply.send({
      ok: true,
      status: 201,
      message: "${ServiceName} created",
      data: result.toPlainObject(),
    });
  }
}
`
  );

  // Test file
  writeFile(
    join(moduleDir, "test", `${moduleName}.spec.ts`),
    `/**
 * ${ServiceName} Unit Tests
 * No database, no framework, no Docker.
 */

import { describe, it, expect } from "vitest";
import { ${ServiceName} } from "../domain/entities/${moduleName}";
import { Create${ServiceName}UseCase } from "../use-cases/create-${moduleName}.use-case";
import { InMemory${ServiceName}Repository } from "../adapters/repositories/in-memory-${moduleName}-repository";

describe("${ServiceName}", () => {
  it("should create a new item", async () => {
    const repository = new InMemory${ServiceName}Repository();
    const useCase = new Create${ServiceName}UseCase(repository);

    const result = await useCase.execute();

    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("should convert to plain object", () => {
    const item = ${ServiceName}.create("test-id");
    const plain = item.toPlainObject();

    expect(plain.id).toBe("test-id");
    expect(plain.createdAt).toBeInstanceOf(Date);
  });
});
`
  );

  // Index file
  writeFile(
    join(moduleDir, "index.ts"),
    `/**
 * ${ServiceName} Module Public API
 * Only export what other modules need.
 */

// Domain
export { ${ServiceName} } from "./domain/entities/${moduleName}";
export type { I${ServiceName}Repository } from "./domain/interfaces/${moduleName}-repository.interface";

// Use Cases
export { Create${ServiceName}UseCase } from "./use-cases/create-${moduleName}.use-case";

// Adapters
export { InMemory${ServiceName}Repository } from "./adapters/repositories/in-memory-${moduleName}-repository";
export { ${ServiceName}Controller } from "./adapters/controllers/${moduleName}.controller";
`
  );

  console.log(`✅ Clean Architecture module '${moduleName}' created at '${moduleDir}'.`);
  console.log("\nDirectory structure:");
  console.log(`  ${moduleDir}/`);
  console.log("  ├── domain/");
  console.log("  │   ├── entities/");
  console.log("  │   ├── value-objects/");
  console.log("  │   └── interfaces/");
  console.log("  ├── use-cases/");
  console.log("  │   └── dto/");
  console.log("  ├── adapters/");
  console.log("  │   ├── repositories/");
  console.log("  │   └── controllers/");
  console.log("  ├── test/");
  console.log("  └── index.ts");
  console.log("\nNext steps:");
  console.log("  1. Review the generated files");
  console.log("  2. Run tests: pnpm test");
  console.log("  3. See CLEAN_ARCHITECTURE.md for patterns");
} else {
  // Original simple structure
  console.log("Creating module with simple pattern...");

  const ServiceName = `${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Service`;

  // Create services
  mkdirSync(moduleDir, { recursive: true });

  writeFile(
    join(moduleDir, `${moduleName}.service.ts`),
    `// ${moduleName}.service.ts
import { type I${ServiceName} } from "./${moduleName}.definition";

export class ${ServiceName} implements I${ServiceName} {
  //TODO:: Implement service methods here
}

export const ${moduleName}Service = new ${ServiceName}();
`
  );

  writeFile(
    join(moduleDir, `${moduleName}.definition.ts`),
    `// ${moduleName}.definition.ts
export interface ${moduleName}DTO {
  // Define DTO properties here
}

export interface create${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}Input {}

export interface I${ServiceName} {
  //TODO:: Define service method signatures here
}
`
  );

  writeFile(
    join(moduleDir, `${moduleName}.spec.ts`),
    `// ${moduleName}.spec.ts
import { type I${ServiceName} } from "./${moduleName}.definition";
import { ${ServiceName} } from "./${moduleName}.service";
import { describe, it, expect, beforeEach } from "vitest";

describe("${ServiceName}", () => {
  let service: I${ServiceName};
  beforeEach(() => { service = new ${ServiceName}(); });
  it("should be defined", () => { expect(service).toBeDefined(); });
});
`
  );

  writeFile(
    join(moduleDir, "index.ts"),
    `export * from "./${moduleName}.service";
export * from "./${moduleName}.definition";
`
  );

  // Update modules index
  const modulesIndex = "src/modules/index.ts";
  const exportLine = `export * from "./${moduleName}";`;
  if (!existsSync(modulesIndex)) {
    writeFile(modulesIndex, exportLine + "\n");
  } else {
    const content = readFileSync(modulesIndex, "utf8");
    if (!content.includes(exportLine)) {
      appendLine(modulesIndex, exportLine);
    }
  }

  // Create test samples
  const testDir = "src/test";
  mkdirSync(testDir, { recursive: true });

  writeFile(
    join(testDir, `${moduleName}.sample.ts`),
    `// ${moduleName}.sample.ts
import { type ${moduleName}DTO } from "@/modules/${moduleName}";
export const sample${moduleName}Data: ${moduleName}DTO = {
  // Populate with sample data
};
`
  );

  // Create mocks
  const mocksDir = join(testDir, "__mocks__");
  mkdirSync(mocksDir, { recursive: true });
  writeFile(
    join(mocksDir, `${moduleName}-mocks.ts`),
    `// ${moduleName}-mocks.ts
import { type ${moduleName}DTO } from "@/modules/${moduleName}";
import { vi } from "vitest";

export const setup${moduleName}Mocks = (options: Partial<${moduleName}DTO> = {}) => {
  // Implement mock setup using options to customize return values
};
`
  );

  const mocksIndex = join(mocksDir, "index.ts");
  const mocksExportLine = `export * from "./${moduleName}-mocks";`;
  if (!existsSync(mocksIndex)) {
    writeFile(mocksIndex, mocksExportLine + "\n");
  } else {
    const content = readFileSync(mocksIndex, "utf8");
    if (!content.includes(mocksExportLine)) {
      appendLine(mocksIndex, mocksExportLine);
    }
  }

  console.log(`✅ Module '${moduleName}' created successfully at '${moduleDir}'.`);
}
