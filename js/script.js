/**
 * Variables globales
 */
const chatContainer = document.querySelector("#chat-container");
const resetButton = createResetButton();
const urlRacine = getCurrentURL();

loadCategories(); // Charger les catégories au démarrage
resetChat(); // Rénitialiser le chat

/**
 * Bouton de reset
 */
function createResetButton() {
  const button = document.createElement("button");
  button.classList.add("reset-button");
  const icon = document.createElement("i");
  icon.classList.add("ri-loop-left-line");
  button.appendChild(icon);

  button.addEventListener("click", () => {
    resetChat();
    loadCategories();
  });
  return button;
}

/**
 * Ajouter une bulle dans le chat (message)
 */
function addBubble(text, type = "bot", isHTML = false) {
  const bubbleContainer = document.createElement("div");
  bubbleContainer.classList.add("bubble-container", type);

  // Vérifier le type de la bulle et adapter en conséquence
  if (type === "bot") {
    const mascotContainer = document.createElement("div");
    mascotContainer.classList.add("mascot-container");

    const mascotImg = document.createElement("img");
    mascotImg.src = "../css/img/mascot.svg";
    mascotImg.alt = "Mascotte";
    mascotContainer.appendChild(mascotImg);
    bubbleContainer.appendChild(mascotContainer);
  }

  const bubble = document.createElement("div");
  bubble.classList.add("bubble", type);

  // Vérifie si le texte doit être interprété comme du HTML (catégorie Information Pratiques écrite en markdown)
  if (isHTML) {
    bubble.innerHTML = text; // Afficher les informations pratiques en markdown par défaut converti en HTML
  } else {
    bubble.textContent = text; // Afficher le texte brut
  }

  bubbleContainer.appendChild(bubble);
  chatContainer.appendChild(bubbleContainer);

  // A chaque nouveau message, défiler le chat jusqu'en bas
  setTimeout(() => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }, 0);

  return bubbleContainer;
}



/**
 * Charger les catégories depuis l'API Strapi
 */
async function loadCategories() {
  const url = "http://localhost:1338/api/categories?populate=*"; // url pour récupérer toutes les catégories de la base de données
  // Tableau de messages d'introduction
  const botMessages = [
    "Salut ! Moi, c'est Valizo. Je suis là pour t'accompagner dans ta vie quotidienne à Laval. Tout d'abord, quel type de service es-tu en train de chercher ?",
    "Hé là ! Je suis Valizo, ravi de te rencontrer ! Je suis disponible pour t'aider dans ton quotidien à Laval. Pour commencer, quel service recherches-tu ?",
    "Bonjour ! Je m’appelle Valizo, et je suis ton guide pour simplifier ta vie à Laval. Dis-moi, de quoi as-tu besoin ?"
  ];

  // Try pour récupérer les catégories
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erreur lors du chargement des catégories");

    const jsonResponse = await response.json();
    const categories = jsonResponse.data.map(category => ({
      id: category.id,
      name: category.name,
      icon: category.class_icone,
      bot_response: category.bot_response,
      is_infos_pratiques: category.is_infos_pratiques,
    }));

    // Placer la catégorie Informations pratiques en première puis trier les autres par ordre alphabétique
    categories.sort((a, b) => {
      if (a.is_infos_pratiques) return -1;
      if (b.is_infos_pratiques) return 1;
      return a.name.localeCompare(b.name);
    });
    
    // Afficher les catégories
    displayCategories(categories, botMessages[getRandomInt(3)]);
  } catch (error) {
    console.error(error);
    addBubble("Oups ! Impossible de charger les catégories pour le moment.", "bot");
  }
}

/**
 * Afficher les catégories
 */
