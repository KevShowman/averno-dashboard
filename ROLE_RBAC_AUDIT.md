# Role & RBAC Audit (averno-dashboard)

This document maps all roles currently present in the codebase, where they are used, what they can do, and how users obtain them.

## 1) Complete list of roles used in the application

Source of truth: `apps/api/prisma/schema.prisma` (`enum Role`).

### A. Leadership + rank hierarchy (core RBAC)
- `EL_PATRON`
- `DON_CAPITAN`
- `DON_COMANDANTE`
- `EL_MANO_DERECHA`
- `EL_CUSTODIO`
- `EL_MENTOR`
- `EL_ENCARGADO`
- `EL_TENIENTE`
- `SOLDADO`
- `EL_PREFECTO`
- `EL_CONFIDENTE`
- `EL_PROTECTOR`
- `EL_NOVATO`

### B. Functional roles
- `CONSEJERO`
- `RUTAS`
- `LOGISTICA`
- `INTELIGENCIA`
- `FORMACION`
- `SICARIO`
- `CONTACTO`

### C. Special external-access roles
- `PARTNER`
- `TAXI`
- `TAXI_LEAD`

### D. Legacy roles still present in enum/code
- `ADMIN`
- `QUARTIERMEISTER`
- `MITGLIED`
- `GAST`
- `ROUTENVERWALTUNG`
- `FUTURO`

---

## 2) Role definitions, RBAC implementation, and usage locations

## Core RBAC plumbing
- Role enum: `apps/api/prisma/schema.prisma`
- Role metadata decorator: `apps/api/src/auth/decorators/roles.decorator.ts`
- Role guard enforcement (`role` + `allRoles`): `apps/api/src/auth/guards/roles.guard.ts`
- Frontend helpers (`hasRole`, leadership constants): `apps/web/src/lib/utils.ts`

## Auth + Discord role synchronization
- OAuth entry/callback and partner/taxi login states: `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/strategies/discord.strategy.ts`
- Discord role validation + highest-role calculation + sync: `apps/api/src/discord/discord.service.ts`
- Discord role mapping setup script: `apps/api/src/scripts/setup-discord-roles.ts`
- Manual role elevation script (`ADMIN`): `apps/api/src/scripts/make-admin.ts`

## Controllers directly gated with `@Roles(...)`
- `apps/api/src/abmeldung/abmeldung.controller.ts`
- `apps/api/src/audit/audit.controller.ts`
- `apps/api/src/aufstellung/aufstellung.controller.ts`
- `apps/api/src/bloodlist/bloodlist.controller.ts`
- `apps/api/src/casa/casa.controller.ts`
- `apps/api/src/cash/cash.controller.ts`
- `apps/api/src/communication/communication.controller.ts`
- `apps/api/src/discord/discord.controller.ts`
- `apps/api/src/equipment/equipment.controller.ts`
- `apps/api/src/familiensammeln/familiensammeln.controller.ts`
- `apps/api/src/items/items.controller.ts`
- `apps/api/src/member-files/member-files.controller.ts`
- `apps/api/src/modules/modules.controller.ts`
- `apps/api/src/packages/packages.controller.ts`
- `apps/api/src/sanctions/sanctions.controller.ts`
- `apps/api/src/settings/settings.controller.ts`
- `apps/api/src/sicario/sicario.controller.ts`
- `apps/api/src/users/users.controller.ts`
- `apps/api/src/weekly-delivery/weekly-delivery.controller.ts`

---

## 3) Purpose, privileges, and access control by role

> Notes:
> - `@Roles` checks are enforced by `RolesGuard`.
> - Some areas use service-level checks and flags (`isPartner`, `isTaxi`, `isTaxiLead`) in addition to role values.

