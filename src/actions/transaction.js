"use server";

import aj from "@/lib/arcjet";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const serializeAmount = (obj) => ({
  ...obj,
  amount: obj.amount.toNumber(),
});
// Convertir la propriété amount d'un objet en nombre décimal pour simplifier son utilisation.
// Crée une copie de l'objet original.
// Convertit la propriété amount en nombre décimal en utilisant la méthode .toNumber().
// Retourne l'objet copié avec la propriété amount convertie.


// Create Transaction
export async function createTransaction(data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Get request data for ArcJet
    const req = await request();

    // Check rate limit
    const decision = await aj.protect(req, {
      userId,
      requested: 1, // Specify how many tokens to consume
    });

    if (decision.isDenied()) {
      if (decision.reason.isRateLimit()) {
        const { remaining, reset } = decision.reason;
        console.error({
          code: "RATE_LIMIT_EXCEEDED",
          details: {
            remaining,
            resetInSeconds: reset,
          },
        });

        throw new Error("Too many requests. Please try again later.");
      }

      throw new Error("Request blocked");
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const account = await db.account.findUnique({
      where: {
        id: data.accountId,
        userId: user.id,
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    // Calculate new balance
    const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
    const newBalance = account.balance.toNumber() + balanceChange;

    // Create transaction and update account balance
    const transaction = await db.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...data,
          userId: user.id,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: newBalance },
      });

      return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}
// Créer une nouvelle transaction pour un utilisateur, mettre à jour le solde du compte concerné, et gérer les limites de taux (rate limiting) pour éviter les abus.
// Vérification de l'autorisation :
// Vérifie si l'utilisateur est authentifié et autorisé.
// Gestion des limites de taux (rate limiting) :
// Utilise un système de protection (ArcJet) pour vérifier si l'utilisateur a dépassé le nombre autorisé de requêtes.
// Si la limite est dépassée, bloque la requête et renvoie une erreur.
// Validation des données :
// Vérifie que l'utilisateur existe dans la base de données.
// Vérifie que le compte spécifié existe et appartient à l'utilisateur.
// Création de la transaction :
// Calcule le nouveau solde du compte en fonction du type de transaction (dépense ou revenu).
// Crée la transaction dans la base de données.
// Si la transaction est récurrente, calcule la date de la prochaine occurrence.
// Met à jour le solde du compte avec la nouvelle valeur.
// Rafraîchissement des données :
// Rafraîchit les pages concernées pour refléter les changements.
// Retour des résultats :
// Retourne un succès avec les données de la transaction créée, en convertissant le montant en nombre décimal.
// Gestion des erreurs :
// En cas d'erreur, renvoie un message d'erreur clair.
// Utilité de la fonction :
// Permet de créer des transactions de manière sécurisée et contrôlée.
// Assure que les soldes des comptes sont mis à jour de manière cohérente.
// Protège contre les abus en limitant le nombre de requêtes autorisées.
// Facilite la gestion des transactions récurrentes.
// Fonctionnement clé :
// Rate Limiting :
// Empêche les utilisateurs de dépasser un nombre défini de requêtes dans un laps de temps donné.
// Calcul du solde :
// Les dépenses réduisent le solde, tandis que les revenus l'augmentent.
// Transactions récurrentes :
// Si une transaction est marquée comme récurrente, la date de la prochaine occurrence est calculée automatiquement.
// Rafraîchissement des pages :
// Les pages concernées sont rafraîchies pour afficher les données à jour.
// Retour des données :
// Succès :
// Retourne un objet avec success: true et les données de la transaction créée.
// Échec :
// Retourne un message d'erreur clair en cas de problème.




export async function getTransaction(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const transaction = await db.transaction.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!transaction) throw new Error("Transaction not found");

  return serializeAmount(transaction);
}
// Récupérer une transaction spécifique pour un utilisateur authentifié, tout en vérifiant que l'utilisateur est autorisé à accéder à cette transaction.
// Vérification de l'autorisation :
// Vérifie si l'utilisateur est authentifié et autorisé.
// Recherche de l'utilisateur :
// Recherche l'utilisateur dans la base de données. Si l'utilisateur n'existe pas, une erreur est renvoyée.
// Récupération de la transaction :
// Récupère la transaction spécifiée par son ID, en s'assurant qu'elle appartient bien à l'utilisateur.
// Si la transaction n'existe pas ou n'appartient pas à l'utilisateur, une erreur est renvoyée.
// Retour des données :
// Convertit le montant de la transaction en nombre décimal pour une utilisation simplifiée.
// Retourne la transaction sérialisée.
// Utilité de la fonction :
// Permet à un utilisateur de récupérer les détails d'une transaction spécifique de manière sécurisée.
// Assure que l'utilisateur ne peut accéder qu'à ses propres transactions.
// Simplifie les données en convertissant le montant en nombre décimal.
// Fonctionnement clé :
// Sécurité :
// L'accès à la transaction est restreint à l'utilisateur authentifié.
// Sérialisation :
// Le montant de la transaction est converti en nombre décimal pour une manipulation facile.
// Gestion des erreurs :
// Des erreurs claires sont renvoyées si l'utilisateur ou la transaction n'est pas trouvé.
// Retour des données :
// Retourne la transaction avec le montant converti en nombre décimal.
// Exemple d'utilisation :
// Afficher les détails d'une transaction spécifique dans une interface utilisateur.
// Utiliser les données de la transaction pour des calculs ou des analyses.



// Helper function to calculate next recurring date
function calculateNextRecurringDate(startDate, interval) {
    const date = new Date(startDate);
  
    switch (interval) {
      case "DAILY":
        date.setDate(date.getDate() + 1);
        break;
      case "WEEKLY":
        date.setDate(date.getDate() + 7);
        break;
      case "MONTHLY":
        date.setMonth(date.getMonth() + 1);
        break;
      case "YEARLY":
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
  
    return date;
  }