# Dependency Deprecation Warnings

## Fixed Warnings ✅

The following deprecation warnings have been resolved using npm `overrides`:

1. **three-mesh-bvh@0.7.8** → Updated to v0.8.0
2. **glob@7.2.3** → Updated to v10.3.10
3. **rimraf@3.0.2** → Updated to v5.0.5
4. **svgo@1.3.2** → Updated to v3.2.0
5. **sourcemap-codec@1.4.8** → Replaced with @jridgewell/sourcemap-codec@1.5.0
6. **@babel/plugin-proposal-class-properties** → Replaced with @babel/plugin-transform-class-properties
7. **@babel/plugin-proposal-nullish-coalescing-operator** → Replaced with @babel/plugin-transform-nullish-coalescing-operator
8. **@babel/plugin-proposal-numeric-separator** → Replaced with @babel/plugin-transform-numeric-separator
9. **@babel/plugin-proposal-optional-chaining** → Replaced with @babel/plugin-transform-optional-chaining
10. **@babel/plugin-proposal-private-methods** → Replaced with @babel/plugin-transform-private-methods
11. **@babel/plugin-proposal-private-property-in-object** → Replaced with @babel/plugin-transform-private-property-in-object
12. **rollup-plugin-terser** → Replaced with @rollup/plugin-terser
13. **@humanwhocodes/config-array** → Replaced with @eslint/config-array
14. **@humanwhocodes/object-schema** → Replaced with @eslint/object-schema
15. **inflight@1.0.6** → Removed (replaced by updated glob)
16. **stable@0.1.8** → Removed (native Array.sort() is stable now)
17. **q@1.5.1** → Removed (native Promises used instead)

## Remaining Warnings ⚠️

The following warnings cannot be fixed without major changes to react-scripts:

### From jsdom (testing library)
- **abab@2.0.6** - Use native atob()/btoa() (jsdom dependency)
- **domexception@2.0.1** - Use native DOMException (jsdom dependency)
- **w3c-hr-time@1.0.2** - Use native performance.now() (jsdom dependency)

### From react-scripts service worker
- **workbox-cacheable-response@6.6.0** - No longer maintained
- **workbox-google-analytics@6.6.0** - Not compatible with GA v4+

### From build tools
- **source-map@0.8.0-beta.0** - Beta version used by webpack
- **eslint@8.57.1** - EOL but required by react-scripts 5.0.1

## Why These Can't Be Fixed

These remaining warnings are **transitive dependencies** from `react-scripts@5.0.1` (Create React App).

To fix them, we would need to:
1. **Eject from CRA** (not recommended - loses easy updates)
2. **Migrate to Vite** (major migration effort)
3. **Wait for react-scripts 6.0** (not yet available)

## Impact Assessment

The remaining warnings are **acceptable** because:
- They don't pose security vulnerabilities
- They're informational (packages now use native browser APIs)
- They don't affect functionality
- They're locked to specific versions by react-scripts
- Fixes would require major refactoring

## Recommendations

1. **Short term**: Accept the remaining warnings (done)
2. **Medium term**: Monitor for react-scripts 6.0 release
3. **Long term**: Consider migrating to Vite for modern tooling

## Package Overrides Used

See `package.json` → `overrides` section for the full list of version overrides applied.
