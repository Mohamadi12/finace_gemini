"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function getCurrentBudget(accountId) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const budget = await db.budget.findFirst({
      where: {
        userId: user.id,
      },
    });

    // Get current month's expenses
    const currentDate = new Date();
    const startOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const endOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    const expenses = await db.transaction.aggregate({
      where: {
        userId: user.id,
        type: "EXPENSE",
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
        accountId,
      },
      _sum: {
        amount: true,
      },
    });

    return {
      budget: budget ? { ...budget, amount: budget.amount.toNumber() } : null,
      currentExpenses: expenses._sum.amount
        ? expenses._sum.amount.toNumber()
        : 0,
    };
  } catch (error) {
    console.error("Error fetching budget:", error);
    throw error;
  }
}
//   Récupérer le budget actuel d'un utilisateur et calculer les dépenses du mois en cours pour un compte spécifique.
//   Vérification de l'autorisation :
// Vérifie si l'utilisateur est authentifié et autorisé.
// Recherche l'utilisateur dans la base de données.
// Récupération du budget :
// Récupère le budget actuel de l'utilisateur.
// Convertit le montant du budget en nombre décimal pour une utilisation simplifiée.
// Calcul des dépenses du mois en cours :
// Détermine les dates de début et de fin du mois actuel.
// Calcule le total des dépenses pour le compte spécifié pendant ce mois.
// Convertit le montant total des dépenses en nombre décimal.
// Retour des données :
// Retourne le budget de l'utilisateur et le total des dépenses du mois en cours.
// Gestion des erreurs
// En cas d'erreur, affiche un message d'erreur et relance l'exception.
// Utilité de la fonction :
// Permet à un utilisateur de suivre son budget et ses dépenses mensuelles pour un compte spécifique.
// Facilite la gestion financière en fournissant des données claires et précises.
// Assure que les montants sont dans un format facile à manipuler (nombres décimaux).
// Fonctionnement clé :
// Budget :
// Le budget est récupéré et converti en nombre décimal pour une utilisation cohérente.
// Dépenses mensuelles :
// Les dépenses sont agrégées pour le mois en cours en fonction du type de transaction (EXPENSE).
// Le montant total des dépenses est également converti en nombre décimal.
// Sécurité :
// L'accès aux données est restreint à l'utilisateur authentifié.
// Retour des données :
// Budget : Le montant du budget de l'utilisateur (ou null si aucun budget n'est défini).
// Dépenses actuelles : Le total des dépenses du mois en cours pour le compte spécifié.

export async function updateBudget(amount) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Update or create budget
    const budget = await db.budget.upsert({
      where: {
        userId: user.id,
      },
      update: {
        amount,
      },
      create: {
        userId: user.id,
        amount,
      },
    });

    revalidatePath("/dashboard");
    return {
      success: true,
      data: { ...budget, amount: budget.amount.toNumber() },
    };
  } catch (error) {
    console.error("Error updating budget:", error);
    return { success: false, error: error.message };
  }
}
//   Mettre à jour ou créer un budget pour un utilisateur, puis retourner les données mises à jour.
//   Vérification de l'autorisation :
// Vérifie si l'utilisateur est authentifié et autorisé.
// Recherche l'utilisateur dans la base de données.
// Mise à jour ou création du budget :
// Utilise une opération upsert pour :
// Mettre à jour le budget existant si l'utilisateur en a déjà un.
// Créer un nouveau budget si l'utilisateur n'en a pas encore.
// Le montant du budget est défini ou mis à jour avec la valeur fournie (amount).
// Rafraîchissement des données :
// Rafraîchit la page du tableau de bord (/dashboard) pour refléter les changements.
// Retour des données :
// Retourne un succès avec les données du budget mis à jour, en convertissant le montant en nombre décimal.
// Gestion des erreurs :
// En cas d'erreur, retourne un échec avec le message d'erreur.
// Utilité de la fonction :
// Permet à un utilisateur de définir ou de mettre à jour son budget de manière simple et sécurisée.
// Assure que les données sont cohérentes et à jour dans l'interface utilisateur.
// Facilite la gestion financière en fournissant un moyen de suivre les objectifs budgétaires.
// Fonctionnement clé :
// Opération upsert :
// Combine update et create pour éviter les erreurs si le budget n'existe pas encore.
// Conversion du montant :
// Le montant du budget est converti en nombre décimal pour une utilisation simplifiée.
// Rafraîchissement :
// La page du tableau de bord est rafraîchie pour afficher les données mises à jour.
// Retour des données :
// Succès :
// Retourne un objet avec success: true et les données du budget mis à jour.
// Échec :
// Retourne un objet avec success: false et le message d'erreur.