| Role | Main purpose / privilege level | Where used for access control (examples) | Special privileges |
|---|---|---|---|
| `EL_PATRON` | Highest authority | Many `@Roles` endpoints (cash, discord admin ops, settings, users, modules, etc.) | Exclusive gates include `cash` approval endpoints, `users/:id/roles`, `discord/roles`, module management |
| `DON_CAPITAN` | Top leadership | Leadership-gated controllers (packages, attendance-adjacent flows, settings, discord ops, etc.) | Leadership privileges without patron-only exclusives |
| `DON_COMANDANTE` | Top leadership | Same leadership groups as above | Leadership privileges |
| `EL_MANO_DERECHA` | Top leadership | Same leadership groups as above | Leadership privileges |
| `EL_CUSTODIO` | Rank role | Included in role models/helpers and hierarchy | Rank-based identity; not a frequent explicit gate in controllers |
| `EL_MENTOR` | Rank role | Role model/helpers/hierarchy | Rank-based identity |
| `EL_ENCARGADO` | Rank role | Role model/helpers/hierarchy | Rank-based identity |
| `EL_TENIENTE` | Rank role | Role model/helpers/hierarchy | Rank-based identity |
| `SOLDADO` | Core member rank | Included in audit/packages/weekly-delivery/discord sync user endpoints | Base operational access in several list/logistics endpoints |
| `EL_PREFECTO` | Rank role | Role model/helpers/hierarchy | Rank-based identity |
| `EL_CONFIDENTE` | Rank role | Role model/helpers/hierarchy | Rank-based identity |
| `EL_PROTECTOR` | Rank role | Role model/helpers/hierarchy | Rank-based identity |
| `EL_NOVATO` | Entry rank | Role model/helpers/hierarchy | Lowest rank within core hierarchy |
| `CONSEJERO` | Functional role | Role metadata in `organigramm` + clothing mappings | Functional assignment for org/clothing grouping |
| `RUTAS` | Functional route role | `packages`, `weekly-delivery`, `discord/sync-user-role` + `discord/user-roles` | Route-related management access |
| `LOGISTICA` | Functional logistics role | `items`, `equipment`, `packages`, `discord/sync-user-role` + `discord/user-roles` | Logistics/lager management permissions |
| `INTELIGENCIA` | Functional role | Role mappings in organigramm/clothing; frontend map visibility checks (`KartePage`) | Intelligence-specific UI access paths |
| `FORMACION` | Functional training role | `bloodlist` create/update endpoints include this role | Can perform training/blood-list actions without top leadership |
| `SICARIO` | Functional/special ops role | `sicario` create path + audit/packages/weekly-delivery role sets | Sicario operation access |
| `CONTACTO` | Functional communications role | Frontend checks (`DashboardPage`, `KartePage`, `ListenfuehrungPage`, `Layout`) | Contact-related UI capability |
| `PARTNER` | External partner account | Partner workflow + protected partner route model | Access isolated to partner area (`/app/partner`, map/list/tafelrunde subset) |
| `TAXI` | External taxi driver | Taxi service checks (`isTaxi`/role), taxi protected routes | Taxi dashboard/assignment flow only |
| `TAXI_LEAD` | Taxi leadership | Taxi key creation + assignment management | Can create/manage keys and manage taxi assignments |
| `ADMIN` (legacy) | Legacy superuser alias | Included in legacy leadership checks (`partner`, `tafelrunde`) and scripts | Transitional admin path (`make-admin`) |
| `QUARTIERMEISTER` (legacy) | Legacy role | Legacy migration/hierarchy code, schema | Backward compatibility |
| `MITGLIED` (legacy) | Legacy role | Legacy migration/hierarchy code, schema | Backward compatibility |
| `GAST` (legacy) | Legacy role | Legacy migration/hierarchy code, schema | Backward compatibility |
| `ROUTENVERWALTUNG` (legacy but still gated) | Legacy route role | Still appears in `packages`, `audit`, `weekly-delivery`, `discord` role checks | Route-management compatibility role |
| `FUTURO` (legacy) | Legacy low-access role | Hierarchy + role list metadata | Candidate/low-level compatibility role |

---

## 4) Role acquisition methods

## Automatic via Discord role sync (primary path)
- Implemented in:
  - `apps/api/src/auth/auth.service.ts` (`validateDiscordUser`)
  - `apps/api/src/discord/discord.service.ts` (`validateUserAccess`, `syncUserRole`, `syncAllUserRoles`)
- Mapping source: DB table `DiscordRoleMapping` (configured by `setup-discord-roles.ts`).
- On login, user gets:
  - `role` = highest mapped role
  - `allRoles` = all mapped roles
  - `discordRoles` = raw Discord role IDs

