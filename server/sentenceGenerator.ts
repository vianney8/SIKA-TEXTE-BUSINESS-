import { randomBytes } from "crypto";

interface SentenceTemplate {
  template: string;
  correctedTemplate: string;
  category: string;
}

const SUBJECTS = [
  "Les enfants", "Ma sœur", "Mon frère", "Les étudiants", "Les oiseaux",
  "Les médecins", "Les professeurs", "Les agriculteurs", "Les artistes", "Les musiciens",
  "Mon père", "Ma mère", "Mes amis", "Les voisins", "Les travailleurs",
  "Les commerçants", "Les policiers", "Les infirmières", "Les chauffeurs", "Les cuisiniers",
  "Les journalistes", "Les avocats", "Les ingénieurs", "Les architectes", "Les sportifs",
  "Les danseurs", "Les écrivains", "Les scientifiques", "Les chercheurs", "Les entrepreneurs"
];

const SUBJECTS_SINGULAR = [
  "L'enfant", "Ma sœur", "Mon frère", "L'étudiant", "L'oiseau",
  "Le médecin", "Le professeur", "L'agriculteur", "L'artiste", "Le musicien",
  "Mon père", "Ma mère", "Mon ami", "Le voisin", "Le travailleur",
  "Le commerçant", "Le policier", "L'infirmière", "Le chauffeur", "Le cuisinier",
  "Le journaliste", "L'avocat", "L'ingénieur", "L'architecte", "Le sportif",
  "Le danseur", "L'écrivain", "Le scientifique", "Le chercheur", "L'entrepreneur"
];

const VERBS_PLURAL = {
  correct: ["jouent", "travaillent", "mangent", "chantent", "dansent", "étudient", "cuisinent", "lisent", "écrivent", "parlent", "courent", "marchent", "voyagent", "dorment", "rêvent", "construisent", "réparent", "aident", "enseignent", "apprennent"],
  incorrect: ["joue", "travail", "mange", "chante", "danse", "étudie", "cuisine", "lit", "écrit", "parle", "cour", "marche", "voyage", "dors", "rêve", "construit", "répare", "aide", "enseigne", "apprend"]
};

const VERBS_SINGULAR = {
  correct: ["joue", "travaille", "mange", "chante", "danse", "étudie", "cuisine", "lit", "écrit", "parle", "court", "marche", "voyage", "dort", "rêve", "construit", "répare", "aide", "enseigne", "apprend"],
  incorrect: ["joues", "travails", "manges", "chantes", "danses", "étudies", "cuisines", "lis", "écris", "parles", "cours", "marches", "voyages", "dors", "rêves", "construis", "répares", "aides", "enseignes", "apprends"]
};

const ADVERBS = {
  correct: ["très", "beaucoup", "souvent", "toujours", "parfois", "rapidement", "lentement", "facilement", "difficilement", "tranquillement"],
  incorrect: ["tres", "baucoup", "souven", "toujour", "parfoi", "rapidemant", "lantement", "facilemant", "dificilment", "tranquilment"]
};

const LOCATIONS = [
  "dans le jardin", "à la maison", "au marché", "à l'école", "au travail",
  "dans la forêt", "sur la plage", "dans le parc", "à la bibliothèque", "au restaurant",
  "dans la cuisine", "au bureau", "à l'hôpital", "à l'université", "au stade",
  "dans la rue", "au village", "en ville", "à la campagne", "au bord de la rivière"
];

const TIME_EXPRESSIONS = {
  correct: ["chaque matin", "tous les jours", "chaque soir", "le dimanche", "en été", "au printemps", "en automne", "en hiver", "cette semaine", "ce mois-ci"],
  incorrect: ["chaque mattin", "tout les jours", "chaque soire", "le dimence", "en etté", "au printamps", "en automme", "en hivert", "cet semaine", "se mois-ci"]
};

const OBJECTS = {
  correct: ["des fruits", "des légumes", "du pain", "de l'eau", "du riz", "des fleurs", "des livres", "des vêtements", "des chaussures", "des outils"],
  incorrect: ["des fruit", "des légume", "du pains", "de l'eaux", "du rix", "des fleur", "des livre", "des vêtement", "des chausure", "des outis"]
};

