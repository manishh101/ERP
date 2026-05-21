import { PrismaClient } from "@prisma/client";
import { AsyncLocalStorage } from "async_hooks";

export const tenantStorage = new AsyncLocalStorage<{ tenantId: string }>();

declare global {
  var basePrisma: PrismaClient | undefined;
}

// We keep a reference to the base Prisma Client
export const basePrisma =
  global.basePrisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.basePrisma = basePrisma;
}

// Recursively injects tenantId into nested create/upsert relational operations
function injectTenantId(obj: any, tenantId: string) {
  if (!obj || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      injectTenantId(item, tenantId);
    }
    return;
  }

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === "object") {
      if (key === "create" || key === "createMany") {
        if (Array.isArray(val)) {
          for (const item of val) {
            if (item && typeof item === "object") {
              item.tenantId = tenantId;
              injectTenantId(item, tenantId);
            }
          }
        } else if (val && typeof val === "object") {
          if (val.data && Array.isArray(val.data)) {
            for (const item of val.data) {
              if (item && typeof item === "object") {
                item.tenantId = tenantId;
                injectTenantId(item, tenantId);
              }
            }
          } else {
            val.tenantId = tenantId;
            injectTenantId(val, tenantId);
          }
        }
      } else if (key === "connectOrCreate") {
        if (Array.isArray(val)) {
          for (const item of val) {
            if (item && typeof item === "object" && item.create) {
              item.create.tenantId = tenantId;
              injectTenantId(item.create, tenantId);
            }
          }
        } else if (val && typeof val === "object" && val.create) {
          val.create.tenantId = tenantId;
          injectTenantId(val.create, tenantId);
        }
      } else if (key === "upsert") {
        if (Array.isArray(val)) {
          for (const item of val) {
            if (item && typeof item === "object") {
              if (item.create) {
                item.create.tenantId = tenantId;
                injectTenantId(item.create, tenantId);
              }
              if (item.update) {
                item.update.tenantId = tenantId;
                injectTenantId(item.update, tenantId);
              }
            }
          }
        } else if (val && typeof val === "object") {
          if (val.create) {
            val.create.tenantId = tenantId;
            injectTenantId(val.create, tenantId);
          }
          if (val.update) {
            val.update.tenantId = tenantId;
            injectTenantId(val.update, tenantId);
          }
        }
      } else {
        injectTenantId(val, tenantId);
      }
    }
  }
}

// Helper to convert PascalCase model name to camelCase for Prisma client lookups
function toCamelCase(str: string): string {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

// Extend Prisma Client to automatically filter and inject tenantId
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const store = tenantStorage.getStore();
        const tenantId = store?.tenantId;

        // Tenant model itself is global / not tenant-scoped
        if ((model as string) === "Tenant") {
          return (query as any)(args);
        }

        const anyArgs = args as any;

        if (tenantId) {
          // Inject tenantId for write operations
          if (operation === "create") {
            anyArgs.data = anyArgs.data || {};
            anyArgs.data.tenantId = tenantId;
            injectTenantId(anyArgs.data, tenantId);
          } else if (operation === "createMany") {
            if (Array.isArray(anyArgs.data)) {
              anyArgs.data = anyArgs.data.map((item: any) => ({
                ...item,
                tenantId,
              }));
            } else if (anyArgs.data) {
              anyArgs.data.tenantId = tenantId;
            }
            injectTenantId(anyArgs.data, tenantId);
          } else if (operation === "upsert") {
            anyArgs.create = anyArgs.create || {};
            anyArgs.create.tenantId = tenantId;
            anyArgs.update = anyArgs.update || {};
            anyArgs.update.tenantId = tenantId;
            anyArgs.where = anyArgs.where || {};
            anyArgs.where.tenantId = tenantId;
            injectTenantId(anyArgs.create, tenantId);
            injectTenantId(anyArgs.update, tenantId);
          } else if (operation === "update" || operation === "updateMany") {
            anyArgs.data = anyArgs.data || {};
            injectTenantId(anyArgs.data, tenantId);
            anyArgs.where = anyArgs.where || {};
            anyArgs.where.tenantId = tenantId;
          } else if (
            operation === "findUnique" ||
            operation === "findUniqueOrThrow"
          ) {
            // Convert findUnique to findFirst/findFirstOrThrow to support filtering by non-unique fields (tenantId)
            const fallbackOp =
              operation === "findUnique" ? "findFirst" : "findFirstOrThrow";
            anyArgs.where = anyArgs.where || {};
            anyArgs.where.tenantId = tenantId;
            
            // Bypass the extension chain to run as base client operation
            const modelKey = toCamelCase(model);
            return (basePrisma[modelKey as any] as any)[fallbackOp](anyArgs);
          } else if (
            [
              "findFirst",
              "findFirstOrThrow",
              "findMany",
              "count",
              "delete",
              "deleteMany",
              "aggregate",
              "groupBy",
            ].includes(operation)
          ) {
            anyArgs.where = anyArgs.where || {};
            anyArgs.where.tenantId = tenantId;
          }
        }

        return (query as any)(anyArgs);
      },
    },
  },
});
export type ExtendedPrismaClient = typeof prisma;
