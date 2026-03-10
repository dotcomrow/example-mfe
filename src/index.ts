import { MODULE_KEY } from "./constants";
import { createCmsModuleDefinition, cmsModuleDefinition, mount, resolveHostProps } from "./host-adapter";
import { moduleDefinition } from "./manifest";
import { createModule, normalizeAsyncConfig, resolveChatProps } from "./module";

type GlobalRegistryEntry = {
  moduleKey: string;
  createModule: typeof createModule;
  createCmsModuleDefinition: typeof createCmsModuleDefinition;
  cmsModuleDefinition: typeof cmsModuleDefinition;
  mount: typeof mount;
  moduleDefinition: typeof moduleDefinition;
  resolveHostProps: typeof resolveHostProps;
  resolveChatProps: typeof resolveChatProps;
  normalizeAsyncConfig: typeof normalizeAsyncConfig;
};

type GlobalScope = typeof globalThis & {
  SuncoastMfeRegistry?: Record<string, GlobalRegistryEntry>;
};

const globalScope = globalThis as GlobalScope;
if (!globalScope.SuncoastMfeRegistry) {
  globalScope.SuncoastMfeRegistry = {};
}

globalScope.SuncoastMfeRegistry[MODULE_KEY] = {
  moduleKey: MODULE_KEY,
  createModule,
  createCmsModuleDefinition,
  cmsModuleDefinition,
  mount,
  moduleDefinition,
  resolveHostProps,
  resolveChatProps,
  normalizeAsyncConfig,
};

export {
  MODULE_KEY,
  createModule,
  createCmsModuleDefinition,
  cmsModuleDefinition,
  moduleDefinition,
  mount,
  normalizeAsyncConfig,
  resolveChatProps,
  resolveHostProps,
};
