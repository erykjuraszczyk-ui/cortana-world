# Cortana World API

Backend FastAPI dla gry Świat Cortany. Klucz modelu pozostaje wyłącznie na serwerze; nigdy nie umieszczaj go w frontendzie ani publicznym repozytorium.

## Uruchomienie lokalne

Wymagany Python 3.11+.

1. Wejdź do katalogu backend.
2. Utwórz środowisko: python -m venv .venv
3. Aktywuj je: Linux/macOS: source .venv/bin/activate; Windows PowerShell: .venv\Scripts\Activate.ps1
4. Zainstaluj zależności: pip install -e ".[test]"
5. Skopiuj .env.example do .env i ustaw OPENAI_API_KEY własnym kluczem API. Nie commituj uzupełnionego pliku .env.
6. Uruchom: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Sprawdź http://localhost:8000/health i dokumentację pod http://localhost:8000/docs.

## Konfiguracja

- OPENAI_API_KEY — wymagany do AI; tylko po stronie serwera.
- OPENAI_MODEL — domyślnie gpt-5.5; użyj modelu dostępnego w swoim projekcie API.
- ALLOWED_ORIGINS — lista originów CORS oddzielona przecinkami.
- RATE_LIMIT_PER_MINUTE — limit żądań na IP, domyślnie 20.

Backend nie zapisuje historii rozmów do bazy. Historia w żądaniu jest ograniczona do 12 wiadomości, a wywołanie modelu używa store=False. Limiter w pamięci procesu to ochrona prototypowa; środowisko produkcyjne wymaga uwierzytelniania, limitowania współdzielonego i monitorowania kosztów.

## Endpointy

- GET /health — status usługi i informacja, czy AI została skonfigurowana.
- GET /api/v1/world/state — przykładowy stan świata.
- POST /api/v1/chat — rozmowa z Cortaną na podstawie stanu gry przekazanego w żądaniu.

## Wdrożenie

Wdróż katalog backend na hostingu obsługującym Python lub kontenery. Ustaw tam OPENAI_API_KEY i ALLOWED_ORIGINS. Frontend GitHub Pages jest statyczny i nie może bezpiecznie przechowywać klucza API.

W repozytorium GitHub otwórz Settings → Secrets and variables → Actions → Variables i dodaj zmienną repozytorium VITE_CORTANA_API_URL z bazowym adresem wdrożonego backendu, bez końcowego ukośnika. Ten adres nie jest sekretem. Klucz AI należy do środowiska backendu.
