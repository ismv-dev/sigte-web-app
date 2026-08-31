import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React Compiler-readiness rules (eslint-plugin-react-hooks v7, bundled
      // starting with eslint-config-next 16). Este proyecto no habilita
      // reactCompiler en next.config.ts, y el patron "fetch on mount" con
      // useEffect(() => { load() }, []) usado en ~10 paginas es intencional,
      // no un bug. Se bajan a warning para no forzar una reescritura masiva.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".claude/**",
    ".remember/**",
  ]),
]);

export default eslintConfig;