function displayCategories(categories, message) {
  const lastBubble = addBubble(message, "bot");
  const buttonsContainer = document.createElement("div");
  buttonsContainer.classList.add("buttons");

  // Pour chaque catégorie, créer un bouton avec l'icône et le nom
  // Ajouter un écouteur pour désactiver et griser le bouton au clic
  categories.forEach(category => {
    const button = document.createElement("button");
    button.innerHTML = `<i class="${category.icon}"></i> ${category.name}`;
    button.addEventListener("click", () => {
      disableButtons(buttonsContainer);
      lastBubble.classList.add("disabled");
      buttonsContainer.classList.add("disabled");
      handleCategoryClick(category); // Cliquer sur une cat.
    });
    buttonsContainer.appendChild(button);
  });

  chatContainer.appendChild(buttonsContainer);
}

/**
 * Gestion du clic sur une catégorie
 */
function handleCategoryClick(category) {
  addBubble(category.name, "user");
  // Vérifier si la catégorie est "Informations pratiques" et appeler la fonction correspondante
  if (category.is_infos_pratiques) {
    // Charger les informations pratiques
    loadPracticalInformation();
  } else {
    // Charger les sous-catégories à partir de l'id de la catégorie
    loadSubcategoriesById(category.id, category.bot_response);
  }
}



/**
 * Charger les informations pratiques
 */
async function loadPracticalInformation() {
  const url = "http://localhost:1338/api/info-pratique?populate=*"; // url pour récupérer les informations pratiques

  // Try pour récupérer les informations pratiques
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erreur lors du chargement des informations pratiques");

    const jsonResponse = await response.json();
    const informations = jsonResponse.data;

    if (!informations) {
      addBubble("Aucune information pratique trouvée.", "bot");
      return;
    }

    // Convertir le markdown en HTML
    const formattedContent = marked.parse(informations.infos_pratiques);

    addBubble(formattedContent, "bot", true);
  } catch (error) {
    console.error("Erreur lors du chargement des informations pratiques:", error);
    addBubble("Une erreur s'est produite lors du chargement des informations pratiques.", "bot");
  }
}



/**
 * Charger les sous-catégories
 */
async function loadSubcategoriesById(categoryId, categoryBotResponse) {
  const url = `http://localhost:1338/api/sub-categories?filters[category][id][$eq]=${categoryId}`; // url pour récupérer les sous-catégories à partir de l'id de la catégorie
  // Message au cas où les sous-catégories ne sont pas chargées
  const errorMessage = "Mince 😓 On dirait bien que je suis dans l'incapacité de t'aider pour le moment. Ne t'inquiètes pas, tu peux me proposer des idées en cliquant sur ce lien.";
  // Try pour récupérer les sous-catégories
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erreur lors du chargement des sous-catégories");

    const jsonResponse = await response.json();

    if (!jsonResponse.data || jsonResponse.data.length === 0) {
      addBubble(errorMessage);
      return;
    }

    const subcategories = jsonResponse.data.map(subcategory => ({
      id: subcategory.id,
      name: subcategory.nom,
      icon: subcategory.class_icone,
      bot_response: subcategory.reponse_bot
    }));

    // Trier les sous-catégories par ordre alphabétique
    subcategories.sort((a, b) => a.name.localeCompare(b.name));

    // Afficher les sous-catégories
    displaySubcategories(subcategories, categoryBotResponse);
  } catch (error) {
    console.error(error);
    addBubble("Impossible de charger les sous-catégories.", "bot");
  }
}

/**
 * Afficher les sous-catégories
 */
function displaySubcategories(subcategories, message) {
  const lastBubble = addBubble(message, "bot");
  const buttonsContainer = document.createElement("div");
  buttonsContainer.classList.add("buttons");

  // Pour chaque sous-catégorie, créer un bouton avec l'icône et le nom
  // Ajouter un écouteur pour désactiver et griser le bouton au clic
  subcategories.forEach(subcategory => {
    const button = document.createElement("button");
    button.innerHTML = `<i class="${subcategory.icon}"></i> ${subcategory.name}`;
    button.addEventListener("click", () => {
      disableButtons(buttonsContainer);
      lastBubble.classList.add("disabled");
      buttonsContainer.classList.add("disabled");
      handleSubcategoryClick(subcategory); // Cliquer sur une sous-catégorie
    });
    buttonsContainer.appendChild(button);
  });

  chatContainer.appendChild(buttonsContainer);
}

