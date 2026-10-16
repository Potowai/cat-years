import { createContext, useContext, useMemo, type ReactNode } from 'react'
import {
  factValues,
  STAGE_META,
  verdictTier,
  type CatAge,
  type StageId,
} from './catAge'
import { ERR } from './errors'
import type { Locale } from './locale'
import type { CatSort, CoatId } from './types'
import { formatDate } from './utils'

type StageCopy = { label: string; blurb: string }
type Verdict = (name: string) => string

export type Dict = {
  langLabel: string
  nav: { wall: string; addCat: string }
  footer: {
    builtLead: string
    brand: string
    builtTail: string
    disclaimer: string
  }
  home: {
    badge: string
    titleBefore: string
    titleHighlight: string
    titleAfter: string
    subtitle: string
    ctaAdd: string
    ctaSee: (n: number) => string
    statCats: string
    statPurrs: string
    statAvg: string
    statOldest: string
    wallTitle: string
    wallHint: string
    sorts: Record<CatSort, string>
    emptyTitle: string
    emptyText: string
    emptyCta: string
    marquee: string[]
  }
  card: { humanYears: string; oldSuffix: string }
  detail: {
    back: string
    reportCard: (name: string) => string
    humanYearsOld: string
    catAge: string
    born: string
    alleged: (name: string) => string
    scientific: string
    share: string
    copied: string
    purrAria: string
    purrWord: string
    ownerBadge: string
    edit: string
    delete: string
    confirmDelete: string
    deleting: string
    cancel: string
  }
  facts: {
    days: string
    napHours: string
    naps: string
    heartbeats: string
    kibble: string
  }
  form: {
    newTitle: string
    newSubtitle: string
    editTitle: (name: string) => string
    editSubtitle: string
    photo: string
    photoHint: string
    drop: string
    dropOr: string
    tapChange: string
    removePhoto: string
    previewAlt: string
    name: string
    namePlaceholder: string
    birthday: string
    birthdayHint: string
    coat: string
    coatOptional: string
    bio: string
    bioPlaceholder: string
    livePreview: string
    yourCat: string
    humanYearsOld: string
    inCatTime: (catAge: string) => string
    pickBirthday: string
    submitCreate: string
    submitEdit: string
    submitting: string
    saving: string
    loading: string
    notOwnerTitle: string
    notOwnerText: (name: string) => string
    viewCat: (name: string) => string
    coats: Record<CoatId, string>
    aiChecking: string
    aiCatOk: string
    aiNotCat: string
    errPhotoMissing: string
    errNameMissing: string
    errBirthdayMissing: string
    errFuture: string
  }
  stages: Record<StageId, StageCopy>
  jobs: Record<StageId, string>
  verdicts: Verdict[]
  errors: Record<string, string>
  notFound: { title: string; text: string; cta: string }
  errorBoundary: {
    title: string
    defaultMessage: string
    retry: string
    home: string
  }
  seo: {
    homeTitle: string
    homeDesc: string
    addTitle: string
    addDesc: string
    editTitle: string
    editDesc: string
    catTitle: (name: string, human: string) => string
    catDesc: (
      name: string,
      stage: string,
      date: string,
      human: string,
    ) => string
  }
  units: {
    lessThanAMonth: string
    month: (n: number) => string
    year: (n: number) => string
    joinYM: (years: string, months: string) => string
    notEvenOne: string
  }
}

