# Implementation Plan: Virtual Try-On Feature

## Overview

Dieser Plan implementiert das Virtual Try-On Feature mit minimalen Änderungen am bestehenden Code. Die Implementierung folgt der etablierten Architektur und nutzt bestehende Patterns maximal wieder.

**Wichtige Prinzipien**:

- Maximale Wiederverwendung bestehender Komponenten
- Minimale Änderungen an bestehendem Code
- Schrittweise Integration mit Tests nach jedem Schritt
- Detaillierte Erklärungen bei jeder Task

## Tasks

- [x] 1. Frontend: Item-Auswahl State Management
  - Erweitere `frontend/app/find-your-style/page.tsx` um Selection State
  - Füge State-Variablen hinzu: `selectedItems`, `isGenerating`, `generatedImage`, `showResultModal`
  - Implementiere `handleItemSelect` Funktion für Toggle-Logik (max. 1 Item pro Kategorie)
  - **Erklärung**: Wir erweitern die bestehende Seite um minimalen State für die Auswahl. Die Logik stellt sicher, dass pro Kategorie nur ein Item ausgewählt ist.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Frontend: StyleItemCard Auswahl-Funktionalität
  - [x] 2.1 Erweitere `frontend/components/style-item-card.tsx` um Selection Props
    - Füge optionale Props hinzu: `isSelected?: boolean`, `onSelect?: (item: StyleItem) => void`
    - Implementiere Click-Handler für Auswahl (zusätzlich zum bestehenden Link)
    - Füge visuelles Feedback hinzu (Border, Checkmark Icon) für ausgewählte Items
    - **Erklärung**: Wir erweitern die bestehende Card-Komponente minimal. Der Link bleibt funktional, aber ein Click auf die Card (außer auf dem Link) triggert die Auswahl.
    - _Requirements: 1.1, 1.2_

  - [ ]\* 2.2 Schreibe Property Test für Item Selection Toggle
    - **Property 1: Item Selection Toggle**
    - **Validates: Requirements 1.1, 1.2**
    - Test mit fast-check: Für jedes Item sollte zweimaliges Klicken zum ursprünglichen Zustand führen
    - **Erklärung**: Property-based Test stellt sicher, dass die Toggle-Logik für alle möglichen Items korrekt funktioniert.

  - [ ]\* 2.3 Schreibe Property Test für Single Item Per Category
    - **Property 2: Single Item Per Category Invariant**
    - **Validates: Requirements 1.3, 1.4**
    - Test mit fast-check: Nach jeder Auswahl sollte maximal 1 Item pro Kategorie ausgewählt sein
    - **Erklärung**: Dieser Test validiert die Invariante über viele zufällige Auswahl-Sequenzen.

- [x] 3. Frontend: Generate Button Komponente
  - [x] 3.1 Erstelle neue Komponente `frontend/components/try-on/generate-button.tsx`
    - Props: `selectedItems`, `isGenerating`, `onGenerate`
    - Button ist enabled wenn mindestens 1 Item ausgewählt
    - Zeigt Anzahl ausgewählter Items
    - Tooltip bei disabled: "Wähle mindestens ein Kleidungsstück aus"
    - Loading-State während Generierung
    - **Erklärung**: Neue isolierte Komponente für den Generate Button. Folgt Shadcn/UI Patterns der bestehenden Buttons.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]\* 3.2 Schreibe Property Test für Button State
    - **Property 3: Generate Button State Consistency**
    - **Validates: Requirements 2.2, 2.3**
    - Test mit fast-check: Button enabled ⟺ mindestens 1 Item ausgewählt
    - **Erklärung**: Validiert die Button-State-Logik über alle möglichen Selection States.

