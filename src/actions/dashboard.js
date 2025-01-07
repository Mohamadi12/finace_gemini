"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const serializeTransaction = (obj) => {
  const serialized = { ...obj };

  if (obj.balance) {
    serialized.balance = obj.balance.toNumber();
  }

  if (obj.amount) {
    serialized.amount = obj.amount.toNumber();
  }

  return serialized;
};
// Transformer un objet de transaction en un format simplifié.
// Convertir certaines propriétés spécifiques (comme balance et amount) en nombres pour faciliter leur utilisation.
// Crée une copie de l'objet original pour éviter de le modifier directement.
// Vérifie si l'objet contient une propriété balance et la convertit en nombre.
// Vérifie si l'objet contient une propriété amount et la convertit en nombre.
// Retourne l'objet modifié avec les propriétés converties.


export async function createAccount(data) {
  try {
    const { userId } = await auth();

    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    //Convert balance to float before saving
    const balanceFloat = parseFloat(data.balance);
    if (isNaN(balanceFloat)) {
      throw new Error("Invalid balance amount");
    }

    //Check if this is the user's first account
    const existingAccounts = await db.account.findMany({
      where: {
        userId: user.id,
      },
    });

    const shouldBeDefault =
      existingAccounts.length === 0 ? true : data.isDefault;

    if (shouldBeDefault) {
      await db.account.updateMany({
        where: {
          userId: user.id,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    const account = await db.account.create({
      data: {
        ...data,
        balance: balanceFloat,
        userId: user.id,
        isDefault: shouldBeDefault,
      },
    });

    const serializedAccount = serializeTransaction(account);
    revalidatePath("/dashboard");
    return { success: true, data: serializedAccount };
  } catch (error) {
    throw new Error(error.message);
  }
}
// createAccount : Crée un nouveau compte pour un utilisateur après avoir vérifié son autorisation et validé les données.
// Vérifie si l'utilisateur est authentifié et autorisé.
// Recherche l'utilisateur dans la base de données.
// Convertit le solde (balance) en nombre décimal (float) et valide sa valeur.
// Vérifie si c'est le premier compte de l'utilisateur pour définir le compte par défaut.
// Si un autre compte est déjà par défaut, le désactive comme compte par défaut.
// Crée le nouveau compte avec les données fournies.
// Sérialise le compte créé pour le retourner dans un format simplifié.
// Rafraîchit la page du tableau de bord (/dashboard).
// Retourne un succès avec les données du compte créé.


export async function getUserAccounts() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const accounts = await db.account.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            transactions: true,
          },
        },
      },
    });

    const serializedAccount = accounts.map(serializeTransaction);
    return serializedAccount;
  } catch (error) {}
}
// getUserAccounts : Récupère tous les comptes d'un utilisateur après avoir vérifié son autorisation.
// Vérifie si l'utilisateur est authentifié et autorisé.
// Recherche l'utilisateur dans la base de données.
// Récupère tous les comptes de l'utilisateur, triés par date de création (du plus récent au plus ancien).
// Inclut le nombre de transactions associées à chaque compte.
// Sérialise les comptes pour les retourner dans un format simplifié.