const ADJECTIVES = {
  correct: ["délicieux", "magnifique", "intéressant", "important", "difficile", "facile", "beau", "joli", "grand", "petit"],
  incorrect: ["delicieu", "magnifik", "interessant", "importent", "dificile", "facil", "bo", "jolie", "gran", "peti"]
};

const CONNECTORS = ["et", "mais", "donc", "car", "puis", "ensuite", "après", "avant"];

const SENTENCE_PATTERNS = [
  {
    pattern: "SUBJECT_PLURAL VERB_PLURAL_ERROR LOCATION TIME.",
    correction: "SUBJECT_PLURAL VERB_PLURAL_CORRECT LOCATION TIME."
  },
  {
    pattern: "SUBJECT_SINGULAR VERB_SINGULAR_ERROR LOCATION TIME.",
    correction: "SUBJECT_SINGULAR VERB_SINGULAR_CORRECT LOCATION TIME."
  },
  {
    pattern: "SUBJECT_PLURAL VERB_PLURAL_CORRECT ADVERB_ERROR LOCATION.",
    correction: "SUBJECT_PLURAL VERB_PLURAL_CORRECT ADVERB_CORRECT LOCATION."
  },
  {
    pattern: "SUBJECT_SINGULAR VERB_SINGULAR_CORRECT OBJECT_ERROR.",
    correction: "SUBJECT_SINGULAR VERB_SINGULAR_CORRECT OBJECT_CORRECT."
  },
  {
    pattern: "C'est ADVERB_ERROR ADJECTIVE_CORRECT de VERB_INF LOCATION.",
    correction: "C'est ADVERB_CORRECT ADJECTIVE_CORRECT de VERB_INF LOCATION."
  },
  {
    pattern: "SUBJECT_PLURAL VERB_PLURAL_ERROR ADVERB_CORRECT TIME_ERROR.",
    correction: "SUBJECT_PLURAL VERB_PLURAL_CORRECT ADVERB_CORRECT TIME_CORRECT."
  },
  {
    pattern: "Nous VERB_NOUS_ERROR OBJECT_CORRECT LOCATION.",
    correction: "Nous VERB_NOUS_CORRECT OBJECT_CORRECT LOCATION."
  },
  {
    pattern: "Il faut VERB_INF ADVERB_ERROR pour réussir.",
    correction: "Il faut VERB_INF ADVERB_CORRECT pour réussir."
  },
  {
    pattern: "SUBJECT_SINGULAR VERB_SINGULAR_CORRECT avec ADJECTIVE_ERROR enthousiasme.",
    correction: "SUBJECT_SINGULAR VERB_SINGULAR_CORRECT avec ADJECTIVE_CORRECT enthousiasme."
  },
  {
    pattern: "TIME_ERROR, SUBJECT_PLURAL VERB_PLURAL_CORRECT LOCATION.",
    correction: "TIME_CORRECT, SUBJECT_PLURAL VERB_PLURAL_CORRECT LOCATION."
  }
];

const VERB_INFINITIVES = [
  "travailler", "manger", "étudier", "cuisiner", "lire", "écrire", "parler",
  "courir", "marcher", "voyager", "dormir", "rêver", "construire", "réparer"
];

const VERBS_NOUS = {
  correct: ["travaillons", "mangeons", "étudions", "cuisinons", "lisons", "écrivons", "parlons", "courons", "marchons", "voyageons"],
  incorrect: ["travaillont", "mangons", "étudion", "cuisinont", "lisonts", "écrivonts", "parlonts", "couronts", "marchonts", "voyagons"]
};

