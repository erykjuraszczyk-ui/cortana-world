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


## Etap 05 — mapa regionalna i odkrywanie lokacji

- Mapa otwiera się przyciskiem **MAPA ŚWIATA** albo klawiszem **M**; zamkniesz ją klawiszem **Escape** lub przyciskiem ×.
- Złoty znacznik pokazuje gracza, błękitne punkty oznaczają odkryte lokacje, a znaki zapytania miejsca nieznane.
- Odkrycia są zapisywane w localStorage. Zbliż się do punktu zainteresowania, aby poznać jego nazwę i opis.
- Mapa jest schematyczna i pokazuje regionalny obszar gry, nie dokładną mapę geograficzną. Nazwy odległych punktów nie oznaczają jeszcze, że wszystkie biomy mają własne, szczegółowo zbudowane środowiska 3D.
- Sterowanie klawiaturą nie reaguje na WASD, gdy kursor znajduje się w polu wpisywania wiadomości.


## Etap 06 — proceduralne biomy 3D

- **Dżungla pod kopułą** — gęstsze drzewa i warstwy koron.
- **Kamienisty grzbiet** — nieregularne skały o różnych rozmiarach.
- **Piaszczysty brzeg** — odmienna kolorystycznie strefa przy jeziorze.
- **Ruiny Cytadeli** — kamienisty obszar wokół ruin.
- **Polana Kryształów** — proceduralne skupiska świecących kryształów.

Rozmieszczenie dekoracji jest deterministyczne. To pierwsza warstwa biomów; kolejne ulepszenia mogą obejmować rzeźbę terenu, modele LOD, dźwięki środowiskowe i optymalizację instancjami. Wszystkie biomy są fikcyjnymi elementami świata gry.


## Etap 07 — rzeźba terenu i naturalne szlaki

- Powierzchnia ma deterministyczne, łagodne nierówności oraz subtelne grzbiety i zagłębienie przy jeziorze.
- Pozycja gracza podąża za wysokością gruntu.
- Dodano trzy krzywoliniowe szlaki łączące okolice Doliny, ruin i jeziora.
- Dodano 180 kwiatów przez THREE.InstancedMesh, ograniczając liczbę wywołań rysowania względem osobnych obiektów.
- Zmiany są proceduralne i nie wymagają zewnętrznych modeli ani tekstur.

Uwaga: to stylizowana rzeźba terenu, a nie symulacja geologiczna. Nie wszystkie wcześniejsze dekoracje są jeszcze indywidualnie dopasowane do wysokości terenu; dopracowanie kolizji i rozmieszczenia będzie osobnym etapem.


## Etap 08 — cykl dnia i nocy

- Światło, kolor nieba, mgła i światło otoczenia zmieniają się płynnie w stylizowanym cyklu 240 sekund.
- Dodano gwiazdy, których widoczność rośnie nocą.
- Pasek górny pokazuje fazę: dzień, świt, zmierzch lub noc.
- Przycisk „PAUZA CYKLU / WZNÓW CYKL” pozwala zatrzymać i wznowić zmianę czasu.
- Cykl jest symulacją gry; nie synchronizuje się z rzeczywistą porą dnia ani astronomią.


## Etap 09 — dźwięk środowiskowy

- Dodano opcjonalny ambient syntetyzowany lokalnie przez Web Audio API — bez plików audio, pobierania assetów ani zewnętrznych usług.
- Przycisk „WŁĄCZ DŹWIĘK / WYŁĄCZ DŹWIĘK” steruje ambientem. Dźwięk startuje dopiero po świadomym kliknięciu użytkownika, zgodnie z zasadami przeglądarek.
- Odkrycie nowej lokacji może odtworzyć krótki trójdźwięk, jeśli audio jest włączone.
- Ambient zmienia wysokość tonu w zależności od pory dnia. To syntetyczny prototyp nastroju, nie nagrania prawdziwej dżungli ani realistyczny wiatr.

 
## Etap 10 — dziennik ekspedycji i zadania poboczne

- Dziennik otwierany przyciskiem **DZIENNIK** lub klawiszem **J**; klawisz **Escape** zamyka panel.
- Trzy zadania śledzące postęp: zebranie 3 fragmentów danych, odkrycie 5 lokacji i aktywacja przekaźnika.
- Dziennik zapisuje ostatnie 12 zdarzeń: odkrycia, zebrane fragmenty, aktywację przekaźnika i reset misji. Wpisy są przechowywane lokalnie w przeglądarce.
- Panel pokazuje postęp zadań i historię z godziną lokalną urządzenia. To lokalny system prototypowy, bez konta i synchronizacji między urządzeniami.

 
## Etap 11 — terminale fabularne i nagrody za eksplorację

