# Broodly

[![Contributing](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](https://github.com/combsmith/.github/blob/main/CONTRIBUTING.md)

Field-first beekeeping decision-support app. Mobile-first on iOS, Android, and web via a single Expo + React Native codebase with a Go GraphQL API backend on GCP.

## Prerequisites

- **Node.js** >= 20.x (LTS)
- **pnpm** >= 9.x
- **Go** >= 1.24
- **Expo CLI** (`npx expo`)
- **Terraform** >= 1.5 (for infrastructure)

## Getting Started

```bash
# Install dependencies
pnpm install

# Run mobile app (Expo)
pnpm --filter mobile start

# Run API server (Go)
cd apps/api && go run cmd/server/main.go
```

## Monorepo Structure

```
broodly/
├── apps/
│   ├── mobile/          # Expo app (iOS, Android, Web)
│   └── api/             # Go GraphQL API service
├── packages/
│   ├── ui/              # Shared UI component library
│   ├── graphql-types/   # Generated TypeScript types
│   ├── domain-types/    # Shared constants and domain types
│   ├── config/          # Shared configuration
│   └── test-utils/      # Shared testing utilities
├── infra/
│   └── terraform/       # IaC for GCP resources
├── tests/
│   ├── integration/     # Integration tests
│   └── e2e/             # End-to-end tests
└── docs/                # Architecture docs, ADRs, runbooks
```

## License

Broodly is dual-licensed:

- **AGPL-3.0:** [GNU Affero General Public License v3.0](LICENSE) — available for any use, provided you comply with its copyleft and network-source obligations
- **Commercial:** [Commercial License](LICENSE-COMMERCIAL.md) — for users who prefer or require a proprietary/closed-source license

---

## Commercial Support & Licensing

Need enterprise SLAs, custom beekeeping decision-support integrations, or a proprietary commercial license?

Commercial licensing and support are offered through **[CombSmith LLC](https://combsmith.com)**:
- **Commercial Licensing:** Closed-source and proprietary deployment rights exempt from AGPL copyleft obligations.
- **Enterprise Support SLAs:** Priority bug fixes, dedicated maintenance windows, and security updates.
- **Custom Integrations:** Bespoke apiary telemetry pipelines, IoT hardware connectors, and agentic workflows.
- **Consulting & Implementation:** Architecture design, cloud infrastructure rollout, and field-ops optimization.

For commercial inquiries, email [support@combsmith.com](mailto:support@combsmith.com) or visit [combsmith.com](https://combsmith.com).

---

### Contributing

By contributing to this project, you agree to the org-wide [Contributing Guide](https://github.com/combsmith/.github/blob/main/CONTRIBUTING.md) and the project's [Contributor License Agreement](CLA.md).