### Roles explicitly seeded in `setup-discord-roles.ts`
- Hierarchy roles: `EL_PATRON`, `DON_CAPITAN`, `DON_COMANDANTE`, `EL_MANO_DERECHA`, `EL_CUSTODIO`, `EL_MENTOR`, `EL_ENCARGADO`, `EL_TENIENTE`, `SOLDADO`, `EL_PREFECTO`, `EL_CONFIDENTE`, `EL_PROTECTOR`, `EL_NOVATO`
- Additional mapped roles: `ROUTENVERWALTUNG`, `SICARIO`

## Manual/admin assignment
- `PUT /users/:id/roles` (gated to `EL_PATRON`) updates `allRoles` and recomputes highest `role`: `apps/api/src/users/users.controller.ts`, `apps/api/src/users/users.service.ts`.
- `pnpm make-admin <DISCORD_ID>` sets role to `ADMIN`: `apps/api/src/scripts/make-admin.ts`.
- Migration scripts exist for legacy role transitions: `apps/api/src/scripts/migrate-roles*.ts`, `fix-old-role-mappings.ts`.

## Manual verification workflows (non-standard Discord role path)
- Partner flow (manual approval): `apps/api/src/partner/partner.controller.ts`, `apps/api/src/partner/partner.service.ts`
  - Approved request sets `role = PARTNER`, `allRoles = [PARTNER]`, `isPartner = true`.

- Taxi flow (key-based onboarding): `apps/api/src/taxi/taxi.controller.ts`, `apps/api/src/taxi/taxi.service.ts`
  - Valid key sets `isTaxi = true`, role to `TAXI` or `TAXI_LEAD`.

---

## 5) Role-gated features/functions (high-level map)

- **Leadership (top 4)**: broad management access across casa, familiensammeln, sanctions, settings, users deletion, discord sync/import/channels, packages/equipment/items, communication, attendance-adjacent flows.
- **`EL_PATRON` only**:
  - cash approve/reject actions (`apps/api/src/cash/cash.controller.ts`)
  - user role edits (`apps/api/src/users/users.controller.ts`)
  - module management (`apps/api/src/modules/modules.controller.ts`)
  - discord server-role list endpoint (`apps/api/src/discord/discord.controller.ts`)
- **`LOGISTICA`**: inventory/equipment/packages and some discord self-sync endpoints.
- **`RUTAS` / `ROUTENVERWALTUNG`**: route/logistic package + weekly-delivery + audit/discord utility endpoints.
- **`SICARIO`**: sicario operation creation + included in several operational views.
- **`FORMACION`**: blood list create/update rights.
- **`PARTNER` / `TAXI` / `TAXI_LEAD`**: separated user journeys and route restrictions in frontend (`ProtectedRoute.tsx`) plus dedicated backend service checks.

---

## 6) Special privileges and external integrations

## Special privileges
- `EL_PATRON`: highest-level control and patron-only endpoints.
- `TAXI_LEAD` (or leadership equivalents in taxi logic): can create master keys and manage assignments.
- `PARTNER` users: bypass normal Discord-role access checks during partner login state and rely on approval workflow.

## Webhooks / external role-related integrations
- Partner/taxi/tafelrunde notifications: `apps/api/src/discord/discord.service.ts` via `DISCORD_PARTNER_WEBHOOK_URL`.
- Aufstellung notifications: `apps/api/src/aufstellung/discord-webhook.service.ts` via `DISCORD_WEBHOOK_URL`.
- Abmeldung notifications: `apps/api/src/abmeldung/discord-webhook.service.ts` via `DISCORD_ABMELDUNG_WEBHOOK_URL`.
- Discord membership and role sync requires `DISCORD_BOT_TOKEN` + `DISCORD_GUILD_ID`.

---

## 7) Important observations (current state)

- Frontend still contains legacy role strings (`DON`, `ASESOR`) in some type/display helpers (`apps/web/src/stores/auth.ts`, `apps/web/src/lib/utils.ts`) while backend enum uses `DON_CAPITAN` / `DON_COMANDANTE` and no `ASESOR` role. This should be aligned as follow-up cleanup (remove/replace legacy frontend role strings or add an explicit compatibility mapping).
- Legacy roles remain in schema and some services/scripts for backward compatibility (`ADMIN`, `QUARTIERMEISTER`, `MITGLIED`, `GAST`, `FUTURO`, `ROUTENVERWALTUNG`).
- Effective access checks frequently combine `role` and `allRoles`; both are relevant for accurate authorization analysis.