/**
 * Gestion du clic sur une sous-catégorie
 */
function handleSubcategoryClick(subcategory) {
  addBubble(subcategory.name, "user");
  // Charger les sous-sous-catégories à partir de l'id de la sous-catégorie
  checkAndLoadSubSubcategoriesOrArticles(subcategory.id, subcategory.bot_response);
}



/**
 * Vérifier et charger les sous-sous-catégories ou directement les articles
 */
async function checkAndLoadSubSubcategoriesOrArticles(subcategoryId, subcategoryBotResponse) {
  const url = `http://localhost:1338/api/sub-sub-categories?filters[sub_category][id][$eq]=${subcategoryId}&pagination[pageSize]=30`; // url pour récupérer les sous-sous-catégories à partir de l'id de la sous-catégorie
  // Try pour récupérer les sous-sous-catégories
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erreur lors de la vérification des sous-sous-catégories");

    const jsonResponse = await response.json();
    const subSubcategories = jsonResponse.data.map(subSubcategory => ({
      id: subSubcategory.id,
      name: subSubcategory.nom,
      icon: subSubcategory.class_icone,
      bot_response: subSubcategory.reponse_bot
    }));

    // Vérifier si la sous-catégorie transmise est associée à des sous-sous-catégories
    if (subSubcategories.length > 0) {
      // Trier par ordre alphabétique et afficher les sous-sous-catégories
      subSubcategories.sort((a, b) => a.name.localeCompare(b.name));
      displaySubSubcategories(subSubcategories, subcategoryBotResponse);
    } else {
      // Afficher les articles liés à la sous-catégorie transmise
      loadArticlesBySubcategoryId(subcategoryId, subcategoryBotResponse);
    }
  } catch (error) {
    console.error("Erreur lors de la vérification des sous-sous-catégories:", error);
    addBubble("Une erreur s'est produite lors du chargement des données.", "bot");
  }
}

/**
 * Charger les articles d'une sous-catégorie
 */
async function loadArticlesBySubcategoryId(subcategoryId, subcategoryBotResponse) {
  const url = `http://localhost:1338/api/articles?filters[sub_categories][id][$eq]=${subcategoryId}&populate=*`; // url pour récupérer les articles à partir de l'id de la sous-catégorie
  // Try pour récupérer les articles
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erreur lors du chargement des articles");

    const jsonResponse = await response.json();
    const articles = jsonResponse.data;

    if (!articles || articles.length === 0) {
      addBubble("Oups, je n'ai rien trouvé à propos de ta demande 😢", "bot");
      return;
    }

    // Afficher les articles
    displayArticles(articles, subcategoryBotResponse);
  } catch (error) {
    console.error("Erreur lors du chargement des articles:", error);
    addBubble("Une erreur s'est produite lors du chargement des articles.", "bot");
  }
}

/**
 * Charger les sous-sous-catégories
 */
async function loadSubSubcategoriesById(subcategoryId, subcategoryBotResponse) {
  const url = `http://localhost:1338/api/sub-sub-categories?filters[sub_category][id][$eq]=${subcategoryId}&pagination[pageSize]=30`; // url pour récupérer les articles à partir de l'id de la sous-sous-catégorie, pagination[pageSize]=30 correspond au nombre maximum de sous-sous-catégorie liées à une sous-catégorie pour le moment, si besoin augmenter ce nombre.
  // Try pour récupérer les sous-sous-catégories
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erreur lors du chargement des sous-sous-catégories");

    const jsonResponse = await response.json();
    const subSubcategories = jsonResponse.data.map(subSubcategory => ({
      id: subSubcategory.id,
      name: subSubcategory.nom,
      icon: subSubcategory.class_icone,
      bot_response: subSubcategory.reponse_bot
    }));

    // Trier par ordre alphabétique et afficher les sous-sous-catégories
    subSubcategories.sort((a, b) => a.name.localeCompare(b.name));
    displaySubSubcategories(subSubcategories, subcategoryBotResponse);
  } catch (error) {
    console.error(error);
    addBubble("Impossible de charger les sous-sous-catégories.", "bot");
  }
}

