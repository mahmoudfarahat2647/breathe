# src/infrastructure

Persistence detail layer: Supabase clients, repositories, schema mappers.

- Schema changes (`supabase/migrations/*.sql`) must keep [src/infrastructure/supabase/database.types.ts](supabase/database.types.ts) and the mappers in `src/infrastructure/mappers/` in sync - a `schema-contract.test.ts` guards this.
