// Contrôleur pour rediriger vers le deep link de l'app
exports.redirectToApp = (req, res) => {
  const { deepLink } = req.query;

  if (!deepLink) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Erreur de redirection</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #0F0F0F 0%, #1a1a1a 100%);
            color: #fff;
          }
          .container {
            text-align: center;
            padding: 40px;
          }
          h1 { color: #FF6B6B; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Erreur</h1>
          <p>Paramètre deepLink manquant</p>
        </div>
      </body>
      </html>
    `);
  }

  // Décoder le deep link si nécessaire
  const decodedDeepLink = decodeURIComponent(deepLink);

  // Vérifier que c'est bien un deep link mint://
  if (!decodedDeepLink.startsWith('mint://')) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Erreur de redirection</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #0F0F0F 0%, #1a1a1a 100%);
            color: #fff;
          }
          .container {
            text-align: center;
            padding: 40px;
          }
          h1 { color: #FF6B6B; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Erreur</h1>
          <p>Deep link invalide : ${decodedDeepLink}</p>
        </div>
      </body>
      </html>
    `);
  }

  // Retourner une page HTML qui redirige automatiquement vers le deep link
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Redirection vers l'application</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #0F0F0F 0%, #1a1a1a 100%);
          color: #fff;
        }
        .container {
          text-align: center;
          padding: 40px;
          max-width: 500px;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 20px;
        }
        h1 {
          color: #A1F763;
          margin-bottom: 20px;
        }
        .message {
          margin-bottom: 30px;
          line-height: 1.6;
        }
        .button {
          display: inline-block;
          background-color: #A1F763;
          color: #000;
          padding: 15px 30px;
          border-radius: 10px;
          text-decoration: none;
          font-weight: bold;
          margin: 10px;
        }
        .loading {
          margin-top: 20px;
          color: #888;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🏃</div>
        <h1>Redirection vers l'application</h1>
        <div class="message">
          <p>Vous allez être redirigé vers l'application Mint...</p>
        </div>
        <div class="loading" id="loading">Redirection en cours...</div>
        <a href="${decodedDeepLink}" id="deepLinkButton" class="button" style="display: none;">Ouvrir l'application</a>
      </div>

      <script>
        // Essayer d'ouvrir le deep link immédiatement
        const deepLink = "${decodedDeepLink}";
        
        // Méthode 1 : Redirection automatique
        window.location.href = deepLink;
        
        // Méthode 2 : Afficher un bouton de secours après 2 secondes
        setTimeout(() => {
          document.getElementById('loading').textContent = 'Si l\\'application ne s\\'ouvre pas automatiquement, cliquez sur le bouton ci-dessous :';
          document.getElementById('deepLinkButton').style.display = 'inline-block';
        }, 2000);
        
        // Méthode 3 : Essayer avec un Intent Android
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        const isAndroid = /android/i.test(userAgent);
        
        if (isAndroid) {
          // Essayer d'ouvrir avec Intent
          const intentUrl = 'intent://' + deepLink.replace('mint://', '') + '#Intent;scheme=mint;package=com.mint.app;end';
          setTimeout(() => {
            window.location.href = intentUrl;
          }, 500);
        }
      </script>
    </body>
    </html>
  `);
};
