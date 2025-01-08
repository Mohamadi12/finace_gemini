"use server";

import { db } from "@/lib/prisma";
import { subDays } from "date-fns";

const ACCOUNT_ID = "dc4227f5-b672-4c55-b914-fc49e8cbae28";
const USER_ID = "19e4dee2-6682-40d1-9ee1-c6456d32ae3c";

// Categories with their typical amount ranges
const CATEGORIES = {
  INCOME: [
    { name: "salary", range: [5000, 8000] },
    { name: "freelance", range: [1000, 3000] },
    { name: "investments", range: [500, 2000] },
    { name: "other-income", range: [100, 1000] },
  ],
  EXPENSE: [
    { name: "housing", range: [1000, 2000] },
    { name: "transportation", range: [100, 500] },
    { name: "groceries", range: [200, 600] },
    { name: "utilities", range: [100, 300] },
    { name: "entertainment", range: [50, 200] },
    { name: "food", range: [50, 150] },
    { name: "shopping", range: [100, 500] },
    { name: "healthcare", range: [100, 1000] },
    { name: "education", range: [200, 1000] },
    { name: "travel", range: [500, 2000] },
  ],
};

// Helper to generate random amount within a range
function getRandomAmount(min, max) {
  return Number((Math.random() * (max - min) + min).toFixed(2));
}

// Helper to get random category with amount
function getRandomCategory(type) {
  const categories = CATEGORIES[type];
  const category = categories[Math.floor(Math.random() * categories.length)];
  const amount = getRandomAmount(category.range[0], category.range[1]);
  return { category: category.name, amount };
}

export async function seedTransactions() {
  try {
    // Generate 90 days of transactions
    const transactions = [];
    let totalBalance = 0;

    for (let i = 90; i >= 0; i--) {
      const date = subDays(new Date(), i);

      // Generate 1-3 transactions per day
      const transactionsPerDay = Math.floor(Math.random() * 3) + 1;

      for (let j = 0; j < transactionsPerDay; j++) {
        // 40% chance of income, 60% chance of expense
        const type = Math.random() < 0.4 ? "INCOME" : "EXPENSE";
        const { category, amount } = getRandomCategory(type);

        const transaction = {
          id: crypto.randomUUID(),
          type,
          amount,
          description: `${
            type === "INCOME" ? "Received" : "Paid for"
          } ${category}`,
          date,
          category,
          status: "COMPLETED",
          userId: USER_ID,
          accountId: ACCOUNT_ID,
          createdAt: date,
          updatedAt: date,
        };

        totalBalance += type === "INCOME" ? amount : -amount;
        transactions.push(transaction);
      }
    }

    // Insert transactions in batches and update account balance
    await db.$transaction(async (tx) => {
      // Clear existing transactions
      await tx.transaction.deleteMany({
        where: { accountId: ACCOUNT_ID },
      });

      // Insert new transactions
      await tx.transaction.createMany({
        data: transactions,
      });

      // Update account balance
      await tx.account.update({
        where: { id: ACCOUNT_ID },
        data: { balance: totalBalance },
      });
    });

    return {
      success: true,
      message: `Created ${transactions.length} transactions`,
    };
  } catch (error) {
    console.error("Error seeding transactions:", error);
    return { success: false, error: error.message };
  }
}
// Simuler et insérer des transactions aléatoires pour un compte spécifique sur une période de 90 jours, puis mettre à jour le solde du compte en conséquence.
// Préparation des données :
// Définit des catégories de transactions (revenus et dépenses) avec des plages de montants typiques.
// Utilise des fonctions utilitaires pour générer des montants aléatoires et sélectionner des catégories aléatoires.

// Génération des transactions :
// Crée des transactions pour une période de 90 jours.
// Génère 1 à 3 transactions par jour avec une probabilité de 40 % pour les revenus et 60 % pour les dépenses.
// Calcule le solde total en fonction des montants des transactions.

// Insertion des transactions :
// Supprime les transactions existantes pour le compte spécifié.
// Insère les nouvelles transactions en une seule opération.
// Met à jour le solde du compte avec le total calculé.

// Résultat :
// Retourne un succès avec le nombre de transactions créées.
// En cas d'erreur, retourne un échec avec le message d'erreur.

// Utilité de la fonction :
// Permet de simuler des données de transactions réalistes pour tester ou démontrer une application.
// Met à jour automatiquement le solde du compte en fonction des transactions générées.
// Facilite le développement et le débogage en fournissant des données de test cohérentes.

// Fonctionnement clé :
// Catégories et montants : Les transactions sont générées avec des montants réalistes basés sur des plages prédéfinies.

// Solde dynamique : Le solde du compte est ajusté en fonction des revenus et des dépenses simulés.

// Opération atomique : Les transactions sont insérées et le solde est mis à jour en une seule opération pour garantir la cohérence des données.
