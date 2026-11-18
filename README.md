# Trenażer egzaminacyjny z fizjoterapii

Fiszki, quizy, pytania otwarte, przypadki praktyczne i próbny egzamin. Postępy zapisują się w przeglądarce. Możesz je przenieść na inne urządzenie przez eksport i import JSON w zakładce „Postępy i ustawienia”.

[Otwórz trenażer na GitHub Pages](https://rockypiotr.github.io/trenazer-egzaminacyjny-fizjoterapia/)

## Uruchomienie lokalne

W terminalu, w katalogu repozytorium, uruchom:

```sh
python3 -m http.server 8000 --directory ..
```

Otwórz [http://localhost:8000/trenazer-egzaminacyjny-fizjoterapia/](http://localhost:8000/trenazer-egzaminacyjny-fizjoterapia/). Jeśli katalog repozytorium ma inną nazwę, użyj jej w adresie. Strona pobiera zestawy przez HTTP.

## Testy E2E

W katalogu repozytorium uruchom poniższe polecenia. Potrzebujesz Node.js 20 lub nowszego oraz Pythona 3.

```sh
npm ci
npx playwright install chromium
npm run test:e2e
```

Playwright uruchamia lokalny serwer i testuje stronę w Chromium na komputerze oraz w emulacji telefonu. Dodatkowy zestaw jest wczytywany tylko w przeglądarce testowej.

## Dopisanie pytania

Otwórz plik zestawu, np. `data/sets/wyklad-v.json`. Dodaj obiekt do tablicy odpowiadającej trybowi. Najprościej skopiować pytanie tego samego typu i zmienić jego pola.

| Tablica | Pole `kind` | Prefiks ID |
| --- | --- | --- |
| `cards` | `card` | `F` |
| `quizzes` | `quiz` | `Q` |
| `opens` | `open` | `O` |
| `cases` | `case` | `C` |

ID pytania musi być unikalne, np. `F-V-900`. Zachowaj ID istniejących pytań, bo pod nimi zapisują się postępy. Pole `lecture` to ID zestawu, `slide` wskazuje slajd źródłowy, a `difficulty` przyjmuje `basic`, `medium` lub `hard`. W quizie jednokrotnego wyboru `correct: 0` oznacza pierwszą odpowiedź, a `correct: 1` drugą.

## Dodanie zestawu

1. Utwórz `data/sets/wyklad-vii.json`, np. z jedną fiszką i jednym pytaniem testowym.

   ```json
   {
     "cards": [
       {
         "id": "F-VII-001",
         "kind": "card",
         "lecture": "VII",
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
         "id": "Q-VII-001",
         "kind": "quiz",
         "lecture": "VII",
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
     "id": "VII",
     "label": "Wykład VII",
     "title": "Terminologia",
     "file": "sets/wyklad-vii.json"
   }
   ```

3. Odśwież stronę. Wybierz „Wykład VII” w banku pytań, fiszkach, quizie lub próbnym egzaminie. Pojawią się pytania pasujące do trybu.

Aby dodać ilustrację, umieść plik w `images/` i dopisz wpis do tablicy `images` w JSON zestawu. Skopiuj format z wykładu V. Pole `src` jest ścieżką względem pliku zestawu, np. `../../images/wyklad-vii-slajd-3.jpg`.

## Publikacja w GitHub Pages

1. Opublikuj na gałęzi `main` zmienione pliki oraz całe potrzebne katalogi `css/`, `js/`, `data/` i `images/`. Plik `index.html` musi być w katalogu głównym.
2. W repozytorium otwórz **Settings → Pages**. Ustaw **Deploy from a branch**, gałąź **main** i katalog **/ (root)**. Ten projekt korzysta już z tych ustawień.
3. Po zakończeniu wdrożenia otwórz ten sam link GitHub Pages. Na tym samym urządzeniu i w tej samej przeglądarce strona odczyta dotychczasowe postępy.
