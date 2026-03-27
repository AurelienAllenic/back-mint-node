const nodemailer = require("nodemailer");

const normalizeBaseUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  return value.trim().replace(/\/+$/, "");
};

// Configuration du transporteur SMTP
const createTransporter = () => {
  const port = parseInt(process.env.SMTP_PORT || "587");
  const secure = process.env.SMTP_SECURE === "true"; // true pour 465, false pour autres ports
  
  const config = {
    host: process.env.SMTP_HOST,
    port: port,
    secure: secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS, // Support des deux noms
    },
    connectionTimeout: 30000, // 30 secondes max pour établir la connexion
    greetingTimeout: 30000, // 30 secondes max pour recevoir le greeting
    socketTimeout: 30000, // 30 secondes max pour les opérations socket
    debug: true, // Activer les logs de débogage
    logger: true, // Logger les événements
  };

  // Pour le port 587 (TLS/STARTTLS), configuration TLS correcte
  if (port === 587 && !secure) {
    config.requireTLS = true;
    config.tls = {
      rejectUnauthorized: false, // Accepter les certificats (pour développement)
    };
  }

  // Pour le port 465 (SSL direct), configuration SSL
  if (port === 465 && secure) {
    config.tls = {
      rejectUnauthorized: false, // Accepter les certificats (pour développement)
      minVersion: 'TLSv1.2', // Utiliser TLS 1.2 minimum
    };
  }

  return nodemailer.createTransport(config);
};

