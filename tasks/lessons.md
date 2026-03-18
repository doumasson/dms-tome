# Lessons Learned

## Production TDZ Bug (Rollup/Vite)
**Pattern:** `const`/`let` declared in a component body AFTER a `useEffect` (or other hook) that references it in the **dependency array**.

**Why it breaks in production:** Dependency arrays are evaluated synchronously during render. Rollup's minifier does not always hoist the declaration above the hook call, so the variable has not been initialized when the dep array evaluates → "Cannot access 'X' before initialization".

**Rule:** Always declare derived values (`const inCombat`, `const isMyTurn`, etc.) **before** any hooks that reference them in dependency arrays.

**Example (bad):**
```js
useEffect(() => { ... }, [inCombat]); // dep array reads inCombat — TDZ!
const inCombat = encounter.phase !== 'idle'; // declared too late
```

**Example (good):**
```js
const inCombat = encounter.phase !== 'idle'; // declare first
useEffect(() => { ... }, [inCombat]); // safe
```

**Detection:** Run `npm run build` and search the bundle for the minified variable name used in dep arrays before its `let`/`const` declaration. Or just keep declarations at the top of the component before all hooks.
