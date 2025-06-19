/**
 * VOUS N'AVEZ PROBABLEMENT PAS BESOIN DE MODIFIER CE FICHIER, SAUF SI :
 * 1. Vous souhaitez modifier le contexte de la requête (voir Partie 1).
 * 2. Vous souhaitez créer un nouveau middleware ou un nouveau type de procédure (voir Partie 3).
 *
 * EN BREF - C'est ici que tout le code serveur tRPC est créé et connecté. Les éléments dont vous aurez
 * besoin sont documentés en conséquence vers la fin.
 */
import { auth } from "@clerk/nextjs/server";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import { db } from "~/server/db";

/**
 * 1. CONTEXTE
 *
 * Cette section définit les "contextes" disponibles dans l'API backend.
 *
 * Ils vous permettent d'accéder à des éléments lors du traitement d'une requête, comme la base de données, la session, etc.
 *
 * Cette fonction d'aide génère les "internes" pour un contexte tRPC. Le gestionnaire d'API et les clients RSC
 * enveloppent chacun ce contexte et fournissent le contexte requis.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  return {
    db,
    ...opts,
  };
};

/**
 * 2. INITIALISATION
 *
 * C'est ici que l'API tRPC est initialisée, connectant le contexte et le transformateur. Nous analysons également
 * les ZodErrors pour que vous obteniez la sécurité des types côté frontend si votre procédure échoue en raison d'erreurs
 * de validation côté backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Crée un appelant côté serveur.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTEUR & PROCÉDURE (LA PARTIE IMPORTANTE)
 *
 * Ce sont les éléments que vous utilisez pour construire votre API tRPC. Vous devriez les importer fréquemment dans le
 * répertoire "/src/server/api/routers".
 */

/**
 * C'est ainsi que vous créez de nouveaux routeurs et sous-routeurs dans votre API tRPC.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware pour mesurer le temps d'exécution des procédures et ajouter un délai artificiel en développement.
 *
 * Vous pouvez le supprimer si vous ne l'aimez pas, mais il peut aider à détecter les cascades indésirables en simulant
 * la latence réseau qui se produirait en production mais pas en développement local.
 */

const isAuthenticated = t.middleware(async ({next, ctx}) => {
  const user = await auth()
  if (!user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource'
    })
  }
  return next({
    ctx: {
      ...ctx,
      user
    }
  })
})

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Procédure publique (non authentifiée)
 *
 * C'est l'élément de base que vous utilisez pour construire de nouvelles requêtes et mutations sur votre API tRPC. Elle ne
 * garantit pas qu'un utilisateur qui interroge est autorisé, mais vous pouvez toujours accéder aux données de session de l'utilisateur
 * s'il est connecté.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);
export const protectedProcedure = t.procedure.use(isAuthenticated);