// Envoyer une invitation à rejoindre une course
exports.sendRaceInvitation = async (email, raceName, invitationToken, raceId) => {
  // Vérifier que la configuration SMTP est présente
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || (!process.env.SMTP_PASSWORD && !process.env.SMTP_PASS)) {
    console.warn("⚠️ Configuration SMTP incomplète. L'email ne sera pas envoyé.");
    throw new Error("Configuration SMTP manquante");
  }

  // Debug: Afficher la configuration SMTP (masquer le mot de passe)
  const smtpPassword = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  console.log("=== CONFIGURATION SMTP ===");
  console.log("SMTP_HOST:", process.env.SMTP_HOST);
  console.log("SMTP_PORT:", process.env.SMTP_PORT);
  console.log("SMTP_SECURE:", process.env.SMTP_SECURE);
  console.log("SMTP_USER:", process.env.SMTP_USER);
  console.log("SMTP_PASSWORD défini:", !!process.env.SMTP_PASSWORD);
  console.log("SMTP_PASS défini:", !!process.env.SMTP_PASS);
  console.log("SMTP_PASSWORD length:", smtpPassword ? smtpPassword.length : "NON DÉFINI");
  console.log("SMTP_PASSWORD starts with:", smtpPassword ? smtpPassword.substring(0, 4) + "..." : "NON DÉFINI");
  console.log("SMTP_PASSWORD contient espaces:", smtpPassword ? smtpPassword.includes(" ") : "NON DÉFINI");
  console.log("SMTP_PASSWORD valeur complète:", smtpPassword ? `"${smtpPassword}"` : "NON DÉFINI");
  console.log("===========================");

  try {
    const transporter = createTransporter();
    
    // Utiliser l'URL web publique pour l'invitation (priorite), sinon fallback mobile
    const webInvitationUrl = normalizeBaseUrl(
      process.env.PUBLIC_WEB_APP_URL || process.env.FRONTEND_URL || process.env.WEB_INVITATION_URL
    );
    const backendUrl = normalizeBaseUrl(
      process.env.BACKEND_URL || process.env.API_URL || "http://localhost:3000"
    );
    const appScheme = process.env.APP_SCHEME || "mint";
    
    let invitationLink;
    
    if (webInvitationUrl) {
      // Si une URL web est configurée, utiliser directement cette URL
      invitationLink = `${webInvitationUrl}/race-invitation?token=${encodeURIComponent(invitationToken)}&raceId=${encodeURIComponent(raceId)}&email=${encodeURIComponent(email)}`;
      console.log("=== Lien d'invitation généré (Page Web) ===");
      console.log("URL web:", invitationLink);
    } else {
      // Sinon, utiliser le système de redirection avec deep link mobile
      const deepLink = `${appScheme}://race-invitation?token=${invitationToken}&raceId=${raceId}&email=${encodeURIComponent(email)}`;
      invitationLink = `${backendUrl}/redirect-to-app?deepLink=${encodeURIComponent(deepLink)}`;
      console.log("=== Lien d'invitation généré (Deep Link Mobile) ===");
      console.log("Deep link mint://:", deepLink);
      console.log("URL de redirection:", invitationLink);
    }
    
    console.log("================================");
    
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || "Mint Racing"}" <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to: email,
      subject: `Invitation à rejoindre la course : ${raceName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #A1F763; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #A1F763; color: #3B3B3B; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="color: #3B3B3B; margin: 0;">🏃 Invitation à une course</h1>
            </div>
            <div class="content">
              <p>Bonjour,</p>
              <p>Vous avez été invité(e) à rejoindre la course <strong>${raceName}</strong>.</p>
              <p>Pour accepter cette invitation et rejoindre la course, cliquez sur le bouton ci-dessous :</p>
              <div style="text-align: center;">
                <a href="${invitationLink}" class="button">Rejoindre la course</a>
              </div>
              <p style="margin-top: 30px; font-size: 14px; color: #666;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
                <a href="${invitationLink}" style="color: #A1F763; word-break: break-all;">${invitationLink}</a>
              </p>
              <p style="margin-top: 20px; font-size: 12px; color: #999;">
                Cette invitation expire dans 7 jours.
              </p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Invitation à rejoindre la course : ${raceName}
        
        Bonjour,
        
        Vous avez été invité(e) à rejoindre la course "${raceName}".
        
        Pour accepter cette invitation, cliquez sur le lien suivant :
        ${invitationLink}
        
        Cette invitation expire dans 7 jours.
      `,
    };

    // Vérifier la connexion avant d'envoyer (avec timeout)
    console.log(`Tentative d'envoi d'email à ${email}...`);
    console.log(`Connexion à ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}...`);
    const timeoutMs = 60000; // 60 secondes pour laisser plus de temps
    const info = await Promise.race([
      transporter.sendMail(mailOptions),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout: La connexion au serveur SMTP (${process.env.SMTP_HOST}) a pris trop de temps (>${timeoutMs/1000}s). Vérifiez votre configuration SMTP et votre connexion internet.`)), timeoutMs)
      )
    ]);
    
    console.log("✅ Email d'invitation envoyé:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi de l'email à ${email}:`, error.message || error);
    
    // Créer un message d'erreur plus détaillé
    let errorMessage = error.message || error.toString();
    
    if (errorMessage.includes("Timeout") || errorMessage.includes("ETIMEDOUT") || errorMessage.includes("Greeting never received")) {
      errorMessage = `Impossible de se connecter au serveur SMTP (${process.env.SMTP_HOST}:${process.env.SMTP_PORT}). Vérifiez votre configuration SMTP et votre connexion internet.`;
    } else if (errorMessage.includes("EAUTH") || errorMessage.includes("authentication")) {
      errorMessage = `Erreur d'authentification SMTP. Vérifiez vos identifiants (SMTP_USER/SMTP_PASSWORD). Pour Gmail, utilisez un mot de passe d'application.`;
    } else if (errorMessage.includes("ECONNREFUSED")) {
      errorMessage = `Connexion refusée par le serveur SMTP (${process.env.SMTP_HOST}:${process.env.SMTP_PORT}). Vérifiez l'adresse et le port.`;
    }
    
    throw new Error(errorMessage);
  }
};

// Tester la connexion SMTP
exports.testConnection = async () => {
  try {
    console.log("🔍 Test de connexion SMTP en cours...");
    const transporter = createTransporter();
    
    // Utiliser verify() avec un timeout explicite
    const verifyPromise = transporter.verify();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Timeout: La connexion SMTP a pris trop de temps (>30s)")), 30000)
    );
    
    await Promise.race([verifyPromise, timeoutPromise]);
    console.log("✅ Connexion SMTP réussie");
    return true;
  } catch (error) {
    console.error("❌ Erreur de connexion SMTP:", error.message || error);
    console.error("   Code:", error.code);
    console.error("   Command:", error.command);
    console.error("   Response:", error.response);
    return false;
  }
};