- [x] 4. Frontend: Try-On API Client
  - Erstelle neue Datei `frontend/lib/try-on-api.ts`
  - Implementiere `generateTryOn` Funktion
  - Konvertiert StyleItems in TryOnItem Format
  - Sendet POST-Request an `/try-on/generate` mit Auth-Token
  - Error-Handling für verschiedene HTTP-Status-Codes
  - **Erklärung**: Neue API-Client-Datei nach dem Pattern von `style-api.ts`. Kapselt die Backend-Kommunikation.
  - _Requirements: 3.1, 3.4, 3.5_

- [x] 5. Frontend: Try-On Result Modal
  - [x] 5.1 Erstelle neue Komponente `frontend/components/try-on/try-on-result-modal.tsx`
    - Props: `isOpen`, `onClose`, `imageUrl`, `selectedItems`
    - Zeigt generiertes Bild in voller Größe
    - Zeigt ausgewählte Items als Thumbnails
    - Download-Button für Bild
    - Close-Button
    - **Erklärung**: Neue Modal-Komponente mit Shadcn/UI Dialog. Zeigt das Ergebnis an.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]\* 5.2 Schreibe Unit Tests für Modal
    - Test: Modal öffnet/schließt korrekt
    - Test: Download-Button ist vorhanden
    - Test: Ausgewählte Items werden angezeigt
    - **Erklärung**: Unit Tests für spezifische UI-Funktionalität des Modals.

- [x] 6. Frontend: Integration in Find Your Style Page
  - Integriere GenerateButton in Header (oben rechts)
  - Übergebe `onSelect` und `isSelected` Props an StyleItemCard
  - Implementiere `handleGenerate` Funktion mit API-Call
  - Integriere TryOnResultModal
  - Error-Handling und Loading-States
  - **Erklärung**: Verbindet alle neuen Komponenten mit der bestehenden Seite. Minimale Änderungen am bestehenden Layout.
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 7. Checkpoint - Frontend Tests ausführen
  - Stelle sicher, dass alle Frontend-Tests erfolgreich sind
  - Teste manuell die Item-Auswahl im Browser
  - Frage den Benutzer, ob Fragen auftreten

- [x] 8. Backend: Try-On Module Setup
  - [x] 8.1 Erstelle neues NestJS-Modul `backend/src/try-on/`
    - Erstelle `try-on.module.ts` mit HttpModule Import
    - Erstelle `try-on.controller.ts` mit ClerkAuthGuard
    - Erstelle `try-on.service.ts` mit HttpService
    - Registriere Modul in `app.module.ts`
    - **Erklärung**: Neues isoliertes Modul nach NestJS Best Practices. Folgt exakt dem Pattern von `ai.module.ts`.
    - _Requirements: 4.1_

  - [ ]\* 8.2 Schreibe Unit Tests für Module Setup
    - Test: Modul lädt korrekt
    - Test: Controller ist registriert
    - Test: Service ist verfügbar
    - **Erklärung**: Basis-Tests für die Modul-Struktur.

- [x] 9. Backend: DTOs und Validation
  - Erstelle `backend/src/try-on/dto/generate-try-on.dto.ts`
  - Definiere `GenerateTryOnDto` mit class-validator Decorators
  - Definiere `GenerateTryOnResponse` Interface
  - Validierung: mindestens 1 Item erforderlich
  - **Erklärung**: DTOs nach NestJS Pattern mit Validation. Folgt dem Stil von `analyze-clothing.dto.ts`.
  - _Requirements: 4.3, 10.1, 10.2_

