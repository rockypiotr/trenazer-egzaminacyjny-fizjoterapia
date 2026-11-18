# Trenażer egzaminacyjny z fizjoterapii

Fiszki, quizy, pytania otwarte, przypadki praktyczne i próbny egzamin. Postępy zapisują się w przeglądarce. Możesz je przenieść na inne urządzenie przez eksport i import JSON w zakładce „Postępy i ustawienia”.

[Otwórz trenażer na GitHub Pages](https://rockypiotr.github.io/trenazer-egzaminacyjny-fizjoterapia/)

## Uruchomienie lokalne

Użyj Node.js 24.15 lub nowszej wersji z linii 24. Wersje Angulara 22.2.7, Angular CLI i TypeScriptu są zapisane w `package.json` i `package-lock.json`.

```sh
npm ci
npm start
```

Otwórz [http://localhost:4200/](http://localhost:4200/). Polecenie `npm run build` zapisuje statyczną stronę w `dist/trainer/browser`, ze ścieżką bazową `/trenazer-egzaminacyjny-fizjoterapia/` i routingiem przez `#`.

## Struktura aplikacji

Jedna aplikacja Angular z komponentami standalone i domyślnym trybem zoneless. Katalog `src/app/domains` zawiera bank pytań, naukę i postępy. Fasady w `application/facades` udostępniają stan i operacje. Modele i reguły są w `domain`. Dostęp do JSON-ów oraz zapis i odczyt postępów obsługuje `infrastructure`.

Ekrany są w `src/app/features` i ładują się przez trasy Angular Router. Komponenty w `presentation/pages` łączą fasady z widokami. Komponenty w `presentation/ui` otrzymują dane przez wejścia i emitują zdarzenia. Bank pytań i konfiguracja egzaminu korzystają z Signal Forms.

Na starcie aplikacja pobiera `data/sets.json`. Wykłady wczytuje na żądanie przez `HttpClient` i `rxResource`. Pobrany zestaw jest współdzielony między ekranami podczas bieżącego uruchomienia aplikacji.

## Weryfikacja

Po instalacji zależności uruchom poniższe polecenia. Testy wymagają Pythona 3.

```sh
npm run validate:data
npm run typecheck
npm run test:unit
npx playwright install chromium
npm run test:e2e
```

Playwright testuje produkcyjny build w Chromium na komputerze oraz w emulacji telefonu, pod ścieżką używaną przez GitHub Pages. Dodatkowy zestaw jest wczytywany tylko w przeglądarce testowej.

## Dopisanie pytania

Otwórz plik zestawu, np. `data/sets/wyklad-v.json`. Dodaj obiekt do tablicy odpowiadającej trybowi. Najprościej skopiować pytanie tego samego typu i zmienić jego pola.

| Tablica | Pole `kind` | Prefiks ID |
| --- | --- | --- |
| `cards` | `card` | `F` |
| `quizzes` | `quiz` | `Q` |
| `opens` | `open` | `O` |
| `cases` | `case` | `C` |

ID pytania musi być unikalne, np. `F-V-900`. Zachowaj ID istniejących pytań, bo pod nimi zapisują się postępy. Pole `lecture` to ID zestawu, `slide` wskazuje slajd źródłowy, a `difficulty` przyjmuje `basic`, `medium` lub `hard`. W quizie jednokrotnego wyboru `correct: 0` oznacza pierwszą odpowiedź, a `correct: 1` drugą.

Po zmianie pytań uruchom `npm run validate:data -- --update-metadata`. Polecenie aktualizuje w rejestrze liczniki, tematy i listę ID używanych do obliczania postępów na ekranie startowym.

## Dodanie zestawu

1. Utwórz `data/sets/wyklad-viii.json`, np. z jedną fiszką i jednym pytaniem testowym.

   ```json
   {
     "cards": [
       {
         "id": "F-VIII-001",
         "kind": "card",
         "lecture": "VIII",
         "slide": "3",
         "topic": "Terminologia",
         "difficulty": "basic",
         "priority": false,
         "question": "Co oznacza skrót ROM?",
         "answer": "Zakres ruchu (range of motion)."
       }
     ],
     "quizzes": [
       {
         "id": "Q-VIII-001",
         "kind": "quiz",
         "lecture": "VIII",
         "slide": "3",
         "topic": "Terminologia",
         "difficulty": "basic",
         "priority": false,
         "qtype": "single",
         "question": "Co opisuje ROM?",
         "options": ["Zakres ruchu", "Częstość oddechów"],
         "correct": 0,
         "why": "ROM to skrót od range of motion."
       }
     ]
   }
   ```

2. Dopisz do tablicy w `data/sets.json` poniższy wpis. Ścieżkę `file` podaj względem rejestru. ID zestawu musi być unikalne. Zacznij od litery lub cyfry. Dalej możesz użyć także myślników i podkreśleń. ID `both` jest zarezerwowane.

   ```json
   {
     "id": "VIII",
     "label": "Wykład VIII",
     "title": "Terminologia",
     "file": "sets/wyklad-viii.json"
   }
   ```

3. Uruchom `npm run validate:data -- --update-metadata`. Odśwież stronę i wybierz „Wykład VIII” w wybranym trybie.

Aby dodać ilustrację, umieść plik w `images/` i dopisz wpis do tablicy `images` w JSON zestawu. Skopiuj format z wykładu V. Pole `src` jest ścieżką względem pliku zestawu, np. `../../images/wyklad-viii-slajd-3.jpg`.

## Publikacja w GitHub Pages

1. W repozytorium otwórz **Settings → Pages** i ustaw **Source → GitHub Actions**.
2. Wypchnij zmiany do `main`. Workflow `Deploy GitHub Pages` zweryfikuje dane i uruchomi testy. Po ich przejściu opublikuje zawartość `dist/trainer/browser`.
3. Otwórz dotychczasowy adres GitHub Pages. Na tym samym urządzeniu i w tej samej przeglądarce aplikacja odczyta wcześniejsze postępy.
