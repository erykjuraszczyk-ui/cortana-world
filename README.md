# Świat Cortany — Planeta pod Kopułą

Prototyp gry 3D **Cortana World 02.0**. Cel pierwszej iteracji: eksplorowalna dolina, przezroczysta kopuła, pierwsza stacja przekaźnikowa i Cortana jako opiekunka/przewodniczka.

## Uruchomienie lokalne

Wymagany Node.js 20.19+ (zalecany Node.js 22).

```bash
npm install
npm run dev
```

Otwórz adres wyświetlony przez Vite (zwykle http://localhost:5173).

## Sterowanie

- **WASD / strzałki** — ruch
- **Shift** — bieg
- **E** — zbieranie fragmentów danych lub interakcja z przekaźnikiem
- **Mysz** — obrót kamery po kliknięciu i przeciągnięciu
- **Przyciski ekranowe** — sterowanie dotykowe na telefonie

## Co działa w prototypie

- proceduralny hologram Cortany 3D z animacją unoszenia, skanowania i gestem podczas mówienia;
- polski odczyt tekstu przez wbudowane Web Speech API przeglądarki (dostępność głosu zależy od urządzenia i przeglądarki);
- scena 3D w Three.js z terenem i przezroczystą kopułą;
- kamera trzecioosobowa oraz ruch postaci;
- Cytadela Cortany, kryształy i stacja przekaźnikowa;
- pierwsza misja wieloetapowa: zebranie trzech fragmentów danych, a następnie aktywacja przekaźnika;
- animowane obiekty do zebrania, licznik postępu i trwały zapis ekwipunku w localStorage;
- panel statusu i podstawowy dialog przewodniczki;
- automatyczny zapis ukończenia misji w localStorage;
- responsywny interfejs dla komputera i telefonu.

## Co jest jeszcze fikcją / planem

Całoplanetarna kopuła, antygrawitacyjne wyspy, kryształy pamięci i anomalie czasu są elementami fikcyjnego uniwersum. Aktualna wersja jest prototypem gry, nie pełną symulacją planety ani autonomicznym agentem AI. Dialog w prototypie jest lokalny, a głos wykorzystuje Web Speech API urządzenia; nie jest to jeszcze prawdziwa rozmowa z modelem AI. Prawdziwy model AI wymaga backendu oraz konfiguracji dostawcy.

## Technologie

- TypeScript, Vite, Three.js, WebGL 2
- GitHub Actions — kontrola jakości i wdrożenie GitHub Pages
- Backend FastAPI i prawdziwa AI — planowany następny etap

## Publikacja GitHub Pages

Repozytorium zawiera workflow w `.github/workflows/deploy-pages.yml`. W ustawieniach repozytorium wejdź w **Settings → Pages** i wybierz **GitHub Actions** jako źródło wdrożenia. Workflow opublikuje stronę po pushu do `main`.

## Zasady bezpieczeństwa

Nie umieszczaj kluczy API w kodzie frontendu ani w publicznym repozytorium. Sekrety dla przyszłego backendu przechowuj w zmiennych środowiskowych i GitHub Secrets. Zmiany generowane automatycznie powinny przejść testy przed wdrożeniem.


## Backend AI (etap 03)

Backend FastAPI znajduje się w katalogu backend/. Instrukcje uruchomienia, konfiguracji klucza i połączenia z frontendem opisano w backend/README.md. Frontend korzysta ze zmiennej kompilacji VITE_CORTANA_API_URL; klucz OPENAI_API_KEY należy trzymać wyłącznie na serwerze backendu.

Rozmowa jest lokalna, a głos wykorzystuje Web Speech API urządzenia, jeżeli backend nie jest skonfigurowany. Gdy API URL zostanie ustawiony, frontend wysyła wiadomości do backendu i prezentuje odpowiedzi modelu.


## Etap 04 — eksploracja i ekwipunek

Pierwsza misja wymaga odnalezienia trzech fragmentów danych w Dolinie Cytadeli. Zbliż się do błękitnego obiektu i naciśnij E. Postęp zbierania oraz stan przekaźnika zapisują się lokalnie w przeglądarce. Przycisk resetowania czyści postęp misji i zebrane fragmenty.

Fragmenty danych są fikcyjnym elementem świata gry, a nie rzeczywistą technologią przechowywania wspomnień.
