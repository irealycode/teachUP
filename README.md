# TeachUP

**Lien du dépôt :** [https://github.com/irealycode/teachup](https://github.com/irealycode/teachup)

## 📄 Description courte du projet

TeachUP est une plateforme éducative (LMS) moderne conçue pour faciliter l'interaction entre enseignants et étudiants.
* **Pour les enseignants :** Un tableau de bord complet pour créer des cours, générer des examens, et gérer les soumissions des élèves.
* **Pour les étudiants :** Une interface intuitive pour accéder aux cours, passer des tests en ligne et suivre leur progression.

Le projet est divisé en deux parties principales :
* **Frontend :** Une application **Next.js** (React) utilisant Tailwind CSS pour l'interface.
* **Backend :** Une API **Python** (avec Redis pour la gestion des données) conteneurisée via Docker.

## 🛠 Prérequis

Avant de commencer, assurez-vous d'avoir installé les outils suivants sur votre machine :

* **Node.js** (Version 18 ou supérieure recommandée)
* **Docker** (Pour lancer le backend et la base de données)
* **Python 3.11+** (Optionnel, seulement si vous lancez le backend manuellement sans Docker)

## 📥 Instructions d’installation

1.  **Cloner le dépôt :**
    ```bash
    git clone [https://github.com/irealycode/teachup.git](https://github.com/irealycode/teachup.git)
    cd teachup
    ```

2.  **Installation des dépendances Frontend :**
    ```bash
    # À la racine du projet
    npm install
    ```

3.  **Préparation du Backend :**
    Le backend est configuré pour fonctionner avec Docker. Aucune installation manuelle n'est requise si vous utilisez Docker.

    ```bash
    cd backend
    docker-compose up --build
    ```

## 🚀 Commandes de lancement

Pour lancer l'application complète, exécutez le backend et le frontend dans deux terminaux séparés.

### 1. Lancer le Frontend

Utilisez NPM pour lancer next (mode dev) :

```bash
npm run dev