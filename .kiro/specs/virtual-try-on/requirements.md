# Requirements Document: Virtual Try-On Feature

## Introduction

Das Virtual Try-On Feature ermöglicht es Benutzern, ein Foto von sich selbst hochzuladen, verschiedene Kleidungsstücke aus der "Find Your Own Style" Seite auszuwählen und ein KI-generiertes Bild zu erstellen, das zeigt, wie sie in diesen Kleidungsstücken aussehen würden. Das Feature nutzt die OpenAI Image Edit API, um realistische Visualisierungen zu erstellen.

## Glossary

- **Style_Item**: Ein Kleidungsstück oder Accessoire aus der Datenbank mit Eigenschaften wie Kategorie, Bild-URL, Marke und Beschreibung
- **Category**: Die Klassifizierung eines Style_Items (TOP, BOTTOM, SHOE, ACCESSORY)
- **Selection_State**: Der aktuelle Zustand der vom Benutzer ausgewählten Items für jede Kategorie
- **Try_On_Service**: Der Python-basierte Microservice, der die OpenAI Image Generation API aufruft
- **Generate_Button**: Die UI-Komponente, die die Bildgenerierung auslöst
- **Frontend**: Die Next.js/React-Anwendung
- **Backend**: Der NestJS-basierte API-Server
- **Gateway**: Der Python-basierte API-Gateway, der Anfragen an Microservices weiterleitet

## Requirements

### Requirement 1: User Photo Upload and Persistence

**User Story:** Als Benutzer möchte ich ein Foto von mir selbst hochladen können, das in der Datenbank gespeichert wird, damit ich nicht jedes Mal ein neues Foto hochladen muss.

#### Acceptance Criteria

1. THE Frontend SHALL eine Upload-Komponente für Benutzerfotos bereitstellen
2. WHEN ein Benutzer ein Foto auswählt, THEN THE Frontend SHALL das Foto validieren (Format: JPG, PNG, WEBP; Max. Größe: 10MB)
3. WHEN ein Foto hochgeladen wird, THEN THE Frontend SHALL eine Vorschau des Fotos anzeigen
4. THE Frontend SHALL die Möglichkeit bieten, das hochgeladene Foto zu ersetzen
5. WHEN ein Foto hochgeladen wird, THEN THE Backend SHALL das Foto in Azure Blob Storage speichern
6. THE Backend SHALL die Foto-URL in der User-Datenbank (MongoDB) im Feld `tryOnPhotoUrl` speichern
7. WHEN ein Benutzer die Seite erneut besucht und bereits ein Foto hochgeladen hat, THEN THE Frontend SHALL das gespeicherte Foto automatisch laden und anzeigen
8. WHEN ein gespeichertes Foto vorhanden ist, THEN THE Frontend SHALL die Item-Auswahl sofort aktivieren
9. WHEN kein Foto hochgeladen oder gespeichert ist, THEN THE Frontend SHALL die Item-Auswahl deaktivieren

### Requirement 2: Item Selection in UI

**User Story:** Als Benutzer möchte ich Kleidungsstücke aus der Sidebar auswählen können, damit ich verschiedene Outfit-Kombinationen zusammenstellen kann.

#### Acceptance Criteria

1. WHEN ein Benutzer auf ein Style_Item in der Grid-Ansicht klickt, THEN THE Frontend SHALL das Item als ausgewählt markieren und visuell hervorheben
2. WHEN ein Benutzer ein bereits ausgewähltes Item erneut klickt, THEN THE Frontend SHALL die Auswahl aufheben
3. WHEN ein Benutzer ein Item einer Kategorie auswählt, für die bereits ein Item ausgewählt ist, THEN THE Frontend SHALL das neue Item auswählen und das vorherige Item dieser Kategorie abwählen
4. THE Frontend SHALL für jede Kategorie (TOP, BOTTOM, SHOE, ACCESSORY) maximal ein ausgewähltes Item gleichzeitig speichern
5. WHEN die Auswahl sich ändert, THEN THE Frontend SHALL den Selection_State aktualisieren und im lokalen State speichern

### Requirement 3: Generate Button State Management

**User Story:** Als Benutzer möchte ich einen Generate Button sehen, der mir zeigt, wann ich genug Items ausgewählt habe, damit ich weiß, wann ich ein Try-On Bild erstellen kann.

#### Acceptance Criteria