- [x] 10. Backend: Try-On Service Implementation
  - [x] 10.1 Implementiere `generate` Methode in TryOnService
    - Validiere Request (mindestens 1 Item)
    - Rufe Python Try-On Service auf (PYTHON_ENGINE_URL + `/api/v1/try-on/generate`)
    - Transformiere Response für Frontend
    - Error-Handling für Service-Fehler
    - **Erklärung**: Service-Logik orchestriert den API-Call zum Python-Service. Folgt dem Pattern von `ai.service.ts`.
    - _Requirements: 4.3, 4.4, 4.5, 4.6_

  - [ ]\* 10.2 Schreibe Property Tests für Service
    - **Property 9: Request Validation**
    - **Validates: Requirements 4.3**
    - Test mit fast-check: Requests ohne Items sollten 400 zurückgeben
    - **Erklärung**: Validiert die Request-Validierung über viele zufällige Inputs.

  - [ ]\* 10.3 Schreibe Property Tests für Response Format
    - **Property 12: Response Format Consistency**
    - **Validates: Requirements 10.1**
    - Test: Erfolgreiche Responses haben die richtigen Felder
    - **Erklärung**: Stellt sicher, dass die Response-Struktur konsistent ist.

- [x] 11. Backend: Controller Endpoints
  - Implementiere POST `/try-on/generate` Endpoint
  - Verwende ClerkAuthGuard für Authentifizierung
  - Swagger/OpenAPI Dokumentation
  - HTTP-Status-Codes: 200 (Erfolg), 400 (Validation), 401 (Auth), 500 (Server)
  - **Erklärung**: Controller-Endpoint nach NestJS Pattern. Folgt exakt dem Stil von `ai.controller.ts`.
  - _Requirements: 4.1, 4.2, 10.5_

- [ ] 12. Backend: Integration Tests
  - [ ]\* 12.1 Schreibe Integration Test für vollständigen Flow
    - Test: Authentifizierter Request mit gültigen Items
    - Test: Request ohne Auth-Token (401)
    - Test: Request ohne Items (400)
    - Mock Python-Service Response
    - **Erklärung**: End-to-End Test für den Backend-Flow mit gemocktem Python-Service.
    - _Requirements: 4.2, 4.3, 4.4, 4.6_

- [ ] 13. Checkpoint - Backend Tests ausführen
  - Stelle sicher, dass alle Backend-Tests erfolgreich sind
  - Teste Endpoint mit Postman/curl (mit gemocktem Python-Service)
  - Frage den Benutzer, ob Fragen auftreten

- [x] 14. Python: Try-On Service Verzeichnisstruktur
  - Erstelle Verzeichnis `python_engine/try_on_service/`
  - Erstelle Unterverzeichnisse: `app/`, `app/core/`, `app/api/v1/`, `app/api/v1/endpoints/`, `app/services/`
  - Erstelle `__init__.py` Dateien in allen Packages
  - **Erklärung**: Verzeichnisstruktur nach dem Pattern von `face_analysis` und `conversational_agent`.
  - _Requirements: 5.1, 9.1_

- [x] 15. Python: Core Configuration und Logging
  - [x] 15.1 Erstelle `app/core/config.py`
    - Pydantic Settings für Umgebungsvariablen
    - OpenAI API Key, Model, Image Size, Quality
    - CORS Origins, API Prefix
    - **Erklärung**: Configuration nach dem Pattern der anderen Services. Nutzt pydantic-settings.
    - _Requirements: 5.5_

  - [x] 15.2 Erstelle `app/core/logger.py`
    - Logging-Setup nach dem Pattern der anderen Services
    - **Erklärung**: Konsistentes Logging über alle Services hinweg.
    - _Requirements: 8.5_

- [x] 16. Python: OpenAI Service Implementation
  - Erstelle `app/services/openai_service.py`
  - Implementiere `OpenAIService` Klasse mit `edit_image` Methode
  - Methode nimmt `user_photo_url`, `clothing_image_urls` (Liste), und `prompt` als Input
  - Erstelle temporäres Verzeichnis für heruntergeladene Bilder
  - Lade Benutzerfoto und alle Kleidungsstück-Bilder herunter
  - Erstelle Array von Bildern: [user_photo, clothing1, clothing2, ...]
  - Rufe `client.images.edit()` mit folgenden Parametern auf:
    - `model="gpt-image-1"`
    - `image=image_files` (Array von Bildern)
    - `prompt=prompt`
    - `input_fidelity="high"`
    - `quality="low"`
    - `response_format="b64_json"`
  - Extrahiere `b64_json` aus Response
  - Räume temporäre Dateien auf (cleanup)
  - Error-Handling für Rate-Limits, Content-Policy, Network-Fehler
  - Logging von Requests und Responses
  - **Erklärung**: Service kapselt die OpenAI Image Edit API-Integration nach dem Pattern des erfolgreichen Beispiels. Verwendet das offizielle OpenAI Python SDK mit der Edit-Funktion und sendet ein Array von Bildern (Person + Kleidungsstücke).
  - _Requirements: 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 8.1, 8.2, 8.3_

