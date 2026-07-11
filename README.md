# Timer Interwałowy — instrukcja wdrożenia (krok po kroku)

Aplikacja to zwykłe pliki — nie potrzebujesz żadnego programowania. Wrzucasz je na darmowy
hosting GitHub Pages i dostajesz publiczny adres, który otwierasz na telefonie. Całość zajmuje ok. 10–15 minut.

## Krok 1 — Załóż konto na GitHubie (jeśli nie masz)

1. Wejdź na **https://github.com** i kliknij **Sign up**.
2. Podaj e-mail, hasło i nazwę użytkownika (np. `dawidtrener`). Potwierdź e-mail.

## Krok 2 — Utwórz repozytorium (czyli folder na pliki)

1. Po zalogowaniu kliknij zielony przycisk **New** (lub plus ➕ w prawym górnym rogu → **New repository**).
2. W polu **Repository name** wpisz np. `timer`.
3. Zaznacz **Public** (musi być publiczne, żeby hosting był darmowy).
4. Kliknij **Create repository**.

## Krok 3 — Wgraj pliki aplikacji

1. Na stronie nowego repozytorium kliknij link **uploading an existing file**
   (albo przycisk **Add file → Upload files**).
2. Przeciągnij do okna przeglądarki **całą zawartość folderu `gym-timer`** — czyli:
   - `index.html`, `styles.css`, `sw.js`, `manifest.webmanifest`, `README.md`
   - folder `js` (5 plików) i folder `icons` (3 pliki)

   **Uwaga:** przeciągnij pliki i foldery ze środka folderu `gym-timer`, a nie sam folder —
   plik `index.html` musi wylądować na najwyższym poziomie repozytorium.
   Folder `tests` możesz pominąć (to tylko testy techniczne).
3. Na dole kliknij zielony przycisk **Commit changes**.

## Krok 4 — Włącz GitHub Pages (hosting)

1. W repozytorium kliknij zakładkę **Settings** (⚙, na górze).
2. W menu po lewej wybierz **Pages**.
3. W sekcji **Build and deployment** → **Source** wybierz **Deploy from a branch**.
4. Poniżej ustaw branch **main** i folder **/ (root)**, kliknij **Save**.
5. Poczekaj 1–3 minuty i odśwież stronę — u góry pojawi się adres w stylu:

   **https://twojanazwa.github.io/timer/**

To jest publiczny adres Twojej aplikacji. Możesz go wysłać komukolwiek.

## Krok 5 — Zainstaluj na telefonie

Otwórz powyższy adres na telefonie:

**iPhone (Safari):** przycisk **Udostępnij** (kwadrat ze strzałką) → **Do ekranu początkowego** → **Dodaj**.

**Android (Chrome):** wyskoczy propozycja instalacji, albo menu **⋮ → Dodaj do ekranu głównego**.

Po instalacji aplikacja działa **w pełni offline** i na pełnym ekranie.
Aplikacja sama pokaże te instrukcje przy pierwszym otwarciu.

> **Ważne (iPhone):** zainstaluj aplikację na ekranie początkowym. Safari potrafi wyczyścić
> dane stron nieodwiedzanych przez 7 dni — zainstalowanej aplikacji to nie dotyczy,
> więc Twoje szablony treningów będą bezpieczne.

## Aktualizacja aplikacji w przyszłości

Wgraj zmienione pliki tak samo jak w kroku 3 (Upload files → Commit changes).
Telefon pobierze nową wersję przy najbliższym otwarciu z dostępem do internetu.

## Rozwiązywanie problemów

- **Strona pokazuje błąd 404** — poczekaj 2–3 minuty po włączeniu Pages; sprawdź,
  czy `index.html` jest na najwyższym poziomie repozytorium (a nie w podfolderze).
- **Nie słychać dźwięków na iPhonie** — sprawdź przełącznik wyciszenia z boku telefonu
  i głośność; w aplikacji jest przycisk 🔊 do testu dźwięku.
- **Ekran gaśnie podczas treningu** — wyłącz tryb oszczędzania baterii; aplikacja
  pokaże ostrzeżenie, jeśli system nie pozwala jej utrzymać ekranu.
