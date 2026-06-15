/* ─── FiscoPedia.it — Engine fiscale 2026 ──────────────────────────
 *  Calcolo RAL → Netto secondo:
 *  · IRPEF 2026: scaglioni 23% / 35% / 43%
 *  · Detrazione lavoro dipendente: decrescente
 *  · INPS lavoratore: 9,19% (dipendente) / 5,84% (apprendista)
 *  · INPS datore: 28,03% (dipendente) / 11,50% (apprendista agevolato)
 *  · Addizionale regionale: tabella 20 regioni
 *  · TFR: 6,91%
 *  · Forfettario: coeff. ATECO + imposta sostitutiva 5% / 15%
 *
 *  Tutti i numeri sono indicativi a uso simulazione. Per la busta paga
 *  ufficiale fare riferimento a CAF o consulente del lavoro.
 * ────────────────────────────────────────────────────────────────────── */

(function (global) {
  "use strict";

  // ─── Addizionale regionale (aliquote medie 2026, %) ──────────────────
  // Fonte: delibere regionali vigenti 2026 (aggiornare ogni gennaio)
  const ADDIZIONALE_REGIONALE = {
    "Abruzzo":               1.73,
    "Basilicata":            1.23,
    "Calabria":              2.30,
    "Campania":              2.20,
    "Emilia-Romagna":        1.33,
    "Friuli-Venezia Giulia": 1.23,
    "Lazio":                 1.73,
    "Liguria":               1.23,
    "Lombardia":             1.23,
    "Marche":                1.50,
    "Molise":                2.16,
    "Piemonte":              1.73,
    "Puglia":                1.23,
    "Sardegna":              1.23,
    "Sicilia":               1.23,
    "Toscana":               1.43,
    "Trentino-Alto Adige":   1.23,
    "Umbria":                1.53,
    "Valle d'Aosta":         1.23,
    "Veneto":                1.23,
  };

  // ─── Coefficienti redditività regime forfettario ─────────────────────
  const COEFF_FORFETTARI = {
    "Professionisti":              78,
    "Informatica / IT":            78,
    "Attività creative":           67,
    "Salute / Benessere":          78,
    "Istruzione / Formazione":     78,
    "Commercio al dettaglio":      40,
    "Commercio all'ingrosso":      40,
    "Artigiani e altre attività":  67,
    "Costruzioni":                 86,
    "Intermediari del commercio":  62,
    "Servizi (ristoranti, bar)":   40,
    "Altre attività":              67,
  };

  // ─── IRPEF 2026 ──────────────────────────────────────────────────────
  function calcIrpef(imponibile) {
    let imposta = 0;
    if (imponibile <= 28000) {
      imposta = imponibile * 0.23;
    } else if (imponibile <= 50000) {
      imposta = 28000 * 0.23 + (imponibile - 28000) * 0.35;
    } else {
      imposta = 28000 * 0.23 + 22000 * 0.35 + (imponibile - 50000) * 0.43;
    }
    return Math.max(0, imposta);
  }

  // Detrazione lavoro dipendente (semplificata, riforma 2024-2026)
  function calcDetrazione(imponibile) {
    if (imponibile <= 8500) return 1955;
    if (imponibile <= 15000) return 1955;
    if (imponibile <= 28000) {
      // decrescente linearmente da 1.910 a 1.190 tra 15.000 e 28.000
      return 1910 - ((imponibile - 15000) / 13000) * 720;
    }
    if (imponibile <= 50000) {
      // da 1.190 a 0 tra 28.000 e 50.000
      return 1190 * (1 - (imponibile - 28000) / 22000);
    }
    return 0;
  }

  // ─── Calcolo principale dipendente ───────────────────────────────────
  function calcSalary(opts) {
    const ral         = Number(opts.ral) || 0;
    const bonus       = Number(opts.bonus) || 0;
    const regione     = opts.regione || "Lombardia";
    const tipo        = opts.tipoContratto || "dipendente";  // dipendente | apprendista | forfettario
    const mensilita   = Number(opts.mensilita) || 13;

    const lordo = ral + bonus;

    let aliquotaInps = 0.0919;
    if (tipo === "apprendista") aliquotaInps = 0.0584;

    const inpsLavoratore = lordo * aliquotaInps;
    const imponibileIrpef = lordo - inpsLavoratore;

    const irpefLorda = calcIrpef(imponibileIrpef);
    const detrazione = calcDetrazione(imponibileIrpef);
    const irpefNetta = Math.max(0, irpefLorda - detrazione);

    const aliquotaAdd = (ADDIZIONALE_REGIONALE[regione] || 1.73) / 100;
    const addizionaleRegionale = imponibileIrpef * aliquotaAdd;
    // Addizionale comunale media stimata 0,80%
    const addizionaleComunale = imponibileIrpef * 0.008;

    const totaleImposte = irpefNetta + addizionaleRegionale + addizionaleComunale;
    const nettoAnnuo = lordo - inpsLavoratore - totaleImposte;
    const nettoMensile = nettoAnnuo / mensilita;

    // Costi azienda
    const aliquotaInpsDatore = tipo === "apprendista" ? 0.115 : 0.2953;
    const inpsDatore = lordo * aliquotaInpsDatore;
    const tfr = lordo / 13.5;  // formula legale: lordo / 13,5
    const costoAzienda = lordo + inpsDatore + tfr;

    const aliquotaEffettiva = lordo > 0 ? ((lordo - nettoAnnuo) / lordo) : 0;

    return {
      lordo,
      inpsLavoratore,
      imponibileIrpef,
      irpefLorda,
      detrazioneLavoro: detrazione,
      irpefNetta,
      addizionaleRegionale,
      addizionaleComunale,
      totaleImposte,
      nettoAnnuo,
      nettoMensile,
      inpsDatore,
      tfr,
      costoAzienda,
      aliquotaEffettiva,
    };
  }

  // ─── Forfettario ─────────────────────────────────────────────────────
  function calcForfettario(opts) {
    const fatturato = Number(opts.fatturato) || 0;
    const categoria = opts.categoria || "Professionisti";
    const aliquota  = Number(opts.aliquota) || 15;   // 5 o 15
    const coeff = (COEFF_FORFETTARI[categoria] || 78) / 100;

    const imponibile = fatturato * coeff;
    const inps = imponibile * 0.2607;            // gestione separata
    const imponibileDopoInps = Math.max(0, imponibile - inps);
    const imposta = imponibileDopoInps * (aliquota / 100);
    const netto = fatturato - inps - imposta;
    const nettoMensile = netto / 12;

    return {
      fatturato, coeff, imponibile, inps, imponibileDopoInps,
      imposta, aliquota, netto, nettoMensile,
    };
  }

  // ─── Formattatori ────────────────────────────────────────────────────
  const fmtEuro = new Intl.NumberFormat("it-IT", {
    style: "currency", currency: "EUR", maximumFractionDigits: 0,
  });
  function formatEuro(n) { return fmtEuro.format(Math.round(n || 0)); }
  function formatEuro2(n) {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n || 0);
  }
  function formatPct(n) { return ((n || 0) * 100).toFixed(1).replace(".", ",") + "%"; }

  // ─── Export ──────────────────────────────────────────────────────────
  global.SalaryEngine = {
    calcSalary,
    calcForfettario,
    calcIrpef,
    calcDetrazione,
    ADDIZIONALE_REGIONALE,
    COEFF_FORFETTARI,
    formatEuro,
    formatEuro2,
    formatPct,
  };
})(window);