- [x] 17. Python: Prompt Builder Service
  - [x] 17.1 Erstelle `app/services/prompt_builder.py`
    - Implementiere `PromptBuilder` Klasse
    - Methode `build_try_on_prompt` konstruiert detaillierten Prompt nach dem Pattern des Beispiels
    - Prompt enthält klare Anweisungen für fotorealistische Ergebnisse
    - Unterscheide zwischen Single-Item und Multi-Item Prompts
    - Betone: Erhaltung der Person-Identität, natürliche Passform, realistische Beleuchtung
    - Extrahiert Item-Eigenschaften (Farbe, Beschreibung, Name)
    - **Erklärung**: Service konstruiert qualitativ hochwertige Prompts aus Item-Daten nach bewährtem Pattern für fotorealistische Virtual Try-On Ergebnisse.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]\* 17.2 Schreibe Property Test für Prompt Construction
    - **Property 15: Prompt Construction Completeness**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.5**
    - Test mit Hypothesis: Prompt enthält alle erforderlichen Anweisungen und Item-Beschreibungen
    - **Erklärung**: Validiert, dass der Prompt alle erforderlichen Elemente enthält.

- [x] 18. Python: Try-On API Endpoint
  - [x] 18.1 Erstelle `app/api/v1/endpoints/try_on.py`
    - Definiere Pydantic Models:
      - `TryOnRequest` (mit `userPhotoUrl: str`, `items: Dict`, `userId: str`)
      - `TryOnResponse` (mit `image_base64: str`, `metadata: Dict`)
    - Implementiere POST `/generate` Endpoint
    - Validierung: `userPhotoUrl` und mindestens 1 Item erforderlich
    - Rufe PromptBuilder auf, um Prompt zu erstellen
    - Extrahiere Kleidungsstück-Bild-URLs aus Items
    - Rufe OpenAIService.edit_image() mit userPhotoUrl, clothing_image_urls und Prompt auf
    - Gebe Base64-Bild zurück (nicht URL)
    - Error-Handling mit strukturierten Responses
    - **Erklärung**: FastAPI Endpoint nach dem Pattern der anderen Services. Orchestriert Prompt-Building und Image-Editing mit dem Benutzerfoto und Kleidungsstück-Bildern.
    - _Requirements: 5.3, 5.4, 5.7, 5.8, 5.9, 10.3, 10.4_

  - [ ]\* 18.2 Schreibe Unit Tests für Endpoint
    - Test: Erfolgreiche Bearbeitung mit gemocktem OpenAI
    - Test: Validierungsfehler bei fehlender userPhotoUrl
    - Test: Validierungsfehler bei leeren Items
    - Test: Error-Handling bei OpenAI-Fehlern
    - **Erklärung**: Unit Tests mit gemocktem OpenAI Service.

- [x] 19. Python: API Router und Main Application
  - [x] 19.1 Erstelle `app/api/v1/router.py`
    - Registriere try_on Endpoint
    - **Erklärung**: Router nach FastAPI Pattern.

  - [x] 19.2 Erstelle `app/main.py`
    - FastAPI App Setup mit CORS Middleware
    - Health-Check Endpoint
    - API Router Integration
    - **Erklärung**: Main Application nach dem Pattern von `face_analysis/app/main.py`.
    - _Requirements: 5.2, 9.6_

