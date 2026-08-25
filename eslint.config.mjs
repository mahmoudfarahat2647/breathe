import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import boundaries from "eslint-plugin-boundaries";

const element = (type) => ({ element: { type } });
const toElement = (type) => ({ to: element(type) });

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
  {
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/include": ["src/**/*.{ts,tsx}"],
      "boundaries/legacy-warnings": false,
      "boundaries/elements": [
        { type: "test", pattern: "src/test/**" },
        { type: "domain", pattern: "src/domain/**" },
        { type: "application", pattern: "src/application/**" },
        { type: "infrastructure", pattern: "src/infrastructure/**" },
        { type: "presentation", pattern: "src/presentation/**" },
        { type: "app", pattern: "src/app/**" },
        { type: "components", pattern: "src/components/**" },
        { type: "lib", pattern: "src/lib/**" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          checkAllOrigins: true,
          policies: [
            {
              from: element("domain"),
              allow: [
                toElement("domain"),
                // Pure domain may use language builtins / type-only tooling only via no-restricted-imports.
              ],
            },
            {
              from: element("application"),
              allow: [toElement("domain"), toElement("application")],
            },
            {
              from: element("infrastructure"),
              allow: [
                toElement("domain"),
                toElement("application"),
                toElement("infrastructure"),
                {
                  to: {
                    module: {
                      origin: ["external"],
                      source: ["@supabase/*"],
                    },
                  },
                },
              ],
            },
            {
              from: element("presentation"),
              allow: [
                toElement("domain"),
                toElement("application"),
                toElement("presentation"),
                toElement("components"),
                toElement("lib"),
                {
                  to: {
                    module: {
                      origin: ["external"],
                      source: ["react", "react-dom", "react-*"],
                    },
                  },
                },
              ],
            },
            {
              from: element("components"),
              allow: [
                toElement("components"),
                toElement("lib"),
                {
                  to: {
                    module: {
                      origin: ["external"],
                      source: [
                        "react",
                        "react-dom",
                        "react-*",
                        "class-variance-authority",
                        "clsx",
                        "tailwind-merge",
                        "lucide-react",
                        "@base-ui/*",
                      ],
                    },
                  },
                },
              ],
            },
            {
              from: element("lib"),
              allow: [
                toElement("lib"),
                {
                  to: {
                    module: {
                      origin: ["external"],
                      source: ["clsx", "tailwind-merge", "class-variance-authority"],
                    },
                  },
                },
              ],
            },
            {
              from: element("app"),
              allow: [
                toElement("domain"),
                toElement("application"),
                toElement("infrastructure"),
                toElement("presentation"),
                toElement("components"),
                toElement("lib"),
                toElement("app"),
                {
                  to: {
                    module: {
                      origin: ["external"],
                      source: ["react", "react-dom", "react-*", "next", "next/*"],
                    },
                  },
                },
              ],
            },
            {
              from: element("test"),
              allow: [
                toElement("domain"),
                toElement("application"),
                toElement("infrastructure"),
                toElement("presentation"),
                toElement("components"),
                toElement("lib"),
                toElement("test"),
                {
                  to: {
                    module: {
                      origin: ["external"],
                      source: [
                        "vitest",
                        "@testing-library/*",
                        "react",
                        "react-dom",
                        "react-*",
                        "@supabase/*",
                      ],
                    },
                  },
                },
                {
                  to: {
                    module: {
                      origin: ["core"],
                      source: ["fs", "path", "node:fs", "node:path"],
                    },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/domain/**/*.{ts,tsx}", "src/application/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              message: "Inner layers cannot import React.",
            },
            {
              name: "react-dom",
              message: "Inner layers cannot import React DOM.",
            },
            {
              name: "next",
              message: "Inner layers cannot import Next.js.",
            },
            {
              name: "@supabase/supabase-js",
              message: "Inner layers cannot import Supabase.",
            },
            {
              name: "@supabase/ssr",
              message: "Inner layers cannot import Supabase SSR.",
            },
          ],
          patterns: [
            {
              group: ["react-*", "next/*", "@supabase/*"],
              message:
                "Inner layers cannot import React, Next.js, or Supabase packages.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/proxy.ts"],
    rules: {
      "boundaries/dependencies": "off",
    },
  },
]);

export default eslintConfig;