function seededRandom(seed: number): () => number {
  let state = seed;
  return function() {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function pickRandom<T>(arr: T[], random: () => number): T {
  return arr[Math.floor(random() * arr.length)];
}

const ERROR_PATTERNS_ONLY = [
  {
    pattern: "SUBJECT_PLURAL VERB_PLURAL_ERROR LOCATION.",
    correction: "SUBJECT_PLURAL VERB_PLURAL_CORRECT LOCATION."
  },
  {
    pattern: "SUBJECT_SINGULAR VERB_SINGULAR_ERROR LOCATION.",
    correction: "SUBJECT_SINGULAR VERB_SINGULAR_CORRECT LOCATION."
  },
  {
    pattern: "SUBJECT_PLURAL VERB_PLURAL_CORRECT ADVERB_ERROR.",
    correction: "SUBJECT_PLURAL VERB_PLURAL_CORRECT ADVERB_CORRECT."
  },
  {
    pattern: "SUBJECT_SINGULAR VERB_SINGULAR_CORRECT OBJECT_ERROR.",
    correction: "SUBJECT_SINGULAR VERB_SINGULAR_CORRECT OBJECT_CORRECT."
  },
  {
    pattern: "SUBJECT_PLURAL VERB_PLURAL_ERROR TIME_ERROR.",
    correction: "SUBJECT_PLURAL VERB_PLURAL_CORRECT TIME_CORRECT."
  },
  {
    pattern: "Il faut VERB_INF ADVERB_ERROR pour réussir.",
    correction: "Il faut VERB_INF ADVERB_CORRECT pour réussir."
  },
  {
    pattern: "Nous VERB_NOUS_ERROR LOCATION TIME.",
    correction: "Nous VERB_NOUS_CORRECT LOCATION TIME."
  },
  {
    pattern: "SUBJECT_PLURAL VERB_PLURAL_ERROR ADVERB_ERROR LOCATION.",
    correction: "SUBJECT_PLURAL VERB_PLURAL_CORRECT ADVERB_CORRECT LOCATION."
  },
  {
    pattern: "TIME_ERROR, SUBJECT_SINGULAR VERB_SINGULAR_ERROR.",
    correction: "TIME_CORRECT, SUBJECT_SINGULAR VERB_SINGULAR_CORRECT."
  },
  {
    pattern: "SUBJECT_PLURAL préparent OBJECT_ERROR TIME_ERROR.",
    correction: "SUBJECT_PLURAL préparent OBJECT_CORRECT TIME_CORRECT."
  },
  {
    pattern: "SUBJECT_SINGULAR achète OBJECT_ERROR LOCATION.",
    correction: "SUBJECT_SINGULAR achète OBJECT_CORRECT LOCATION."
  },
  {
    pattern: "Hier, SUBJECT_PLURAL VERB_PLURAL_ERROR ADVERB_ERROR.",
    correction: "Hier, SUBJECT_PLURAL VERB_PLURAL_CORRECT ADVERB_CORRECT."
  },
  {
    pattern: "Demain, SUBJECT_SINGULAR VERB_SINGULAR_ERROR LOCATION.",
    correction: "Demain, SUBJECT_SINGULAR VERB_SINGULAR_CORRECT LOCATION."
  },
  {
    pattern: "SUBJECT_PLURAL aiment VERB_INF ADVERB_ERROR.",
    correction: "SUBJECT_PLURAL aiment VERB_INF ADVERB_CORRECT."
  },
  {
    pattern: "Pendant TIME_ERROR, SUBJECT_PLURAL VERB_PLURAL_ERROR.",
    correction: "Pendant TIME_CORRECT, SUBJECT_PLURAL VERB_PLURAL_CORRECT."
  }
];

export function generateUniqueSentence(userId: string, sentenceIndex: number, date: string): { text: string; correctedText: string; errorCount: number } {
  const seed = hashCode(`${userId}-${date}-${sentenceIndex}`);
  const random = seededRandom(seed);
  
  const patternIndex = Math.floor(random() * ERROR_PATTERNS_ONLY.length);
  const pattern = ERROR_PATTERNS_ONLY[patternIndex];
  
  let errorText = pattern.pattern;
  let correctedText = pattern.correction;
  let errorCount = 0;
  
  const subjectPluralIndex = Math.floor(random() * SUBJECTS.length);
  const subjectSingularIndex = Math.floor(random() * SUBJECTS_SINGULAR.length);
  const verbIndex = Math.floor(random() * VERBS_PLURAL.correct.length);
  const adverbIndex = Math.floor(random() * ADVERBS.correct.length);
  const locationIndex = Math.floor(random() * LOCATIONS.length);
  const timeIndex = Math.floor(random() * TIME_EXPRESSIONS.correct.length);
  const objectIndex = Math.floor(random() * OBJECTS.correct.length);
  const verbInfIndex = Math.floor(random() * VERB_INFINITIVES.length);
  const verbNousIndex = Math.floor(random() * VERBS_NOUS.correct.length);
  
  const replacements: Record<string, { error: string; correct: string }> = {
    "SUBJECT_PLURAL": { error: SUBJECTS[subjectPluralIndex], correct: SUBJECTS[subjectPluralIndex] },
    "SUBJECT_SINGULAR": { error: SUBJECTS_SINGULAR[subjectSingularIndex], correct: SUBJECTS_SINGULAR[subjectSingularIndex] },
    "VERB_PLURAL_ERROR": { error: VERBS_PLURAL.incorrect[verbIndex], correct: VERBS_PLURAL.correct[verbIndex] },
    "VERB_PLURAL_CORRECT": { error: VERBS_PLURAL.correct[verbIndex], correct: VERBS_PLURAL.correct[verbIndex] },
    "VERB_SINGULAR_ERROR": { error: VERBS_SINGULAR.incorrect[verbIndex], correct: VERBS_SINGULAR.correct[verbIndex] },
    "VERB_SINGULAR_CORRECT": { error: VERBS_SINGULAR.correct[verbIndex], correct: VERBS_SINGULAR.correct[verbIndex] },
    "ADVERB_ERROR": { error: ADVERBS.incorrect[adverbIndex], correct: ADVERBS.correct[adverbIndex] },
    "ADVERB_CORRECT": { error: ADVERBS.correct[adverbIndex], correct: ADVERBS.correct[adverbIndex] },
    "LOCATION": { error: LOCATIONS[locationIndex], correct: LOCATIONS[locationIndex] },
    "TIME_ERROR": { error: TIME_EXPRESSIONS.incorrect[timeIndex], correct: TIME_EXPRESSIONS.correct[timeIndex] },
    "TIME_CORRECT": { error: TIME_EXPRESSIONS.correct[timeIndex], correct: TIME_EXPRESSIONS.correct[timeIndex] },
    "TIME": { error: TIME_EXPRESSIONS.correct[timeIndex], correct: TIME_EXPRESSIONS.correct[timeIndex] },
    "OBJECT_ERROR": { error: OBJECTS.incorrect[objectIndex], correct: OBJECTS.correct[objectIndex] },
    "OBJECT_CORRECT": { error: OBJECTS.correct[objectIndex], correct: OBJECTS.correct[objectIndex] },
    "VERB_INF": { error: VERB_INFINITIVES[verbInfIndex], correct: VERB_INFINITIVES[verbInfIndex] },
    "VERB_NOUS_ERROR": { error: VERBS_NOUS.incorrect[verbNousIndex], correct: VERBS_NOUS.correct[verbNousIndex] },
    "VERB_NOUS_CORRECT": { error: VERBS_NOUS.correct[verbNousIndex], correct: VERBS_NOUS.correct[verbNousIndex] }
  };
  
  for (const [placeholder, values] of Object.entries(replacements)) {
    if (errorText.includes(placeholder)) {
      errorText = errorText.replace(placeholder, values.error);
      correctedText = correctedText.replace(placeholder, values.correct);
      if (values.error !== values.correct) {
        errorCount++;
      }
    }
  }
  
  errorText = errorText.charAt(0).toUpperCase() + errorText.slice(1);
  correctedText = correctedText.charAt(0).toUpperCase() + correctedText.slice(1);
  
  if (errorCount === 0 || errorText === correctedText) {
    const fallbackVerbIdx = Math.floor(random() * VERBS_PLURAL.correct.length);
    const fallbackSubjectIdx = Math.floor(random() * SUBJECTS.length);
    const fallbackLocationIdx = Math.floor(random() * LOCATIONS.length);
    
    errorText = `${SUBJECTS[fallbackSubjectIdx]} ${VERBS_PLURAL.incorrect[fallbackVerbIdx]} ${LOCATIONS[fallbackLocationIdx]}.`;
    correctedText = `${SUBJECTS[fallbackSubjectIdx]} ${VERBS_PLURAL.correct[fallbackVerbIdx]} ${LOCATIONS[fallbackLocationIdx]}.`;
    errorCount = 1;
  }
  
  return {
    text: errorText,
    correctedText: correctedText,
    errorCount: errorCount
  };
}

function generateDeterministicUUID(input: string): string {
  const hash = hashCode(input);
  const hash2 = hashCode(input + "salt");
  const hash3 = hashCode(input + "pepper");
  const hash4 = hashCode(input + "spice");
  
  const hex1 = Math.abs(hash).toString(16).padStart(8, '0').slice(0, 8);
  const hex2 = Math.abs(hash2).toString(16).padStart(4, '0').slice(0, 4);
  const hex3 = Math.abs(hash3).toString(16).padStart(4, '0').slice(0, 4);
  const hex4 = Math.abs(hash4).toString(16).padStart(4, '0').slice(0, 4);
  const hex5 = Math.abs(hash + hash2).toString(16).padStart(12, '0').slice(0, 12);
  
  return `${hex1}-${hex2}-4${hex3.slice(1)}-a${hex4.slice(1)}-${hex5}`;
}

export function generateDailySentencesForUser(userId: string, date: string, count: number = 12): Array<{ id: string; text: string; correctedText: string; errorCount: number; difficulty: string; isActive: boolean }> {
  const sentences: Array<{ id: string; text: string; correctedText: string; errorCount: number; difficulty: string; isActive: boolean }> = [];
  
  for (let i = 0; i < count; i++) {
    const generated = generateUniqueSentence(userId, i, date);
    const uniqueId = generateDeterministicUUID(`${userId}-${date}-${i}`);
    
    sentences.push({
      id: uniqueId,
      text: generated.text,
      correctedText: generated.correctedText,
      errorCount: generated.errorCount,
      difficulty: generated.errorCount > 2 ? 'hard' : generated.errorCount > 1 ? 'medium' : 'easy',
      isActive: true
    });
  }
  
  return sentences;
}

const MORE_SUBJECTS_PLURAL = [
  "Les villageois", "Les paysans", "Les bergers", "Les pêcheurs", "Les chasseurs",
  "Les vendeurs", "Les acheteurs", "Les touristes", "Les voyageurs", "Les marchands",
  "Les artisans", "Les mécaniciens", "Les électriciens", "Les plombiers", "Les maçons",
  "Les couturiers", "Les tailleurs", "Les coiffeurs", "Les boulangers", "Les bouchers",
  "Les fermiers", "Les éleveurs", "Les jardiniers", "Les gardes", "Les soldats",
  "Les élèves", "Les apprentis", "Les stagiaires", "Les employés", "Les ouvriers"
];

const MORE_LOCATIONS = [
  "au champ", "à la ferme", "dans l'atelier", "au magasin", "à la boutique",
  "dans l'usine", "au port", "à la gare", "à l'aéroport", "dans le bus",
  "sur le bateau", "dans l'avion", "sur la moto", "dans le taxi", "au salon",
  "dans la chambre", "à la terrasse", "dans le couloir", "à l'entrée", "à la sortie"
];

const COMPLEX_PATTERNS = [
  {
    pattern: "SUBJECT_PLURAL VERB_PLURAL_ERROR ADVERB_ERROR LOCATION TIME.",
    correction: "SUBJECT_PLURAL VERB_PLURAL_CORRECT ADVERB_CORRECT LOCATION TIME."
  },
  {
    pattern: "Quand SUBJECT_SINGULAR VERB_SINGULAR_ERROR, tout le monde est content.",
    correction: "Quand SUBJECT_SINGULAR VERB_SINGULAR_CORRECT, tout le monde est content."
  },
  {
    pattern: "SUBJECT_PLURAL VERB_PLURAL_CORRECT OBJECT_ERROR ADVERB_ERROR.",
    correction: "SUBJECT_PLURAL VERB_PLURAL_CORRECT OBJECT_CORRECT ADVERB_CORRECT."
  },
  {
    pattern: "Il y a ADVERB_ERROR de personnes qui VERB_PLURAL_ERROR LOCATION.",
    correction: "Il y a ADVERB_CORRECT de personnes qui VERB_PLURAL_CORRECT LOCATION."
  },
  {
    pattern: "Pour réussir, SUBJECT_SINGULAR VERB_SINGULAR_ERROR TIME_ERROR.",
    correction: "Pour réussir, SUBJECT_SINGULAR VERB_SINGULAR_CORRECT TIME_CORRECT."
  }
];

const ADVANCED_PATTERNS = [
  {
    pattern: "Hier, SUBJECT_PLURAL VERB_PLURAL_ERROR OBJECT_ERROR LOCATION.",
    correction: "Hier, SUBJECT_PLURAL VERB_PLURAL_CORRECT OBJECT_CORRECT LOCATION."
  },
  {
    pattern: "SUBJECT_SINGULAR VERB_SINGULAR_ERROR parce qu'il fait ADVERB_ERROR beau.",
    correction: "SUBJECT_SINGULAR VERB_SINGULAR_CORRECT parce qu'il fait ADVERB_CORRECT beau."
  },
  {
    pattern: "Pendant les vacances, SUBJECT_PLURAL VERB_PLURAL_ERROR ADVERB_ERROR.",
    correction: "Pendant les vacances, SUBJECT_PLURAL VERB_PLURAL_CORRECT ADVERB_CORRECT."
  },
  {
    pattern: "SUBJECT_SINGULAR préfère VERB_INF LOCATION TIME_ERROR.",
    correction: "SUBJECT_SINGULAR préfère VERB_INF LOCATION TIME_CORRECT."
  },
  {
    pattern: "Depuis hier, SUBJECT_PLURAL VERB_PLURAL_ERROR sans arrêt.",
    correction: "Depuis hier, SUBJECT_PLURAL VERB_PLURAL_CORRECT sans arrêt."
  },
  {
    pattern: "Avant de partir, SUBJECT_SINGULAR VERB_SINGULAR_ERROR OBJECT_ERROR.",
    correction: "Avant de partir, SUBJECT_SINGULAR VERB_SINGULAR_CORRECT OBJECT_CORRECT."
  },
  {
    pattern: "SUBJECT_PLURAL doivent VERB_INF ADVERB_ERROR pour réussir.",
    correction: "SUBJECT_PLURAL doivent VERB_INF ADVERB_CORRECT pour réussir."
  },
  {
    pattern: "Selon les experts, SUBJECT_PLURAL VERB_PLURAL_ERROR TIME_ERROR.",
    correction: "Selon les experts, SUBJECT_PLURAL VERB_PLURAL_CORRECT TIME_CORRECT."
  },
  {
    pattern: "Grâce à son travail, SUBJECT_SINGULAR VERB_SINGULAR_ERROR ADVERB_ERROR.",
    correction: "Grâce à son travail, SUBJECT_SINGULAR VERB_SINGULAR_CORRECT ADVERB_CORRECT."
  },
  {
    pattern: "SUBJECT_PLURAL ne VERB_PLURAL_ERROR jamais LOCATION.",
    correction: "SUBJECT_PLURAL ne VERB_PLURAL_CORRECT jamais LOCATION."
  },
  {
    pattern: "En général, SUBJECT_SINGULAR VERB_SINGULAR_ERROR OBJECT_ERROR TIME.",
    correction: "En général, SUBJECT_SINGULAR VERB_SINGULAR_CORRECT OBJECT_CORRECT TIME."
  },
  {
    pattern: "Malgré la pluie, SUBJECT_PLURAL VERB_PLURAL_ERROR LOCATION.",
    correction: "Malgré la pluie, SUBJECT_PLURAL VERB_PLURAL_CORRECT LOCATION."
  },
  {
    pattern: "Après le déjeuner, SUBJECT_SINGULAR VERB_SINGULAR_ERROR ADVERB_ERROR.",
    correction: "Après le déjeuner, SUBJECT_SINGULAR VERB_SINGULAR_CORRECT ADVERB_CORRECT."
  },
  {
    pattern: "Le week-end, SUBJECT_PLURAL aiment VERB_INF LOCATION.",
    correction: "Le week-end, SUBJECT_PLURAL aiment VERB_INF LOCATION."
  },
  {
    pattern: "SUBJECT_SINGULAR espère VERB_INF ADVERB_ERROR l'année prochaine.",
    correction: "SUBJECT_SINGULAR espère VERB_INF ADVERB_CORRECT l'année prochaine."
  }
];

const EVEN_MORE_SUBJECTS_PLURAL = [
  "Les habitants", "Les citoyens", "Les familles", "Les parents", "Les grands-parents",
  "Les jeunes", "Les adultes", "Les retraités", "Les bénévoles", "Les associations",
  "Les équipes", "Les groupes", "Les participants", "Les spectateurs", "Les visiteurs",
  "Les clients", "Les fournisseurs", "Les partenaires", "Les investisseurs", "Les actionnaires"
];

const EVEN_MORE_LOCATIONS = [
  "près de la rivière", "au sommet de la colline", "dans la vallée", "au centre-ville",
  "à la périphérie", "dans le quartier", "sur la place publique", "devant le bâtiment",
  "derrière l'église", "à côté du marché", "entre les arbres", "sous le pont",
  "au milieu du champ", "le long de la route", "autour du lac", "face à la mer"
];

const MORE_TIME_EXPRESSIONS = {
  correct: ["de bonne heure", "tard le soir", "à midi", "pendant la nuit", "au coucher du soleil", "à l'aube", "vers minuit", "aux heures de pointe"],
  incorrect: ["de bonheure", "tard le soire", "a midi", "pendent la nuit", "au couché du soleil", "a l'aube", "ver minuit", "aux heure de pointe"]
};

const MORE_OBJECTS = {
  correct: ["des provisions", "des médicaments", "des documents", "des informations", "des conseils", "des solutions", "des idées", "des projets"],
  incorrect: ["des provision", "des médicament", "des document", "des information", "des conseil", "des solution", "des idée", "des projet"]
};

const MORE_ADJECTIVES = {
  correct: ["extraordinaire", "remarquable", "excellent", "formidable", "fantastique", "merveilleux", "spectaculaire", "impressionnant"],
  incorrect: ["extraordinair", "remarquabe", "excelent", "formidabe", "fantastik", "merveileux", "spectaculair", "impressionant"]
};

SENTENCE_PATTERNS.push(...COMPLEX_PATTERNS);
SENTENCE_PATTERNS.push(...ADVANCED_PATTERNS);
SUBJECTS.push(...MORE_SUBJECTS_PLURAL);
SUBJECTS.push(...EVEN_MORE_SUBJECTS_PLURAL);
LOCATIONS.push(...MORE_LOCATIONS);
LOCATIONS.push(...EVEN_MORE_LOCATIONS);

TIME_EXPRESSIONS.correct.push(...MORE_TIME_EXPRESSIONS.correct);
TIME_EXPRESSIONS.incorrect.push(...MORE_TIME_EXPRESSIONS.incorrect);
OBJECTS.correct.push(...MORE_OBJECTS.correct);
OBJECTS.incorrect.push(...MORE_OBJECTS.incorrect);
ADJECTIVES.correct.push(...MORE_ADJECTIVES.correct);
ADJECTIVES.incorrect.push(...MORE_ADJECTIVES.incorrect);

export function getTotalPossibleCombinations(): number {
  return SUBJECTS.length * VERBS_PLURAL.correct.length * ADVERBS.correct.length * 
         LOCATIONS.length * TIME_EXPRESSIONS.correct.length * SENTENCE_PATTERNS.length;
}