- [x] 20. Python: Docker Configuration
  - [x] 20.1 Erstelle `Dockerfile`
    - Python 3.11-slim Base Image
    - System Dependencies (curl für Health-Check)
    - Python Dependencies Installation
    - Expose Port 8005
    - Health-Check Configuration
    - Uvicorn Start Command
    - **Erklärung**: Dockerfile nach dem Pattern von `face_analysis/Dockerfile`.
    - _Requirements: 9.1, 9.6_

  - [x] 20.2 Erstelle `requirements.txt`
    - fastapi, uvicorn, pydantic, pydantic-settings
    - openai (Python SDK)
    - python-dotenv
    - **Erklärung**: Dependencies für den Service.

- [x] 21. Docker Compose Integration
  - Erweitere `python_engine/docker-compose.yml`
  - Füge `try_on_service` Service hinzu
  - Port 8005, env_file, Health-Check
  - Netzwerk: aesthetiq-network
  - Resource Limits (Memory: 2G)
  - **Erklärung**: Docker Compose Service nach dem Pattern der anderen Services. Integriert sich in bestehendes Netzwerk.
  - _Requirements: 9.2, 9.3, 9.4, 9.5_

- [x] 22. Environment Variables Configuration
  - Füge OPENAI_API_KEY zu `python_engine/.env` hinzu (bereits vorhanden)
  - Dokumentiere neue Umgebungsvariablen in `.env.example`
  - Aktualisiere Backend `.env` falls nötig
  - **Erklärung**: Nutzt bestehende .env Infrastruktur. OPENAI_API_KEY ist bereits konfiguriert.
  - _Requirements: 5.5, 9.3_

- [ ] 23. Checkpoint - Python Service Tests
  - Stelle sicher, dass alle Python-Tests erfolgreich sind
  - Teste Service lokal mit pytest
  - Teste Docker-Build und Container-Start
  - Teste Health-Check Endpoint
  - Frage den Benutzer, ob Fragen auftreten

- [x] 23. Gateway Route Implementation (COMPLETED)
  - Erstelle `python_engine/gateway/app/routes/try_on.py`
  - Füge `TRY_ON_SERVICE_URL` zu Gateway Config hinzu
  - Registriere Route in Gateway Main App
  - Teste Gateway Route mit curl
  - **Erklärung**: Gateway routet `/api/v1/try-on/*` Requests zum Try-On Service.
  - _Requirements: 9.4, 9.5_

- [ ] 24. End-to-End Integration Test
  - [ ]\* 24.1 Teste vollständigen Flow
    - Frontend → Backend → Python Service → OpenAI API
    - Teste mit echtem OpenAI API Call (1-2 Beispiele)
    - Teste Error-Handling (ungültiger API-Key, Rate-Limit)
    - **Erklärung**: Vollständiger Integration-Test über alle Komponenten.
    - _Requirements: Alle_

- [ ] 25. Final Checkpoint - Deployment Vorbereitung
  - Alle Tests erfolgreich
  - Docker Compose startet alle Services
  - Frontend kann mit Backend kommunizieren
  - Backend kann mit Python Service kommunizieren
  - Python Service kann mit OpenAI API kommunizieren
  - Dokumentation aktualisiert
  - Frage den Benutzer, ob alles funktioniert

## Notes

- Tasks mit `*` sind optional und können für ein schnelleres MVP übersprungen werden
- Jede Task referenziert spezifische Requirements für Traceability
- Checkpoints stellen sicher, dass jede Phase validiert wird
- Property Tests validieren universelle Correctness Properties
- Unit Tests validieren spezifische Beispiele und Edge Cases
- Minimale Änderungen am bestehenden Code - nur neue Dateien und kleine Erweiterungen
- Maximale Wiederverwendung bestehender Patterns und Komponenten
