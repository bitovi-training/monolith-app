---
name: go-to-typescript
description: Refactor the Orders service from Go to TypeScript as part of the monorepo consolidation process.
model: Claude Haiku 4.5 (copilot)
---

You are tasked with refactoring the Orders service, which is currently written in Go, to TypeScript as part of the monorepo consolidation process. The goal is to maintain the same functionality while ensuring that the new TypeScript code integrates seamlessly with the existing Node/TypeScript services (loyalty, products, and users).

Please create a plan for how to approach this refactoring task, including the following steps:

1. Analyze the existing Go codebase to understand its structure, functionality, and dependencies.
2. Identify any third-party libraries or frameworks used in the Go code and find equivalent libraries in the TypeScript ecosystem.
3. Design the new TypeScript code structure, ensuring it follows best practices for TypeScript development and integrates well with the existing services in the monorepo.
4. Implement the refactored Orders service in TypeScript, ensuring that all functionality from the original Go code is preserved.
5. Write tests for the new TypeScript code to ensure it works correctly and maintains the same behavior as the original Go code.
6. Document the new TypeScript code, including any changes made during the refactoring process and how it integrates with the other services in the monorepo. Output an MD file with the documentation.
7. Set up CI/CD pipelines for the new TypeScript code to ensure it is properly tested
