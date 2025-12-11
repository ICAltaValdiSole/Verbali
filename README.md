# 📝 Generatore Verbali

**Generatore Verbali** è un'applicazione web responsive e *client-side* progettata per semplificare la redazione e la stampa PDF dei verbali scolastici (Consigli di Classe, Dipartimenti e Riunioni generiche).

L'applicazione funziona interamente nel browser, salvando i dati automaticamente nella memoria locale del dispositivo, senza necessità di database o server complessi.

---

## ✨ Funzionalità Principali

* **3 Modalità di Verbale:**
    * 🎓 **Consiglio di Classe:** Include gestione genitori e docenti.
    * 📚 **Dipartimento:** Ottimizzato per soli docenti con tabella firme specifica.
    * ✏️ **Verbale Libero:** Completamente modulare, permette di accendere/spegnere sezioni e creare una struttura personalizzata.
* **Editor di Testo Avanzato (Word-Style):** Formattazione testo (grassetto, corsivo, sottolineato), colori, elenchi puntati e allineamento.
* **Sezioni Personalizzate:** Possibilità di aggiungere blocchi dinamici come:
    * *Testo Libero* (con editor).
    * *Piano d'Azione* (liste con descrizione ed esito).
    * *Griglia Dati* (tabelle reali con colonne e righe aggiungibili).
* **Gestione Intelligente dei Dati:**
    * Salvataggio automatico in tempo reale (LocalStorage).
    * Campi nascondibili (clicca sulla "X" rossa).
    * Etichette rinominabili (clicca sull'icona matita o sul testo).
* **Stampa PDF Perfetta:**
    * Generazione PDF A4 con intestazione istituzionale.
    * Gestione automatica dei salti pagina.
    * Rendering fedele della formattazione (HTML2Canvas + jsPDF).
* **Mobile Friendly:** Interfaccia ottimizzata per smartphone e tablet.

---

## 📂 Struttura dei File

Il progetto è composto da soli file statici:

```text
/ (root)
├── index.html      # La struttura della pagina e i modali
├── script.js       # Tutta la logica, salvataggio e generazione PDF
├── config.js       # Configurazione dati scuola e logo
├── logo.png        # Il logo della scuola (deve essere locale per il PDF)
├── favicon.png     # Il favicon del sito
└── README.md       # Questo file