1. THE Frontend SHALL einen Generate_Button in der oberen rechten Ecke der Seite anzeigen
2. WHEN keine Items ausgewählt sind, THEN THE Generate_Button SHALL ausgegraut und nicht klickbar sein
3. WHEN mindestens ein Item ausgewählt ist, THEN THE Generate_Button SHALL aktiv und klickbar sein
4. THE Frontend SHALL visuelles Feedback anzeigen, wie viele Items ausgewählt sind
5. WHEN der Benutzer über den deaktivierten Generate_Button hovert, THEN THE Frontend SHALL einen Tooltip anzeigen, dass mindestens ein Item ausgewählt werden muss

### Requirement 4: Try-On Image Generation Request

**User Story:** Als Benutzer möchte ich auf den Generate Button klicken können, damit ein KI-generiertes Bild erstellt wird, das zeigt, wie ich in den ausgewählten Kleidungsstücken aussehe.

#### Acceptance Criteria

1. WHEN der Benutzer auf den aktiven Generate_Button klickt, THEN THE Frontend SHALL eine Anfrage an das Backend mit dem Benutzerfoto und allen ausgewählten Items senden
2. THE Frontend SHALL während der Bildgenerierung einen Loading-Zustand anzeigen
3. WHEN die Bildgenerierung läuft, THEN THE Generate_Button SHALL deaktiviert sein, um Mehrfachanfragen zu verhindern
4. THE Frontend SHALL das Benutzerfoto (als Base64 oder File) und die Item-Daten (Bild-URLs, Beschreibungen) an das Backend übermitteln
5. WHEN ein Fehler während der Anfrage auftritt, THEN THE Frontend SHALL eine Fehlermeldung anzeigen und den Button wieder aktivieren

### Requirement 5: Backend API Endpoint

**User Story:** Als System möchte ich einen API-Endpoint bereitstellen, der Try-On Anfragen entgegennimmt und an den Try_On_Service weiterleitet, damit die Bildgenerierung orchestriert werden kann.

#### Acceptance Criteria

1. THE Backend SHALL einen POST-Endpoint `/api/try-on/generate` bereitstellen
2. WHEN eine Anfrage empfangen wird, THEN THE Backend SHALL die Authentifizierung des Benutzers validieren
3. THE Backend SHALL die Anfrage-Payload validieren und sicherstellen, dass mindestens ein Item vorhanden ist
4. WHEN die Validierung erfolgreich ist, THEN THE Backend SHALL die Anfrage an den Try_On_Service weiterleiten
5. THE Backend SHALL die Antwort vom Try_On_Service an das Frontend zurückgeben
6. WHEN der Try_On_Service einen Fehler zurückgibt, THEN THE Backend SHALL einen aussagekräftigen HTTP-Fehlercode und Fehlermeldung zurückgeben

### Requirement 6: Try-On Microservice Implementation

**User Story:** Als System möchte ich einen dedizierten Python-Microservice für die Bildbearbeitung haben, damit die OpenAI Image Edit API-Integration isoliert und skalierbar ist.

#### Acceptance Criteria

1. THE Try_On_Service SHALL als Docker-Container im python_engine Verzeichnis implementiert werden
2. THE Try_On_Service SHALL auf Port 8005 laufen und über den Gateway erreichbar sein
3. THE Try_On_Service SHALL einen POST-Endpoint `/generate` bereitstellen
4. WHEN eine Anfrage empfangen wird, THEN THE Try_On_Service SHALL das Benutzerfoto-URL und die Kleidungsstück-Bild-URLs verarbeiten
5. THE Try_On_Service SHALL den OPENAI_API_KEY aus den Umgebungsvariablen lesen
6. THE Try_On_Service SHALL die OpenAI Image Edit API (`images.edit`) mit Model `gpt-image-1` aufrufen
7. THE Try_On_Service SHALL ein Array von Bildern an die API senden (erstes Bild = Benutzerfoto, weitere Bilder = Kleidungsstücke)
8. THE Try_On_Service SHALL die Parameter `input_fidelity: "high"` und `quality: "low"` verwenden
9. WHEN die Bildbearbeitung erfolgreich ist, THEN THE Try_On_Service SHALL das bearbeitete Bild als Base64 (`b64_json`) zurückgeben
10. THE Try_On_Service SHALL Fehler von der OpenAI API abfangen und aussagekräftige Fehlermeldungen zurückgeben

### Requirement 7: Prompt Engineering for Image Editing

**User Story:** Als System möchte ich qualitativ hochwertige Prompts für die OpenAI Image Edit API erstellen, damit die bearbeiteten Bilder realistisch aussehen.

#### Acceptance Criteria

