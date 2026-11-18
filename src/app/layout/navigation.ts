export const NAVIGATION = [
  { mode: 'home', path: '/', label: 'Panel główny', icon: '⌂' },
  { mode: 'flash', path: '/flash', label: 'Fiszki', icon: '▤' },
  { mode: 'quiz', path: '/quiz', label: 'Quiz ABCD', icon: '☑' },
  { mode: 'recall', path: '/recall', label: 'Odpowiedzi z pamięci', icon: '✎' },
  { mode: 'case', path: '/case', label: 'Przypadki praktyczne', icon: '♧' },
  { mode: 'exam', path: '/exam', label: 'Próbny egzamin', icon: '◷' },
  { mode: 'hard', path: '/hard', label: 'Trudne i zapisane', icon: '↻' },
  { mode: 'catalog', path: '/catalog', label: 'Bank pytań', icon: '⌕' },
  { mode: 'coverage', path: '/coverage', label: 'Zakres egzaminu', icon: '≡' },
  { mode: 'gallery', path: '/gallery', label: 'Ilustracje i schematy', icon: '▧' },
  { mode: 'settings', path: '/settings', label: 'Postępy i ustawienia', icon: '⚙' },
] as const;

export const MOBILE_NAVIGATION = [
  { ...NAVIGATION[0], label: 'Start' },
  NAVIGATION[1],
  { ...NAVIGATION[2], label: 'Quiz' },
  { ...NAVIGATION[5], label: 'Egzamin' },
];