- Dodano trzy interaktywne terminale 3D: Dziennik Kopuły, Zapis Cytadeli i Echo Jeziora. Podejdź na odległość około 12 jednostek i naciśnij **E** lub dotknij przycisku **INTERAKCJA**.
- Każdy terminal można odczytać tylko raz na danej przeglądarce. Odczyt wyświetla zapis w panelu Cortany i dopisuje wydarzenie do dziennika.
- Za każdy nowy zapis przyznawane jest 25 punktów ekspedycji. Suma jest zapisywana lokalnie i widoczna w dzienniku.
- Terminale mają własne modele proceduralne, animowany ekran i pierścień sygnałowy. Treść to fikcyjna historia świata gry.
- Zebrane punkty i przeczytane terminale nie są jeszcze synchronizowane między urządzeniami ani przypisane do konta gracza.



## Etap 12 — kolekcja starożytnych artefaktów
- Dodano trzy relikty 3D: **Ziarno Biosfery**, **Kompas Prądów** i **Serce Kryształu**.
- Każdy ma unikatowy kształt, barwę i animację światła; znajdują się w oddalonych rejonach mapy.
- Podejdź na odległość około 11 jednostek i naciśnij **E** lub użyj przycisku **INTERAKCJA** na telefonie.
- Odkrycie wyświetla wpis fabularny i przyznaje **50 punktów ekspedycji**. Dziennik śledzi zadanie „Kolekcjoner reliktów”.
- Kolekcja zapisuje się lokalnie w przeglądarce; nie ma jeszcze synchronizacji między urządzeniami.


## Etap 13 — odblokowywane obszary i bramy energetyczne 3D

- Dodano trzy bramy 3D: **Brama Szmaragdowa**, **Brama Prądów** i **Brama Rdzenia**, z metalową ramą, świecącym pierścieniem i polem energii.
- Każda brama wymaga konkretnego reliktu: Ziarna Biosfery, Kompasu Prądów albo Serca Kryształu.
- Podejdź do bramy i naciśnij **E**. Bez wymaganego reliktu gra podpowie, czego brakuje. Aktywacja przyznaje 75 punktów ekspedycji.
- Stan odblokowania zapisuje się lokalnie, a dziennik śledzi zadanie „Strażnik przejść”.
- To etap progresji i aktywacji bram; teleportacja do oddzielnych map i pełne nowe regiony są zaplanowane osobno.


## Etap 14 — Nowe regiony 3D za bramami
- **Ogród Pierwotny** za Bramą Szmaragdową: szmaragdowe kryształy i pradawna iglica.
- **Wyżyny Prądów** za Bramą Prądów: chłodna, niebieska strefa kryształów i wysoka wieża.
- **Krater Rdzenia** za Bramą Rdzenia: fioletowe kryształy i centralny monolit.
- Po odblokowaniu bramy naciśnij **E** ponownie, aby przenieść się do regionu. Świecący portal w regionie pozwala wrócić do Doliny Cytadeli.
- Stan odblokowania bram pozostaje zapisany lokalnie. Regiony są na razie strefami w obrębie jednej sceny 3D, a nie osobnymi mapami.


## Etap 15 — Misje, strażnicy i nagrody regionalne
Każdy region ma własną misję zapisywaną lokalnie:
- **Ogród Pierwotny:** aktywuj Źródło Życia, Korzeń Światła i Kwiat Pamięci; pokonaj Strażnika Splotu. Nagroda: **250 pkt**.
- **Wyżyny Prądów:** aktywuj Węzeł Północny, Węzeł Burzy i Węzeł Echa; pokonaj Strażnika Wyładowań. Nagroda: **300 pkt**.
- **Krater Rdzenia:** aktywuj trzy Pieczęcie; pokonaj Kolosa Pustki. Nagroda: **400 pkt**.
Interakcja: podejdź blisko i naciśnij **E**. Strażnicy są abstrakcyjnymi przeciwnikami 3D — po aktywacji wszystkich trzech punktów trzeba wykonać trzy interakcje przy strażniku. Nagroda jest przyznawana tylko raz na region, a postęp zapisuje się w localStorage.