/**
 * Afficher les sous-sous-catégories
 */
function displaySubSubcategories(subSubcategories, message) {
  const lastBubble = addBubble(message, "bot");
  const buttonsContainer = document.createElement("div");
  buttonsContainer.classList.add("buttons");

  // Pour chaque sous-sous-catégorie, créer un bouton avec l'icône et le nom
  // Ajouter un écouteur pour désactiver et griser le bouton au clic
  subSubcategories.forEach(subSubcategory => {
    const button = document.createElement("button");
    button.innerHTML = `<i class="${subSubcategory.icon}"></i> ${subSubcategory.name}`;
    button.addEventListener("click", () => {
      disableButtons(buttonsContainer);
      lastBubble.classList.add("disabled");
      buttonsContainer.classList.add("disabled");
      handleSubSubcategoryClick(subSubcategory); // Cliquer sur une sous-sous-catégorie
    });
    buttonsContainer.appendChild(button);
  });

  chatContainer.appendChild(buttonsContainer);
}

/**
 * Gestion du clic sur une sous-sous-catégorie
 */
function handleSubSubcategoryClick(subSubcategory) {
  addBubble(subSubcategory.name, "user");
  // Charger les articles à partir de l'id de la sous-sous-catégorie
  loadArticlesById(subSubcategory.id, subSubcategory.bot_response);
}



/**
 * Charger les articles d'une sous-sous-catégorie
 */
async function loadArticlesById(subSubcategoryId, subSubcategoryBotResponse) {
  const url = `http://localhost:1338/api/articles?filters[sub_sub_categories][id][$eq]=${subSubcategoryId}&populate=*`; // url pour récupérer les articles à partir de l'id de la sous-sous-catégorie
  // Try pour récupérer les articles
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erreur lors du chargement des articles");

    const jsonResponse = await response.json();
    const articles = jsonResponse.data;

    if (!articles || articles.length === 0) {
      addBubble("Oups, je n'ai rien trouvé à propos de ta demande 😢", "bot");
      return;
    }

    // Afficher les articles liés à la sous-sous-catégorie transmise
    displayArticles(articles, subSubcategoryBotResponse);
  } catch (error) {
    console.error("Erreur :", error);
    addBubble("Une erreur s'est produite lors du chargement des articles.", "bot");
  }
}

/**
 * Afficher les articles
 */
function displayArticles(articles, message) {
  const layout = document.getElementById("layout"); // Le layout comprend la pop-up (liste des articles) et la sidebar (détail d'un article au clic)
  const popupList = document.getElementById("popup-list");
  const botMessageContainer = document.getElementById("bot-message");

  // Afficher la pop-up avec la liste des articles et cacher la sidebar
  layout.classList.add("layout-active");
  layout.classList.remove("sidebar-visible");

  botMessageContainer.textContent = message;

  // Génère les vignettes pour chaque article
  popupList.innerHTML = articles
    .map(article => {
      const imageUrl = article.Image?.formats?.medium?.url || article.Image?.url || "";

      return `
        <article class="card" data-id="${article.id}">
            <div class="card-image">
              ${imageUrl
          ? `<img src="http://localhost:1338${imageUrl}" alt="${article.Nom || "Image"}" />`
          : ""
        }
            </div>
            <span class="card-title">${article.Nom || "Article"}</span>
        </article>
      `;
    })
    .join("");

  // Ajout des événements pour chaque article (ici card)
  document.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", () => {
      const articleId = card.getAttribute("data-id");
      const article = articles.find(a => a.id == articleId);

      if (article) {
        displayArticleDetails(article);
      } else {
        console.error("Aucun article trouvé pour l'ID :", articleId);
      }
    });
  });

  // Mettre en place la barre de recherche
  enableSearchBar();

  // Ajout de la gestion du bouton pour fermer le layout
  const closeButton = document.getElementById("popup-close");
  closeButton.removeEventListener("click", handleCloseLayout); // Supprime tout événement précédent
  closeButton.addEventListener("click", handleCloseLayout); // Ajoute l'événement pour fermer le layout
}



