import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", ".test-build/**", ".e2e-output/**", "public/**", "next-env.d.ts"] },
  ...nextVitals,
  ...nextTypescript,
];

export default config;
