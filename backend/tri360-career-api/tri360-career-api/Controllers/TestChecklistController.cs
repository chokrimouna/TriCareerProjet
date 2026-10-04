using Microsoft.AspNetCore.Mvc;
using Quizback.Models;

namespace Quizback.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TestChecklistController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetChecklist(string category = "General")
        {
            var cat = category.ToLower();

            // ── DESIGN TEST ──────────────────────────────────────────────────
            if (cat.Contains("design") || cat.Contains("graphi") || cat.Contains("figma") || cat.Contains("psd") || cat.Contains("logo") || cat.Contains("wire"))
            {
                var designChecklist = new List<object>
                {
                    // Section 1 – Logo
                    new { checklistId = 1,  section = "Logo", criterion = "Le logo est présent et conforme au brief", maxScore = 1 },
                    new { checklistId = 2,  section = "Logo", criterion = "Les couleurs du logo respectent la charte graphique", maxScore = 1 },
                    new { checklistId = 3,  section = "Logo", criterion = "Le logo est lisible sur fond blanc et fond sombre", maxScore = 1 },
                    new { checklistId = 4,  section = "Logo", criterion = "Version vectorielle ou haute résolution fournie", maxScore = 1 },

                    // Section 2 – Wireframe / Maquette Homepage
                    new { checklistId = 5,  section = "Wireframe / Maquette Homepage", criterion = "Structure de la page d'accueil claire et logique", maxScore = 1 },
                    new { checklistId = 6,  section = "Wireframe / Maquette Homepage", criterion = "Présence des sections essentielles (hero, services, CTA, footer)", maxScore = 1 },
                    new { checklistId = 7,  section = "Wireframe / Maquette Homepage", criterion = "Navigation intuitive et hiérarchie de l'information respectée", maxScore = 1 },
                    new { checklistId = 8,  section = "Wireframe / Maquette Homepage", criterion = "Maquette livrée sur PSD / Figma / XD avec calques organisés", maxScore = 1 },
                    new { checklistId = 9,  section = "Wireframe / Maquette Homepage", criterion = "Responsive prévu : desktop + mobile visibles", maxScore = 1 },

                    // Section 3 – Graphisme & Esthétique
                    new { checklistId = 10, section = "Graphisme & Esthétique", criterion = "Cohérence des couleurs avec la charte du client", maxScore = 1 },
                    new { checklistId = 11, section = "Graphisme & Esthétique", criterion = "Typographies lisibles et cohérentes", maxScore = 1 },
                    new { checklistId = 12, section = "Graphisme & Esthétique", criterion = "Espacement et alignement des éléments soignés", maxScore = 1 },
                    new { checklistId = 13, section = "Graphisme & Esthétique", criterion = "Visuels et icônes cohérents avec le secteur d'activité", maxScore = 1 },
                    new { checklistId = 14, section = "Graphisme & Esthétique", criterion = "CTA visuellement distinctifs et attractifs", maxScore = 1 },

                    // Section 4 – Livraison
                    new { checklistId = 15, section = "Livraison & Organisation", criterion = "Fichier source bien structuré (calques nommés, groupés)", maxScore = 1 },
                    new { checklistId = 16, section = "Livraison & Organisation", criterion = "Exports des assets prêts (PNG, SVG, JPG)", maxScore = 1 },
                    new { checklistId = 17, section = "Livraison & Organisation", criterion = "Dossier créatif / moodboard fourni en bonus", maxScore = 1 },
                };
                return Ok(designChecklist);
            }

            // ── CODE / DEV TEST ──────────────────────────────────────────────
            if (cat.Contains("code") || cat.Contains("dev") || cat.Contains("web") || cat.Contains("front") || cat.Contains("back"))
            {
                var codeChecklist = new List<object>
                {
                    // Section 1 – Structure & Architecture
                    new { checklistId = 1,  section = "Structure & Architecture", criterion = "Organisation des fichiers et dossiers logique", maxScore = 1 },
                    new { checklistId = 2,  section = "Structure & Architecture", criterion = "Séparation des responsabilités respectée (composants, services...)", maxScore = 1 },
                    new { checklistId = 3,  section = "Structure & Architecture", criterion = "Conventions de nommage cohérentes", maxScore = 1 },

                    // Section 2 – Qualité du code
                    new { checklistId = 4,  section = "Qualité du code", criterion = "Code lisible, clair et bien commenté", maxScore = 1 },
                    new { checklistId = 5,  section = "Qualité du code", criterion = "Absence de code mort ou de redondances inutiles", maxScore = 1 },
                    new { checklistId = 6,  section = "Qualité du code", criterion = "Gestion correcte des erreurs et cas limites", maxScore = 1 },
                    new { checklistId = 7,  section = "Qualité du code", criterion = "Pas de données sensibles en dur dans le code (API keys, passwords)", maxScore = 1 },

                    // Section 3 – Fonctionnalité
                    new { checklistId = 8,  section = "Fonctionnalité", criterion = "Les fonctionnalités demandées sont toutes implémentées", maxScore = 1 },
                    new { checklistId = 9,  section = "Fonctionnalité", criterion = "L'application fonctionne sans erreurs critiques", maxScore = 1 },
                    new { checklistId = 10, section = "Fonctionnalité", criterion = "Responsive / compatibilité navigateurs vérifiée", maxScore = 1 },

                    // Section 4 – Performance & Sécurité
                    new { checklistId = 11, section = "Performance & Sécurité", criterion = "Temps de chargement raisonnable (pas de requêtes inutiles)", maxScore = 1 },
                    new { checklistId = 12, section = "Performance & Sécurité", criterion = "Validation des inputs côté client et serveur", maxScore = 1 },
                    new { checklistId = 13, section = "Performance & Sécurité", criterion = "Pas de failles XSS ou SQL injection évidentes", maxScore = 1 },

                    // Section 5 – Livraison
                    new { checklistId = 14, section = "Livraison & Documentation", criterion = "README clair avec instructions d'installation", maxScore = 1 },
                    new { checklistId = 15, section = "Livraison & Documentation", criterion = "Dépendances listées (package.json, requirements.txt...)", maxScore = 1 },
                };
                return Ok(codeChecklist);
            }

            // ── RÉDAC TEST ───────────────────────────────────────────────────
            if (cat.Contains("redac") || cat.Contains("réda") || cat.Contains("redaction") || cat.Contains("écrit") || cat.Contains("content") || cat.Contains("texte"))
            {
                var redacChecklist = new List<object>
                {
                    // Section 1 – Langue & Orthographe
                    new { checklistId = 1,  section = "Langue & Orthographe", criterion = "Absence de fautes d'orthographe manifestes", maxScore = 1 },
                    new { checklistId = 2,  section = "Langue & Orthographe", criterion = "Grammaire et syntaxe correctes", maxScore = 1 },
                    new { checklistId = 3,  section = "Langue & Orthographe", criterion = "Ponctuation et typographie soignées", maxScore = 1 },

                    // Section 2 – Style & Ton
                    new { checklistId = 4,  section = "Style & Ton", criterion = "Ton adapté à la cible et au secteur", maxScore = 1 },
                    new { checklistId = 5,  section = "Style & Ton", criterion = "Vocabulaire riche et varié, sans répétitions", maxScore = 1 },
                    new { checklistId = 6,  section = "Style & Ton", criterion = "Phrases fluides et agréables à lire", maxScore = 1 },

                    // Section 3 – Structure & Argumentation
                    new { checklistId = 7,  section = "Structure & Argumentation", criterion = "Introduction accrocheuse qui capte l'attention", maxScore = 1 },
                    new { checklistId = 8,  section = "Structure & Argumentation", criterion = "Plan logique et cohérent (début, développement, conclusion)", maxScore = 1 },
                    new { checklistId = 9,  section = "Structure & Argumentation", criterion = "Arguments étayés et exemples pertinents", maxScore = 1 },
                    new { checklistId = 10, section = "Structure & Argumentation", criterion = "Conclusion claire avec une prise de position ou un CTA", maxScore = 1 },

                    // Section 4 – Pertinence & SEO
                    new { checklistId = 11, section = "Pertinence & Contenu Web", criterion = "Contenu répondant précisément au sujet demandé", maxScore = 1 },
                    new { checklistId = 12, section = "Pertinence & Contenu Web", criterion = "Titres et sous-titres structurés (H1, H2, H3...)", maxScore = 1 },
                    new { checklistId = 13, section = "Pertinence & Contenu Web", criterion = "Mots-clés intégrés naturellement si SEO demandé", maxScore = 1 },
                    new { checklistId = 14, section = "Pertinence & Contenu Web", criterion = "Longueur respectant le brief (nombre de mots)", maxScore = 1 },
                };
                return Ok(redacChecklist);
            }

            // ── DEFAULT (General) ────────────────────────────────────────────
            var generalChecklist = new List<object>
            {
                new { checklistId = 1,  section = "Compétences Générales", criterion = "Compréhension du sujet et des consignes", maxScore = 1 },
                new { checklistId = 2,  section = "Compétences Générales", criterion = "Qualité et soin du rendu livré", maxScore = 1 },
                new { checklistId = 3,  section = "Compétences Générales", criterion = "Respect des délais et des contraintes", maxScore = 1 },
                new { checklistId = 4,  section = "Compétences Générales", criterion = "Créativité et originalité de l'approche", maxScore = 1 },
                new { checklistId = 5,  section = "Compétences Générales", criterion = "Communication et clarté de la démarche", maxScore = 1 },
            };
            return Ok(generalChecklist);
        }
    }
}
