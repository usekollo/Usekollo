This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app), scaffolded with the same tooling/conventions as [med-archive](../med-archive).

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. Set `NEXT_PUBLIC_API_URL` in `.env.local` once the backend is ready.

## Stack

- **Next.js 16** (App Router, React Compiler on)
- **Tailwind v4** + **shadcn/ui** (`components.json`, `style: base-nova`)
- **@tanstack/react-query** — server state, with a devtools panel in dev
- **zustand** — client/UI state (see `src/lib/stores`)
- **react-hook-form** + **zod** (`@hookform/resolvers`) — forms & validation
- **axios** — `axiosPublic`/`axiosAuth` instances in `src/lib/config/axios.ts`, with request logging and a 401 refresh-token retry flow
- **sonner** — toasts
- **framer-motion** — animation, shared variants in `src/lib/utils/animations.ts`
- **js-cookie** — auth token persistence

## Project structure

```
src/
  app/                  # routes (App Router)
  components/
    ui/                 # shadcn primitives (button, input, form, ...)
    ui/custom/           # composed fields built on the primitives (InputField, ...)
    providers/           # ReactQueryProvider, AuthProvider
    shared/               # generic reusable bits (EmptyState, PageLoading, ...)
  features/
    <feature>/
      components/         # feature UI
      hooks/index.ts       # react-query hooks (useQuery/useMutation) for this feature
      types.ts             # payload/response types for this feature
  hooks/                  # small cross-feature hooks (useAxiosAuth, ...)
  lib/
    config/               # axios.ts, apiRoutes.ts (backend paths), routes.ts (page paths)
    stores/               # zustand stores (userAuthStore, ...)
    validations/          # zod schemas, one file per domain
    utils/                # cn(), getApiErrorMessage(), animation variants
  types/                  # shared API response types
```

New features follow the `features/<name>/{components,hooks,types.ts}` shape — see `features/auth` for a worked example (LoginForm + its hooks + zod schema).

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
