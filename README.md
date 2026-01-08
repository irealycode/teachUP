# TeachUP - Plateforme d'Apprentissage en Ligne (LMS)

**TeachUP** est une plateforme de gestion de l'apprentissage (LMS) moderne conçue pour faciliter l'interaction entre enseignants et étudiants. Elle permet la création de cours multimédias, la gestion des évaluations (quiz) et le suivi analytique des performances.

Ce projet met en œuvre une **architecture de persistance polyglotte** combinant la flexibilité du NoSQL (MongoDB, Redis) pour le contenu et la rigueur du SQL (PostgreSQL) pour les données analytiques.

---

## 🔗 URL du Projet

* **Application Frontend :** [http://localhost:3000](http://localhost:3000)
* **Documentation API (Swagger) :** [http://localhost:8000/docs](http://localhost:8000/docs)
* **Dépôt GitHub :** [https://github.com/irealycode/teachup](https://github.com/irealycode/teachup)

---

## 🏗️ Architecture Technique

Le projet repose sur une architecture micro-services conteneurisée :

* **Frontend :** Next.js 14 (React, Tailwind CSS, TypeScript).
* **Backend :** FastAPI (Python 3.11, Asynchrone).
* **Bases de Données :**
    * **MongoDB :** Stockage des documents hiérarchiques (Utilisateurs, Cours, Tests).
    * **PostgreSQL :** Stockage des données structurées pour les statistiques (`DailyAnalytics`).
    * **Redis :** Gestion du cache pour optimiser les performances de lecture.

---

## 📋 Prérequis

Avant de lancer le projet, assurez-vous d'avoir installé les outils suivants sur votre machine :

1.  **Docker Desktop** (Engine v20.10+ & Compose v2.0+).
2.  **Node.js** (v18+) et **npm** (si lancement hors Docker).
3.  **Python** (v3.11+) (si lancement hors Docker).

---

## 🚀 Installation et Lancement

La méthode recommandée pour lancer l'application est d'utiliser **Docker Compose**, qui orchestre automatiquement le backend et les trois bases de données.

### 1. Cloner le dépôt

```bash
git clone [https://github.com/irealycode/teachup.git](https://github.com/irealycode/teachup.git)
cd teachup