const en: Dict = {
  langLabel: 'Language',
  nav: { wall: 'The wall', addCat: 'Add your cat' },
  footer: {
    builtLead: 'Built for cats who do not care, with',
    brand: 'TanStack',
    builtTail: 'on Vercel.',
    disclaimer: 'Age math is an approximation. Cats are, medically, a mystery.',
  },
  home: {
    badge: "🐾 The internet's cat birthday counter",
    titleBefore: 'How old is your cat, in ',
    titleHighlight: 'human',
    titleAfter: ' years?',
    subtitle:
      'Post a photo and a birthday. We run the extremely scientific math, then pin your cat to the wall of the internet forever. Because the world clearly needs more cats.',
    ctaAdd: 'Put my cat on the wall',
    ctaSee: (n) => `See all ${n} ${n === 1 ? 'cat' : 'cats'}`,
    statCats: 'Cats on the wall',
    statPurrs: 'Total purrs',
    statAvg: 'Avg human age',
    statOldest: 'Oldest (human yrs)',
    wallTitle: 'The wall',
    wallHint: 'Every cat, by the numbers. Hover one — they like attention.',
    sorts: {
      newest: 'Newest',
      oldest: 'Oldest cats',
      senior: 'Most senior',
      popular: 'Most purred',
      name: 'A → Z',
    },
    emptyTitle: 'The wall is tragically empty',
    emptyText:
      'Not a single cat. On the internet. This has never happened before. Be the hero this wall deserves.',
    emptyCta: 'Add the first cat',
    marquee: [
      'A cat year is not a dog year 🐟',
      'Cats sleep 16 hours a day. Respect the grind.',
      'Year one ≈ 15 human years. It happens fast.',
      'Every cat is the oldest cat in the room, spiritually.',
      'Purrs make everything better.',
      'Science says: yes, they are judging you.',
    ],
  },
  card: { humanYears: 'human years', oldSuffix: 'old' },
  detail: {
    back: 'Back to the wall',
    reportCard: (name) => `${name}’s feline report card`,
    humanYearsOld: 'human years old',
    catAge: 'Cat age',
    born: 'Born',
    alleged: (name) => `— ${name}, allegedly`,
    scientific: 'Extremely scientific numbers',
    share: 'Share this cat',
    copied: 'Link copied!',
    purrAria: 'Give this cat a purr',
    purrWord: 'purrs',
    ownerBadge: 'You added this cat 🐾',
    edit: 'Edit',
    delete: 'Delete',
    confirmDelete: 'Yes, remove my cat',
    deleting: 'Deleting…',
    cancel: 'Cancel',
  },
  facts: {
    days: 'Days on this planet',
    napHours: 'Hours spent napping',
    naps: 'Naps (approx.)',
    heartbeats: 'Heartbeats so far',
    kibble: 'Kibble eaten (approx.)',
  },
  form: {
    newTitle: 'Put your cat on the wall',
    newSubtitle:
      'A photo, a name, a birthday. No account, no email, no nonsense. You can edit or remove your cat later — we keep a little key in your browser.',
    editTitle: (name) => `Edit ${name}`,
    editSubtitle: 'Change whatever you like. The age recalculates as you go.',
    photo: 'Photo',
    photoHint: 'JPG, PNG, WEBP or GIF · under 4MB',
    drop: 'Drop a photo here',
    dropOr: 'or click to choose from your device',
    tapChange: 'Tap to change',
    removePhoto: 'Remove photo',
    previewAlt: 'Your cat preview',
    name: 'Name',
    namePlaceholder: 'e.g. Biscuit',
    birthday: 'Birthday',
    birthdayHint: 'We only need the date',
    coat: 'Coat',
    coatOptional: 'Optional',
    bio: 'A little bio (optional)',
    bioPlaceholder: 'Loves: boxes, snacks, chaos. Hates: the vacuum.',
    livePreview: 'Live preview',
    yourCat: 'Your cat',
    humanYearsOld: 'human years old',
    inCatTime: (catAge) => `${catAge} in cat time`,
    pickBirthday: 'Pick a birthday and their age appears here. Magic.',
    submitCreate: 'Pin my cat to the wall',
    submitEdit: 'Save changes',
    submitting: 'Pinning your cat…',
    saving: 'Saving…',
    loading: 'Loading…',
    notOwnerTitle: 'Not your cat to edit',
    notOwnerText: (name) =>
      `Only the person who added ${name} can change these details. If that is you, edit from the same browser you used to add them.`,
    viewCat: (name) => `View ${name}`,
    coats: {
      orange: 'Ginger',
      black: 'Black',
      white: 'Snow',
      grey: 'Grey',
      tuxedo: 'Tuxedo',
      calico: 'Calico',
      tabby: 'Tabby',
      cream: 'Cream',
    },
    errPhotoMissing: 'Add a photo of your cat — this is the whole point.',
    errNameMissing: 'Your cat needs a name.',
    errBirthdayMissing: 'Pick a birthday so we can do the math.',
    errFuture: 'That birthday is in the future. Time-traveling cat?',
    aiChecking: 'Checking that this is actually a cat…',
    aiCatOk: 'Cat detected 🐾',
    aiNotCat:
      "Hmm, that doesn't look like a cat. We only do cats here. 🐾",
  },
  stages: {
    kitten: {
      label: 'Kitten',
      blurb: 'A tiny chaos goblin running purely on vibes and gravity.',
    },
    junior: {
      label: 'Junior',
      blurb: 'Legally a teenager. Emotionally a 3am thunderstorm.',
    },
    adult: {
      label: 'Adult',
      blurb: 'In their prime — peak napping, peak judgment, peak floof.',
    },
    mature: {
      label: 'Mature',
      blurb:
        'Knows exactly which chair is theirs, and that it is all of them.',
    },
    senior: {
      label: 'Senior',
      blurb: 'Distinguished. Opinionated. Commands better snacks than you.',
    },
    geriatric: {
      label: 'Geriatric Legend',
      blurb: 'Has seen empires rise and fall, and slept through most of it.',
    },
  },
  jobs: {
    kitten: 'Chief Mischief Officer',
    junior: 'Certified Zoomies Technician',
    adult: 'Senior Nap Supervisor',
    mature: 'Lounge Chair Curator',
    senior: 'Distinguished Sunbeam Chaser',
    geriatric: 'Couch Historian Emeritus',
  },
  verdicts: [
    (n) => `${n} is a baby. Whatever it just broke, you deserved it.`,
    (n) => `${n} is basically a toddler with claws and a superiority complex.`,
    (n) => `${n} is in their rebellious phase. The curtains were asking for it.`,
    (n) =>
      `${n} is a young adult — old enough to judge you, young enough to blame it on youth.`,
    (n) => `${n} has entered their "I know a better spot than this" era.`,
    (n) => `${n} complains about their knees now. Welcome to the club.`,
    (n) =>
      `${n} is a dignified elder who has earned the right to be ignored.`,
    (n) =>
      `${n} has seen things. Prefers not to discuss them. Prefers the sunbeam.`,
    (n) => `${n} is basically a living legend. Bow accordingly.`,
  ],
  errors: {
    [ERR.NOT_IMAGE]: 'That does not look like an image.',
    [ERR.BAD_TYPE]: 'Please use a JPG, PNG, WEBP or GIF.',
    [ERR.TOO_BIG]: 'That photo is over 4MB. Try a smaller one.',
    [ERR.NO_PHOTO]: 'No photo was attached.',
    [ERR.UPLOAD_FAILED]: 'Upload failed. Please try again.',
    [ERR.STORAGE_UNCONFIGURED]:
      'Photo storage is not configured. Set BLOB_READ_WRITE_TOKEN.',
    [ERR.BAD_UPLOAD]: 'Could not read the upload.',
    [ERR.NOT_OWNER]: 'You can only edit your own cat.',
    [ERR.CAT_GONE]: 'That cat has wandered off.',
    [ERR.RATE_LIMITED]:
      'Whoa there, that is a lot of cats. Take a breather and try again in a few minutes.',
    [ERR.TOO_MANY_CATS]:
      'The wall is full for now — too many cats have moved in. Please try again later.',
    [ERR.GENERIC]: 'Something went wrong.',
  },
  notFound: {
    title: 'No cat here',
    text: 'This page is emptier than a food bowl five minutes after dinner.',
    cta: 'Back to the cat wall',
  },
  errorBoundary: {
    title: 'Something knocked it off the table',
    defaultMessage: 'An unexpected error happened. It was probably the cat.',
    retry: 'Try again',
    home: 'Go home',
  },
  seo: {
    homeTitle: 'Cat Years — how old is your cat in human years?',
    homeDesc:
      'Put your cat on the wall of the internet. Share a photo and birthday, and Cat Years reveals their real age in human years, complete with extremely scientific cat facts.',
    addTitle: 'Add your cat',
    addDesc:
      'Post a photo and a birthday and pin your cat to the wall of the internet.',
    editTitle: 'Edit cat',
    editDesc: 'Update your cat on Cat Years.',
    catTitle: (name, human) => `${name} is ${human} in human years`,
    catDesc: (name, stage, date, human) =>
      `${name} is a ${stage} (${date}). About ${human} in human years. Meet them on Cat Years.`,
  },
  units: {
    lessThanAMonth: 'less than a month',
    month: (n) => `${n} month${n === 1 ? '' : 's'}`,
    year: (n) => `${n} year${n === 1 ? '' : 's'}`,
    joinYM: (years, months) => `${years}, ${months}`,
    notEvenOne: 'not even 1',
  },
}