/**
 * Fonction fermer le layout
 */
function handleCloseLayout() {
  const layout = document.getElementById("layout");
  layout.classList.remove("layout-active");
  toggleSidebar(false);
  loadCategories(); // Recharge les catégories
  resetChat(); // Réinitialise le chat
}

/**
 * Fonction pour la barre de recherche dans la pop-up
 */
function enableSearchBar() {
  const searchBar = document.getElementById("search-bar");

  searchBar.addEventListener("input", event => {
    const query = event.target.value.toLowerCase().trim();
    const items = document.querySelectorAll(".card");

    items.forEach(item => {
      const title = item.querySelector(".card-title")?.textContent.toLowerCase().trim();
      item.style.display = title && title.includes(query) ? "block" : "none";
    });
  });
}


/**
 * Fonction pour afficher la sidebar avec tous les détails d'un article
 */
function displayArticleDetails(article) {
  const sidebarContent = document.getElementById("sidebar-content");
  const imageUrl = article.Image?.formats?.medium?.url || article.Image?.url || "";
  const iframeUrl = article.lien_iframe || "";
  const formattedPhone = article.Telephone ? formatPhoneNumber("0"+article.Telephone) : ""; // ajouter un 0 devant le numéro de téléphone, car stocké sans dans la base de données

  if (!article) {
    console.error("Article introuvable.");
    return;
  }

  // Variables pour les horaires
  const ordreJours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
  let schedulesHTML = "";
  let daySchedules = "";
  let today = "";

  if (article.Horaires && Object.keys(article.Horaires).length > 0) {
    // Fonction pour récupérer les horaires en JSON dans la base de données et les formater en HTML
    schedulesHTML = ordreJours
      .map(jour => {
        const heures = article.Horaires[jour];
        if (!heures) return ""; // Ignore les jours sans horaires
        const heuresFormatees = Array.isArray(heures) ? heures.join(", ") : heures;
        return `
          <li class="jour-item">
            <span class="jour-name article-text">${jour.charAt(0).toUpperCase() + jour.slice(1)} :</span>
            <span class="jour-hours article-text">${heuresFormatees}</span>
          </li>
        `;
      })
      .join("");

    // Récupération du jour actuel pour afficher les horaires du jour
    const dayIndex = new Date().getDay();
    today = dayIndex === 0 ? ordreJours[6] : ordreJours[dayIndex - 1];

    daySchedules = article.Horaires[today]
      ? Array.isArray(article.Horaires[today])
        ? article.Horaires[today].join(", ")
        : article.Horaires[today]
      : "Fermé";
  }

  // Tout le contenu de la sidebar
  sidebarContent.innerHTML = `
    <div class="sidebar-medias">
      <img class="image-sidebar" src="http://localhost:1338${imageUrl || "#"}" alt="Image">
      <iframe src="${iframeUrl || "#"}" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
    </div>
    <div class="sidebar-header">
      <h2>${article.Nom || "Article"}</h2>
      ${article.Type ? `<p class="article-type">${article.Type}</p>` : ""}
    </div>
    <div class="sidebar-buttons">
      ${article.Site ? `<a href="${article.Site}" target="_blank"><i class="ri-external-link-line"></i> Site Web</a>` : ""}
      ${article.Telephone ? `<a href="tel:${article.Telephone}"><i class="ri-phone-line"></i> Appeler</a>` : ""}
    </div>
    <ul class="sidebar-list">
      ${article.Description ? `<li><p class="article-desc article-text">${article.Description}</p></li>` : ""}
      ${article.Adresse ? `<li><i class="ri-map-pin-line"></i><p class="article-subtitle">Adresse :</p><p class="article-text">${article.Adresse}</p></li>` : ""}
      ${article.Localisation ? `<li><i class="ri-map-pin-3-line"></i><p class="article-subtitle">Localisation :</p><p class="article-text">${article.Localisation}</p></li>` : ""}
      ${article.Telephone ? `<li><i class="ri-phone-line"></i><p class="article-subtitle">Téléphone :</p><a href="tel:0${article.Telephone}" class="article-text">${formattedPhone}</a></li>` : ""}
      ${article.Email ? `<li><i class="ri-mail-line"></i><p class="article-subtitle">Adresse mail :</p><a href="mailto:${article.Email}" class="article-text">${article.Email}</a></li>` : ""}
      ${article.Horaires ? `
        <li class="sidebar-horaires">
          <div>
            <i class="ri-time-line"></i>
            <div class="horaires-content" id="horaires-content">
              <p class="article-subtitle">Horaires : </p>
              <p class="article-text">${today.charAt(0).toUpperCase() + today.slice(1)} ⋅ ${daySchedules}</p>
            </div>
          </div>
          <ul class="horaires-complets hidden">${schedulesHTML}</ul>
        </li>` : `
        <li class="sidebar-horaires">
          <div>
            <i class="ri-time-line"></i>
            <div class="horaires-content" id="horaires-content">
              <p class="article-subtitle">Horaires : </p>
              <p class="article-text">Aucune horaire disponible ou horaire variable</p>
            </div>
          </div>
        </li>`}
      ${article.Statut ? `<li><i class="ri-file-list-3-line"></i><p class="article-subtitle">Statut juridique :</p><p class="article-text">${article.Statut}${article.Contrat_Formation ? ` (${article.Contrat_Formation})` : ""}</p></li>` : ""}
      ${article.Cout ? `<li><i class="ri-money-euro-box-line"></i><p class="article-subtitle">Coût :</p><p class="article-text">${article.Cout}</p></li>` : ""}
      ${(article.Vegetarien || article.Halal) ? `
        <li class="sidebar-options">
          ${article.Vegetarien ? `
            <div class="vegetarien">
              <i class="ri-leaf-fill"></i>
              <p class="article-subtitle">Plats végétariens</p>
            </div>` : ""}
          ${article.Halal ? `
            <div class="halal">
              <i class="ri-restaurant-fill"></i>
              <p class="article-subtitle">Plats halal</p>
            </div>` : ""}
        </li>` : ""}
    </ul>
  `;

  // Ajouter un écouteur au clic sur la ligne des horaires pour les horaires complètes
  if (article.Horaires && Object.keys(article.Horaires).length > 0) {
    document.getElementById("horaires-content").addEventListener("click", () => {
      const horairesComplet = document.querySelector(".horaires-complets");
      horairesComplet.classList.toggle("hidden");
    });
  }

  // Affiche la sidebar et ajuste le layout
  toggleSidebar(true);

  // Fermer la sidebar au clic sur le bouton
  document.getElementById("close-sidebar").addEventListener("click", () => {
    toggleSidebar(false);
  });
}

/**
 * Fonction pour gérer l'ouverture et la fermeture de la sidebar
 */
function toggleSidebar(visible) {
  const layout = document.getElementById("layout");
  const sidebar = document.getElementById("sidebar");

  if (visible) {
    layout.classList.add("sidebar-visible");
    sidebar.classList.add("visible");
  } else {
    layout.classList.remove("sidebar-visible");
    sidebar.classList.remove("visible");
  }
}

/**
 * Réinitialiser le chat
 */
function resetChat() {
  chatContainer.innerHTML = "";
  if (!chatContainer.contains(resetButton)) {
    chatContainer.appendChild(resetButton);
  }
}

/**
 * Désactiver les boutons
 */
function disableButtons(buttonsContainer) {
  const buttons = buttonsContainer.querySelectorAll("button");
  buttons.forEach(button => {
    button.disabled = true;
    button.classList.add("disabled");
  });
}

/**
 * Obtenir un entier aléatoire
 */
function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}

/**
 * Obtenir l'URL racine
 */
function getCurrentURL() {
  return window.location.href
}

/**
 * Formater le numéro de téléphone
 */
function formatPhoneNumber(phone) {
  return phone.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}