// Importation des dépendances nécessaires
// auth et clerkClient pour la gestion de l'authentification avec Clerk
// notFound et redirect pour la gestion des redirections Next.js
// db pour l'accès à la base de données Prisma
import { auth, clerkClient } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { db } from '~/server/db'

// Composant asynchrone qui synchronise les données utilisateur entre Clerk et notre base de données
const SyncUser = async () => {
    // Récupération de l'ID de l'utilisateur actuellement authentifié
    const { userId } = await auth()
    if (!userId) {
        throw new Error('User not authenticated')
    }

    // Initialisation du client Clerk et récupération des informations détaillées de l'utilisateur
    const client = await clerkClient()
    const user = await client.users.getUser(userId)

    // Vérification de la présence d'une adresse email
    // Si l'utilisateur n'a pas d'email, on renvoie une page 404
    if (!user.emailAddresses[0]?.emailAddress) {
        return notFound()
    }

    // Synchronisation des données utilisateur dans notre base de données
    // La méthode upsert permet de :
    // - Créer un nouvel utilisateur s'il n'existe pas
    // - Mettre à jour ses informations s'il existe déjà
    await db.user.upsert({
        // Critère de recherche : l'adresse email de l'utilisateur
        where: {
            emailAddress: user.emailAddresses[0]?.emailAddress ?? ""
        },
        // Données à mettre à jour si l'utilisateur existe déjà
        update: {
            firstName: user.firstName,
            lastName: user.lastName,
            imageURL: user.imageUrl,
        },
        // Données à créer si l'utilisateur n'existe pas encore
        create: {
            id: userId,
            emailAddress: user.emailAddresses[0]?.emailAddress ?? "",
            firstName: user.firstName,
            lastName: user.lastName,
            imageURL: user.imageUrl,
        }
    })

    // Après la synchronisation, redirection vers le tableau de bord
    return redirect('/dashboard')
}

// Export du composant pour utilisation dans l'application
export default SyncUser