const fr: Dict = {
  langLabel: 'Langue',
  nav: { wall: 'Le mur', addCat: 'Ajouter votre chat' },
  footer: {
    builtLead: 'Conçu pour des chats qui s’en fichent, avec',
    brand: 'TanStack',
    builtTail: 'sur Vercel.',
    disclaimer:
      'Le calcul d’âge est une approximation. Les chats sont, médicalement, un mystère.',
  },
  home: {
    badge: "🐾 Le compteur d'anniversaires de chats d'internet",
    titleBefore: 'Quel âge a vraiment votre chat, en années ',
    titleHighlight: 'humaines',
    titleAfter: ' ?',
    subtitle:
      'Publiez une photo et une date de naissance. On fait le calcul ultra scientifique, puis on épingle votre chat sur le mur d’internet pour toujours. Parce que le monde a clairement besoin de plus de chats.',
    ctaAdd: 'Mettre mon chat sur le mur',
    ctaSee: (n) => `Voir ${n === 1 ? 'le chat' : `les ${n} chats`}`,
    statCats: 'Chats sur le mur',
    statPurrs: 'Ronrons au total',
    statAvg: 'Âge humain moyen',
    statOldest: 'Le plus âgé (ans)',
    wallTitle: 'Le mur',
    wallHint: 'Tous les chats, en chiffres. Survolez-en un — ils adorent ça.',
    sorts: {
      newest: 'Récents',
      oldest: 'Plus anciens',
      senior: 'Les doyens',
      popular: 'Plus ronronnés',
      name: 'A → Z',
    },
    emptyTitle: 'Le mur est tragiquement vide',
    emptyText:
      'Pas un seul chat. Sur internet. Du jamais-vu. Soyez le héros que ce mur mérite.',
    emptyCta: 'Ajouter le premier chat',
    marquee: [
      'Une année de chat n’est pas une année de chien 🐟',
      'Les chats dorment 16 heures par jour. Respectez l’effort.',
      'La première année ≈ 15 ans humains. Ça file vite.',
      'Tout chat est le plus vieux chat de la pièce, spirituellement.',
      'Les ronrons arrangent tout.',
      'La science confirme : oui, ils vous jugent.',
    ],
  },
  card: { humanYears: 'ans humains', oldSuffix: '' },
  detail: {
    back: 'Retour au mur',
    reportCard: (name) => `Le bulletin félin de ${name}`,
    humanYearsOld: 'ans humains',
    catAge: 'Âge de chat',
    born: 'Né le',
    alleged: (name) => `— ${name}, soi-disant`,
    scientific: 'Chiffres extrêmement scientifiques',
    share: 'Partager ce chat',
    copied: 'Lien copié !',
    purrAria: 'Offrir un ronron à ce chat',
    purrWord: 'ronrons',
    ownerBadge: 'Vous avez ajouté ce chat 🐾',
    edit: 'Modifier',
    delete: 'Supprimer',
    confirmDelete: 'Oui, retirer mon chat',
    deleting: 'Suppression…',
    cancel: 'Annuler',
  },
  facts: {
    days: 'Jours sur Terre',
    napHours: 'Heures de sieste',
    naps: 'Siestes (env.)',
    heartbeats: 'Battements de cœur',
    kibble: 'Croquettes mangées (env.)',
  },
  form: {
    newTitle: 'Affichez votre chat sur le mur',
    newSubtitle:
      'Une photo, un nom, une date de naissance. Pas de compte, pas d’e-mail, pas de chichis. Vous pourrez modifier ou retirer votre chat plus tard — on garde une petite clé dans votre navigateur.',
    editTitle: (name) => `Modifier ${name}`,
    editSubtitle: 'Changez ce que vous voulez. L’âge se recalcule au fur et à mesure.',
    photo: 'Photo',
    photoHint: 'JPG, PNG, WEBP ou GIF · moins de 4 Mo',
    drop: 'Déposez une photo ici',
    dropOr: 'ou cliquez pour choisir depuis votre appareil',
    tapChange: 'Touchez pour changer',
    removePhoto: 'Retirer la photo',
    previewAlt: 'Aperçu de votre chat',
    name: 'Nom',
    namePlaceholder: 'ex. Biscuit',
    birthday: 'Date de naissance',
    birthdayHint: 'On a seulement besoin de la date',
    coat: 'Pelage',
    coatOptional: 'Facultatif',
    bio: 'Une petite bio (facultatif)',
    bioPlaceholder:
      'Aime : les cartons, les snacks, le chaos. Déteste : l’aspirateur.',
    livePreview: 'Aperçu en direct',
    yourCat: 'Votre chat',
    humanYearsOld: 'ans humains',
    inCatTime: (catAge) => `${catAge} en âge de chat`,
    pickBirthday:
      'Choisissez une date de naissance et son âge apparaît ici. Magie.',
    submitCreate: 'Épingler mon chat sur le mur',
    submitEdit: 'Enregistrer',
    submitting: 'Épinglage de votre chat…',
    saving: 'Enregistrement…',
    loading: 'Chargement…',
    notOwnerTitle: 'Ce chat n’est pas le vôtre',
    notOwnerText: (name) =>
      `Seule la personne qui a ajouté ${name} peut modifier ces informations. Si c’est vous, modifiez depuis le même navigateur que celui utilisé pour l’ajouter.`,
    viewCat: (name) => `Voir ${name}`,
    coats: {
      orange: 'Roux',
      black: 'Noir',
      white: 'Blanc',
      grey: 'Gris',
      tuxedo: 'Tuxedo',
      calico: 'Calico',
      tabby: 'Tigré',
      cream: 'Crème',
    },
    errPhotoMissing: 'Ajoutez une photo de votre chat — c’est tout l’intérêt.',
    errNameMissing: 'Votre chat a besoin d’un nom.',
    errBirthdayMissing: 'Choisissez une date de naissance pour qu’on fasse le calcul.',
    errFuture: 'Cette date de naissance est dans le futur. Un chat voyageur temporel ?',
    aiChecking: 'Vérification qu’il s’agit bien d’un chat…',
    aiCatOk: 'Chat détecté 🐾',
    aiNotCat:
      'Hmm, ça ne ressemble pas à un chat. Ici, on ne fait que des chats. 🐾',
  },
  stages: {
    kitten: {
      label: 'Chaton',
      blurb:
        'Un minuscule gobelin du chaos qui carbure aux ondes et à la gravité.',
    },
    junior: {
      label: 'Junior',
      blurb:
        'Officiellement un ado. Émotionnellement un orage à 3 h du matin.',
    },
    adult: {
      label: 'Adulte',
      blurb:
        'À l’apogée — sieste maximale, jugement maximal, floof maximal.',
    },
    mature: {
      label: 'Mature',
      blurb:
        'Sait exactement quelle chaise est la sienne, et que ce sont toutes les chaises.',
    },
    senior: {
      label: 'Senior',
      blurb:
        'Distingué. Opinionné. Obtient de meilleurs snacks que vous.',
    },
    geriatric: {
      label: 'Légende gériatrique',
      blurb:
        'A vu des empires naître et tomber, et a dormi pendant presque tout.',
    },
  },
  jobs: {
    kitten: 'Directeur des bêtises',
    junior: 'Technicien certifié en courses folles',
    adult: 'Superviseur senior des siestes',
    mature: 'Conservateur de chaises longues',
    senior: 'Chasseur distingué de rayons de soleil',
    geriatric: 'Historien émérite du canapé',
  },
  verdicts: [
    (n) =>
      `${n} est un bébé. Quoi qu’il vienne de casser, vous l’avez mérité.`,
    (n) =>
      `${n} est en gros un tout-petit avec des griffes et un complexe de supériorité.`,
    (n) => `${n} est en pleine crise d’ado. Les rideaux l’avaient cherché.`,
    (n) =>
      `${n} est un jeune adulte — assez vieux pour vous juger, assez jeune pour mettre ça sur le compte de la jeunesse.`,
    (n) =>
      `${n} est entré dans son ère « je connais un meilleur spot que celui-là ».`,
    (n) =>
      `${n} se plaint de ses genoux maintenant. Bienvenue au club.`,
    (n) => `${n} est un ancien digne qui a gagné le droit d’être ignoré.`,
    (n) =>
      `${n} a vu des choses. Préfère ne pas en parler. Préfère le rayon de soleil.`,
    (n) => `${n} est carrément une légende vivante. Inclinez-vous.`,
  ],
  errors: {
    [ERR.NOT_IMAGE]: 'Cela ne ressemble pas à une image.',
    [ERR.BAD_TYPE]: 'Utilisez un JPG, PNG, WEBP ou GIF.',
    [ERR.TOO_BIG]: 'Cette photo dépasse 4 Mo. Essayez-en une plus petite.',
    [ERR.NO_PHOTO]: 'Aucune photo n’a été jointe.',
    [ERR.UPLOAD_FAILED]: 'Échec de l’envoi. Veuillez réessayer.',
    [ERR.STORAGE_UNCONFIGURED]:
      'Le stockage des photos n’est pas configuré. Définissez BLOB_READ_WRITE_TOKEN.',
    [ERR.BAD_UPLOAD]: 'Impossible de lire l’envoi.',
    [ERR.NOT_OWNER]: 'Vous ne pouvez modifier que votre propre chat.',
    [ERR.CAT_GONE]: 'Ce chat s’est égaré.',
    [ERR.RATE_LIMITED]:
      'Doucement, voilà beaucoup de chats. Soufflez un peu et réessayez dans quelques minutes.',
    [ERR.TOO_MANY_CATS]:
      'Le mur est plein pour l’instant — trop de chats ont emménagé. Réessayez plus tard.',
    [ERR.GENERIC]: 'Une erreur est survenue.',
  },
  notFound: {
    title: 'Pas de chat ici',
    text: 'Cette page est plus vide qu’une gamelle cinq minutes après le repas.',
    cta: 'Retour au mur des chats',
  },
  errorBoundary: {
    title: 'Quelque chose a été poussé de la table',
    defaultMessage: 'Une erreur inattendue est survenue. C’était sûrement le chat.',
    retry: 'Réessayer',
    home: 'Accueil',
  },
  seo: {
    homeTitle: 'Cat Years — quel âge a votre chat en années humaines ?',
    homeDesc:
      'Affichez votre chat sur le mur d’internet. Partagez une photo et une date de naissance : Cat Years révèle son âge réel en années humaines, avec des faits félins extrêmement scientifiques.',
    addTitle: 'Ajouter votre chat',
    addDesc:
      'Publiez une photo et une date de naissance et épinglez votre chat sur le mur d’internet.',
    editTitle: 'Modifier le chat',
    editDesc: 'Mettez à jour votre chat sur Cat Years.',
    catTitle: (name, human) => `${name} a ${human} ans humains`,
    catDesc: (name, stage, date, human) =>
      `${name}, ${stage} né le ${date}. Environ ${human} ans humains. À découvrir sur Cat Years.`,
  },
  units: {
    lessThanAMonth: 'moins d’un mois',
    month: (n) => `${n} mois`,
    year: (n) => `${n} an${n === 1 ? '' : 's'}`,
    joinYM: (years, months) => `${years} et ${months}`,
    notEvenOne: 'même pas 1',
  },
}

