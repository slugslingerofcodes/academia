import { registerHooks } from "node:module";

/**
 * Lets Node run the app's TypeScript sources directly under `node --test`.
 *
 * Node strips types on its own now, but it still resolves imports the ESM way:
 * `./schedule` is not a file, `./schedule.ts` is. The sources are written for
 * a bundler and omit extensions throughout, so tests would otherwise need a
 * build step or a test framework just to load them.
 */
registerHooks({
  resolve(specifier, context, nextResolve) {
    const extensionless =
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      !/\.[cm]?[jt]sx?$/i.test(specifier);
    if (extensionless) {
      try {
        return nextResolve(`${specifier}.ts`, context);
      } catch {
        // fall through: let Node report its own error for the original path
      }
    }
    return nextResolve(specifier, context);
  },
});