1. THE Try_On_Service SHALL für jedes ausgewählte Item die Beschreibung, Farbe und Kategorie extrahieren
2. THE Try_On_Service SHALL einen strukturierten Prompt erstellen, der beschreibt, wie die Kleidungsstücke auf die Person angewendet werden sollen
3. THE Prompt SHALL Anweisungen für realistische Anpassung enthalten (Schatten, Falten, Beleuchtung, natürliche Passform)
4. THE Prompt SHALL spezifische Details zu jedem Kleidungsstück enthalten (Farbe, Stil, Material)
5. THE Prompt SHALL Anweisungen für fotorealistische Qualität enthalten
6. THE Try_On_Service SHALL das Benutzerfoto und die Kleidungsstück-Bilder als Eingabe für die Image Edit API verwenden

### Requirement 8: Image Result Display

**User Story:** Als Benutzer möchte ich das generierte Try-On Bild sehen können, damit ich beurteilen kann, wie die Outfit-Kombination aussieht.

#### Acceptance Criteria

1. WHEN die Bildgenerierung erfolgreich abgeschlossen ist, THEN THE Frontend SHALL das generierte Bild in einem Modal oder einer dedizierten Ansicht anzeigen
2. THE Frontend SHALL die Möglichkeit bieten, das Bild herunterzuladen
3. THE Frontend SHALL die Möglichkeit bieten, das Modal zu schließen und zur Item-Auswahl zurückzukehren
4. THE Frontend SHALL die ausgewählten Items neben dem generierten Bild anzeigen
5. WHEN das Bild angezeigt wird, THEN THE Frontend SHALL die Auswahl beibehalten, damit der Benutzer Anpassungen vornehmen kann

### Requirement 9: Error Handling and User Feedback

**User Story:** Als Benutzer möchte ich klare Fehlermeldungen erhalten, wenn etwas schiefgeht, damit ich verstehe, was passiert ist und wie ich fortfahren kann.

#### Acceptance Criteria

1. WHEN die OpenAI API ein Rate-Limit zurückgibt, THEN THE System SHALL eine Meldung anzeigen, dass der Benutzer es später erneut versuchen soll
2. WHEN die OpenAI API einen Content-Policy-Fehler zurückgibt, THEN THE System SHALL eine Meldung anzeigen, dass die Kombination nicht generiert werden kann
3. WHEN ein Netzwerkfehler auftritt, THEN THE System SHALL eine Meldung anzeigen, dass die Verbindung fehlgeschlagen ist
4. WHEN die Bildgenerierung länger als 30 Sekunden dauert, THEN THE Frontend SHALL einen Hinweis anzeigen, dass die Generierung noch läuft
5. THE System SHALL alle Fehler loggen, um Debugging zu ermöglichen

### Requirement 10: Docker Integration

**User Story:** Als Entwickler möchte ich den Try_On_Service einfach in die bestehende Docker-Infrastruktur integrieren können, damit das Deployment konsistent ist.

#### Acceptance Criteria

1. THE Try_On_Service SHALL ein Dockerfile im Verzeichnis `python_engine/try_on_service/` haben
2. THE docker-compose.yml SHALL den Try_On_Service als neuen Service definieren
3. THE Try_On_Service SHALL die gleichen Umgebungsvariablen wie andere Services nutzen (.env Datei)
4. THE Try_On_Service SHALL über das interne Docker-Netzwerk mit dem Gateway kommunizieren
5. THE Gateway SHALL den Try_On_Service unter der URL `http://try_on_service:8005` erreichen können
6. THE Try_On_Service SHALL Health-Check-Endpoints bereitstellen für Container-Monitoring

### Requirement 11: API Response Format

**User Story:** Als Entwickler möchte ich ein konsistentes API-Response-Format haben, damit die Frontend-Integration einfach und vorhersehbar ist.

#### Acceptance Criteria

1. THE Backend SHALL bei erfolgreicher Generierung ein JSON-Objekt mit `imageBase64` und `metadata` zurückgeben
2. THE Backend SHALL bei Fehlern ein JSON-Objekt mit `error` und `message` zurückgeben
3. THE Try_On_Service SHALL bei erfolgreicher Generierung ein JSON-Objekt mit `image_base64` zurückgeben
4. THE Try_On_Service SHALL bei Fehlern ein JSON-Objekt mit `error` und `details` zurückgeben
5. THE Backend SHALL HTTP-Statuscodes korrekt verwenden (200 für Erfolg, 400 für Client-Fehler, 500 für Server-Fehler)