export const dicts: Record<Locale, Dict> = { en, fr }

export function getDict(locale: Locale): Dict {
  return dicts[locale] ?? en
}

export function createI18n(locale: Locale) {
  const d = getDict(locale)
  const numberFmt = new Intl.NumberFormat(locale)
  const kgFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
  const compactFmt = new Intl.NumberFormat(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  })

  /** Grams → a readable mass in kg, switching to tonnes for legendary appetites. */
  function formatKibble(grams: number): string {
    if (grams >= 1_000_000) {
      const tonnes = Math.round(grams / 10_000) / 100
      return `${kgFmt.format(tonnes)} t`
    }
    const kg = Math.round(grams / 100) / 10
    return `${kgFmt.format(kg)} kg`
  }

  return {
    locale,
    ...d,
    stageLabel: (id: StageId) => d.stages[id].label,
    stageBlurb: (id: StageId) => d.stages[id].blurb,
    stageEmoji: (id: StageId) => STAGE_META[id].emoji,
    stageAccent: (id: StageId) => STAGE_META[id].accent,
    jobTitle: (age: CatAge) => d.jobs[age.stageId],
    verdict: (name: string, humanYears: number) =>
      d.verdicts[verdictTier(humanYears)](name),
    catAgeLabel: (age: CatAge) => {
      const u = d.units
      if (age.totalMonths < 1) return u.lessThanAMonth
      if (age.years === 0) return u.month(age.months)
      const y = u.year(age.years)
      if (age.months === 0) return y
      return u.joinYM(y, u.month(age.months))
    },
    humanAgeLabel: (age: CatAge) =>
      age.humanYears < 1
        ? d.units.notEvenOne
        : numberFmt.format(Math.round(age.humanYears)),
    formatDate: (iso: string) => formatDate(iso, locale),
    formatNumber: (n: number) => numberFmt.format(n),
    facts: (age: CatAge) => {
      const v = factValues(age)
      return [
        { key: 'days', label: d.facts.days, value: numberFmt.format(v.days) },
        {
          key: 'napHours',
          label: d.facts.napHours,
          value: compactFmt.format(v.napHours),
        },
        { key: 'naps', label: d.facts.naps, value: compactFmt.format(v.naps) },
        {
          key: 'heartbeats',
          label: d.facts.heartbeats,
          value: compactFmt.format(v.heartbeats),
        },
        {
          key: 'kibble',
          label: d.facts.kibble,
          value: formatKibble(v.kibbleGrams),
        },
      ]
    },
    errorMessage: (code?: string | null) =>
      (code && d.errors[code]) || d.errors[ERR.GENERIC],
  }
}

export type I18n = ReturnType<typeof createI18n>

const I18nContext = createContext<I18n>(createI18n('en'))

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale
  children: ReactNode
}) {
  const value = useMemo(() => createI18n(locale), [locale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  return useContext(I18nContext)
}

/** Reads the detected locale out of a route `head`/`beforeLoad` matches array. */
export function localeFromMatches(matches: unknown): Locale {
  if (Array.isArray(matches)) {
    for (const match of matches) {
      const ctx = (match as { context?: { locale?: Locale } } | undefined)
        ?.context
      if (ctx?.locale) return ctx.locale
    }
  }
  return 'en'
}
