/**
 * Ambient declarations for statically-importable image assets. Metro (via
 * babel-preset-expo) resolves these `import`s to numeric asset module IDs at
 * build time, identical to `require("./x.png")`. Typed as `number` so the value
 * is assignable to `Image`'s `source` prop and to `Asset.loadAsync(...)`.
 */
declare module "*.png" {
  const value: number;
  export default value;
}

declare module "*.jpg" {
  const value: number;
  export default value;
}

declare module "*.jpeg" {
  const value: number;
  export default value;
}
