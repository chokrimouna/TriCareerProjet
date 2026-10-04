"""Génère des CV PDF de démo (profils variés) pour le seed TriCareer.
Exécuté une seule fois au build via le conteneur matching (PyMuPDF)."""
import fitz  # PyMuPDF

CVS = {
    "cv_amenyyy.pdf": {
        "name": "Ameny Ben Salah",
        "title": "UI/UX Designer",
        "body": [
            "Profil : Designer d'interfaces avec 3 ans d'experience en conception UI/UX,",
            "specialisee dans les produits web et mobiles centres utilisateur.",
            "",
            "Competences : Figma, Adobe XD, Photoshop, Illustrator, UI Design, UX Research,",
            "Prototypage, Wireframing, Design System, HTML, CSS, Responsive Design, Accessibilite.",
            "",
            "Experience :",
            "- Lead Designer, Studio Web (2022-2024) : refonte complete d'applications SaaS.",
            "- UI Designer, Agence Digitale (2021-2022) : maquettes, prototypes interactifs.",
            "",
            "Formation : Master en Design d'Interaction. Langues : Francais, Anglais.",
        ],
    },
    "cv_designer.pdf": {
        "name": "Sarra Designer",
        "title": "Designer Graphique / Web",
        "body": [
            "Profil : Designer graphique creative, orientee identite visuelle et design web,",
            "2 ans d'experience en branding et conception d'interfaces.",
            "",
            "Competences : Photoshop, Illustrator, Figma, InDesign, UI Design, Branding,",
            "Typographie, Colorimetrie, HTML, CSS, Prototypage, Design responsive.",
            "",
            "Experience :",
            "- Designer, Agence Creative (2022-2024) : chartes graphiques, sites vitrines.",
            "- Freelance Design (2021-2022) : logos, supports de communication.",
            "",
            "Formation : Licence en Arts Appliques. Langues : Francais, Anglais.",
        ],
    },
    "cv_testameny.pdf": {
        "name": "Ameny Trabelsi",
        "title": "Integratrice Web Front-End",
        "body": [
            "Profil : Integratrice web front-end, 3 ans d'experience, passionnee par les",
            "interfaces performantes et le pixel-perfect.",
            "",
            "Competences : HTML, CSS, JavaScript, React, Tailwind CSS, Sass, Figma, WordPress,",
            "Responsive Design, SEO, Git, Accessibilite web, Webdesign.",
            "",
            "Experience :",
            "- Developpeuse Front-End, Web Agency (2022-2024) : integration de maquettes React.",
            "- Integratrice Web, Startup (2021-2022) : sites responsives et landing pages.",
            "",
            "Formation : Licence en Developpement Web. Langues : Francais, Anglais.",
        ],
    },
    "cv_testtest.pdf": {
        "name": "Mohamed Karray",
        "title": "Ingenieur Logiciel",
        "body": [
            "Profil : Ingenieur logiciel full-stack, 4 ans d'experience en conception et",
            "developpement d'applications d'entreprise.",
            "",
            "Competences : Python, Java, C#, .NET, SQL, React, API REST, Docker, Git,",
            "Machine Learning, Algorithmes, Architecture logicielle, Tests unitaires.",
            "",
            "Experience :",
            "- Ingenieur Logiciel, ESN (2021-2024) : microservices .NET et front React.",
            "- Developpeur Backend, Startup (2020-2021) : API REST, bases de donnees SQL.",
            "",
            "Formation : Diplome d'Ingenieur en Informatique. Langues : Francais, Anglais.",
        ],
    },
    "cv_amenygharbi.pdf": {
        "name": "Ameny Gharbi",
        "title": "Ingenieure Data / Developpeuse",
        "body": [
            "Profil : Ingenieure orientee data et developpement logiciel, 3 ans d'experience",
            "en data science et applications intelligentes.",
            "",
            "Competences : Python, SQL, Data Analysis, Machine Learning, NLP, API REST, Java,",
            "React, Docker, Git, Algorithmes, Dashboarding, Statistiques.",
            "",
            "Experience :",
            "- Data Engineer, Fintech (2022-2024) : pipelines de donnees, modeles ML.",
            "- Developpeuse, Laboratoire R&D (2021-2022) : chatbots, parsing de CV.",
            "",
            "Formation : Diplome d'Ingenieur en Informatique. Langues : Francais, Anglais.",
        ],
    },
}


def make(path, cv):
    doc = fitz.open()
    page = doc.new_page()
    y = 60
    page.insert_text((60, y), cv["name"], fontsize=20, fontname="helv")
    y += 26
    page.insert_text((60, y), cv["title"], fontsize=13, fontname="helv")
    y += 30
    for line in cv["body"]:
        page.insert_text((60, y), line, fontsize=10, fontname="helv")
        y += 16
    doc.save(path)
    print("wrote", path)


if __name__ == "__main__":
    import os
    out = os.path.dirname(os.path.abspath(__file__))
    for fname, cv in CVS.items():
        make(os.path.join(out, fname), cv)
