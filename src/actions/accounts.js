"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const serializeDecimal = (obj) => {
  const serialized = { ...obj };
  if (obj.balance) {
    serialized.balance = obj.balance.toNumber();
  }
  if (obj.amount) {
    serialized.amount = obj.amount.toNumber();
  }
  return serialized;
};
// Convertir les propriétés décimales (comme balance et amount) d'un objet en nombres pour simplifier leur utilisation.
// Crée une copie de l'objet original pour éviter de le modifier directement.
// Vérifie si l'objet contient une propriété balance et la convertit en nombre.
// Vérifie si l'objet contient une propriété amount et la convertit en nombre.
// Retourne l'objet copié avec les propriétés converties.

export async function updateDefaultAccount(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // First, unset any existing default account
    await db.account.updateMany({
      where: {
        userId: user.id,
        isDefault: true,
      },
      data: { isDefault: false },
    });

    // Then set the new default account
    const account = await db.account.update({
      where: {
        id: accountId,
        userId: user.id,
      },
      data: { isDefault: true },
    });

    revalidatePath("/dashboard");
    return { success: true, data: serializeTransaction(account) };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
// Mettre à jour le compte par défaut d'un utilisateur en désignant un nouveau compte comme celui par défaut.
// Vérifie si l'utilisateur est authentifié et autorisé.
// Recherche l'utilisateur dans la base de données.
// Désactive le compte actuellement par défaut de l'utilisateur (s'il en existe un).
// Définit le nouveau compte (spécifié par accountId) comme compte par défaut.
// Rafraîchit la page du tableau de bord (/dashboard) pour refléter les changements.
// Retourne un succès avec les données du compte mis à jour, sérialisées dans un format simplifié.
// En cas d'erreur, retourne un échec avec le message d'erreur.

export async function getAccountWithTransactions(accountId) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const account = await db.account.findUnique({
    where: {
      id: accountId,
      userId: user.id,
    },
    include: {
      transactions: {
        orderBy: { date: "desc" },
      },
      _count: {
        select: { transactions: true },
      },
    },
  });

  if (!account) return null;

  return {
    ...serializeDecimal(account),
    transactions: account.transactions.map(serializeDecimal),
  };
}
// Récupérer un compte spécifique avec toutes ses transactions associées, tout en vérifiant que l'utilisateur est autorisé à accéder à ces données.
// Vérifie si l'utilisateur est authentifié et autorisé.
// Recherche l'utilisateur dans la base de données.
// Récupère le compte spécifié (accountId) en s'assurant qu'il appartient bien à l'utilisateur.
// Inclut les transactions associées au compte, triées par date (du plus récent au plus ancien).
// Ajoute également le nombre total de transactions associées au compte.
// Si le compte n'existe pas, retourne null.
// Sérialise les données du compte et ses transactions pour les retourner dans un format simplifié.

export async function bulkDeleteTransactions(transactionIds) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Get transactions to calculate balance changes
    const transactions = await db.transaction.findMany({
      where: {
        id: { in: transactionIds },
        userId: user.id,
      },
    });

    // Group transactions by account to update balances
    const accountBalanceChanges = transactions.reduce((acc, transaction) => {
      const change =
        transaction.type === "EXPENSE"
          ? transaction.amount
          : -transaction.amount;
      acc[transaction.accountId] = (acc[transaction.accountId] || 0) + change;
      return acc;
    }, {});

    // Delete transactions and update account balances in a transaction
    await db.$transaction(async (tx) => {
      // Delete transactions
      await tx.transaction.deleteMany({
        where: {
          id: { in: transactionIds },
          userId: user.id,
        },
      });

      // Update account balances
      for (const [accountId, balanceChange] of Object.entries(
        accountBalanceChanges
      )) {
        await tx.account.update({
          where: { id: accountId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        });
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/account/[id]");

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
// Supprimer plusieurs transactions en une seule opération et mettre à jour les soldes des comptes concernés de manière cohérente.
// Vérification de l'autorisation :
// Vérifie si l'utilisateur est authentifié et autorisé.
// Recherche l'utilisateur dans la base de données.
// Récupération des transactions :
// Récupère les transactions à supprimer en fonction des IDs fournis.
// Calcule les modifications de solde pour chaque compte concerné en fonction du type de transaction (dépense ou revenu).
// Suppression et mise à jour :
// Supprime les transactions en une seule opération.
// Met à jour les soldes des comptes concernés en fonction des modifications calculées.
// Rafraîchissement des données :
// Rafraîchit les pages concernées (/dashboard et /account/[id]) pour refléter les changements.
// Résultat :
// Retourne un succès si l'opération est réussie.
// Retourne un échec avec le message d'erreur en cas de problème.
// Utilité de la fonction :
// Permet de supprimer plusieurs transactions de manière efficace et sécurisée.
// Assure que les soldes des comptes sont mis à jour de manière cohérente après la suppression.
// Facilite la gestion des transactions en masse tout en maintenant l'intégrité des données.
// Fonctionnement clé :
// Calcul des modifications de solde :
// Les dépenses augmentent le solde (car elles sont retirées), tandis que les revenus le diminuent (car ils sont ajoutés).
// Opération atomique :
// La suppression des transactions et la mise à jour des soldes sont effectuées en une seule transaction pour éviter les incohérences.
// Rafraîchissement des pages :
// Les pages concernées sont rafraîchies pour afficher les données à jour.
