"use server";

import { Resend } from "resend";

export async function sendEmail({ to, subject, react }) {
  const resend = new Resend(process.env.RESEND_API_KEY || "");

  try {
    const data = await resend.emails.send({
      from: "Finance App <onboarding@resend.dev>",
      to,
      subject,
      react,
    });

    return { success: true, data };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { success: false, error };
  }
}
// Envoyer un e-mail en utilisant l'API Resend, avec la possibilité d'inclure du contenu dynamique (React).
// Initialisation de Resend :

// Crée une instance de Resend en utilisant la clé API fournie dans les variables d'environnement.
// Envoi de l'e-mail :
// Envoie un e-mail avec les paramètres suivants :
// De : L'adresse e-mail de l'expéditeur (Finance App <onboarding@resend.dev>).
// À : Le ou les destinataires (to).
// Sujet : Le sujet de l'e-mail (subject).
// Contenu : Le contenu React dynamique (react).
// Retour des résultats :
// Si l'e-mail est envoyé avec succès, retourne un objet avec success: true et les données de réponse.
// En cas d'échec, retourne un objet avec success: false et l'erreur rencontrée.
// Gestion des erreurs :
// Log l'erreur dans la console pour le débogage.
// Utilité de la fonction :
// Permet d'envoyer des e-mails personnalisés avec du contenu dynamique (composants React).
// Facilite l'intégration avec l'API Resend pour gérer les envois d'e-mails.
// Utile pour les notifications, les confirmations, ou tout autre type de communication par e-mail.
// Fonctionnement clé :
// API Resend :
// Utilise l'API Resend pour envoyer des e-mails de manière fiable.
// Contenu React :
// Permet d'utiliser des composants React pour générer le contenu de l'e-mail, offrant une grande flexibilité.
// Gestion des erreurs :
// Capture et retourne les erreurs pour une gestion facile côté client.
// Retour des données :
// Succès :
// Retourne un objet avec success: true et les données de réponse de l'API Resend.
// Échec :
// Retourne un objet avec success: false et l'erreur rencontrée.

// Exemple d'utilisation :
// Envoyer une confirmation d'inscription.
// Envoyer des notifications transactionnelles.
// Envoyer des rappels ou des alertes personnalisées.
