/* ─── FiscoPedia.it — Engine fiscale 2026 ──────────────────────────
 *  Calcolo RAL → Netto secondo:
 *  · IRPEF 2026: scaglioni 23% / 33% / 43% (corretto 7/9/2026: 2° scaglione era 35%, sceso al 33% dal 1/1/2026 con L. 199/2025)
 *  · Detrazione lavoro dipendente art. 13 TUIR: 1.955 fino a 15.000;
 *    1.910 + 1.190×(28.000−R)/13.000 fino a 28.000; 1.910×(50.000−R)/22.000
 *    fino a 50.000; +65 € tra 25.000 e 35.000 (corretto 15/10/2026)
 *  · Cuneo fiscale (L. 207/2024, c. 4-9): somma esente 7,1/5,3/4,8% fino a
 *    20.000; ulteriore detrazione 1.000 € tra 20.000 e 32.000, decrescente a 40.000
 *  · INPS lavoratore: 9,19% (dipendente) / 5,84% (apprendista)
 *  · INPS datore: 29,53% (dipendente) / 11,50% (apprendista agevolato)
 *  · Addizionale regionale 2026: scaglioni e regole di ogni regione (fonte MEF, verificate 20/10/2026)
 *  · TFR: 6,91%
 *  · Forfettario: coeff. ATECO + imposta sostitutiva 5% / 15%
 *
 *  Tutti i numeri sono indicativi a uso simulazione. Per la busta paga
 *  ufficiale fare riferimento a CAF o consulente del lavoro.
 * ────────────────────────────────────────────────────────────────────── */

(function (global) {
  "use strict";

  // ─── Addizionale regionale IRPEF 2026 ────────────────────────────────
  // Fonte: Dipartimento delle Finanze (MEF), "Addizionale regionale all'Irpef",
  // aliquote per l'anno d'imposta 2026 pubblicate tra gennaio e giugno 2026
  // (Molise 19/6/2026, Puglia 29/5/2026). Verificate il 20/10/2026.
  // Aliquote in % per scaglione, applicate in modo progressivo come l'IRPEF
  // (fino a 15.000 / fino a 28.000 / fino a 50.000 / oltre), salvo le regole
  // particolari indicate in "speciale". Base: reddito imponibile IRPEF.
  // Non sono calcolate le detrazioni regionali per figli o disabilità.
  const S4 = [15000, 28000, 50000, Infinity];
  const ADDIZIONALE_REGIONALE = {
    "Abruzzo":               { aliquote: [1.67, 1.67, 2.87, 3.33] },
    "Basilicata":            { aliquote: [1.23, 1.23, 1.23, 1.23] },
    "Bolzano (prov. aut.)":  { aliquote: [1.23, 1.23, 1.23, 1.73], speciale: "bolzano" },
    "Calabria":              { aliquote: [1.73, 1.73, 1.73, 1.73] },
    "Campania":              { aliquote: [1.73, 2.96, 3.20, 3.33] },
    "Emilia-Romagna":        { aliquote: [1.33, 1.93, 2.78, 3.33] },
    "Friuli-Venezia Giulia": { aliquote: [1.23, 1.23, 1.23, 1.23], speciale: "fvg" },
    "Lazio":                 { aliquote: [1.73, 3.33, 3.33, 3.33], speciale: "lazio" },
    "Liguria":               { aliquote: [1.23, 1.23, 3.18, 3.23] },
    "Lombardia":             { aliquote: [1.23, 1.58, 1.72, 1.73] },
    "Marche":                { aliquote: [1.23, 1.53, 1.70, 1.73] },
    "Molise":                { aliquote: [2.03, 2.23, 3.63, 3.63] },
    "Piemonte":              { aliquote: [1.62, 2.68, 3.31, 3.33] },
    "Puglia":                { aliquote: [1.33, 2.13, 3.23, 3.33] },
    "Sardegna":              { aliquote: [1.23, 1.23, 1.23, 1.23] },
    "Sicilia":               { aliquote: [1.23, 1.23, 1.23, 1.23] },
    "Toscana":               { aliquote: [1.42, 1.43, 3.32, 3.33] },
    "Trento (prov. aut.)":   { aliquote: [1.23, 1.23, 1.23, 1.73], speciale: "trento" },
    "Umbria":                { aliquote: [1.73, 3.02, 3.12, 3.33], speciale: "umbria" },
    "Valle d'Aosta":         { aliquote: [1.23, 1.23, 1.23, 1.23], speciale: "vda" },
    "Veneto":                { aliquote: [1.23, 1.23, 1.23, 1.23] },
  };

  function progressiva(R, aliquote) {
    let imposta = 0, prev = 0;
    for (let i = 0; i < S4.length && R > prev; i++) {
      imposta += (Math.min(R, S4[i]) - prev) * aliquote[i] / 100;
      prev = S4[i];
    }
    return imposta;
  }

  function calcAddizionaleRegionale(R, regione) {
    const cfg = ADDIZIONALE_REGIONALE[regione] || ADDIZIONALE_REGIONALE["Lombardia"];
    if (R <= 0) return 0;
    switch (cfg.speciale) {
      case "fvg":    // aliquota sull'intero imponibile: 0,70% fino a 15.000, poi 1,23%
        return R * (R <= 15000 ? 0.0070 : 0.0123);
      case "vda":    // esenti fino a 15.000, poi 1,23% sull'intero imponibile
        return R <= 15000 ? 0 : R * 0.0123;
      case "lazio":  // fino a 28.000: 1,73% sull'intero; 28.001-30.000: detrazione 60 €
        if (R <= 28000) return R * 0.0173;
        return Math.max(0, progressiva(R, cfg.aliquote) - (R <= 30000 ? 60 : 0));
      case "umbria": // fino a 28.000 niente maggiorazioni (1,23%); 28.001-50.000: detrazione 150 €
        if (R <= 28000) return R * 0.0123;
        return Math.max(0, progressiva(R, cfg.aliquote) - (R <= 50000 ? 150 : 0));
      case "trento": // fino a 30.000 deduzione di 30.000 €: addizionale azzerata
        return R <= 30000 ? 0 : progressiva(R, cfg.aliquote);
      case "bolzano": { // detrazione 430,50 € fino a 90.000; oltre 50.000 fino a 125 € in più
        let detr = R <= 90000 ? 430.5 : 0;
        if (R > 50000) detr += 125 * Math.min(1, (R - 50000) / 25000);
        return Math.max(0, progressiva(R, cfg.aliquote) - detr);
      }
      default:
        return progressiva(R, cfg.aliquote);
    }
  }

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
      imposta = 28000 * 0.23 + (imponibile - 28000) * 0.33;
    } else {
      imposta = 28000 * 0.23 + 22000 * 0.33 + (imponibile - 50000) * 0.43;
    }
    return Math.max(0, imposta);
  }

  // Detrazione lavoro dipendente (art. 13 TUIR, in vigore 2026)
  function calcDetrazione(reddito) {
    let d = 0;
    if (reddito <= 15000) d = 1955;
    else if (reddito <= 28000) d = 1910 + 1190 * (28000 - reddito) / 13000;
    else if (reddito <= 50000) d = 1910 * (50000 - reddito) / 22000;
    if (reddito > 25000 && reddito <= 35000) d += 65;
    return d;
  }

  // Cuneo fiscale: somma esente (L. 207/2024, c. 4) — non concorre al reddito
  function calcSommaEsente(reddito) {
    if (reddito <= 0 || reddito > 20000) return 0;
    if (reddito <= 8500) return reddito * 0.071;
    if (reddito <= 15000) return reddito * 0.053;
    return reddito * 0.048;
  }

  // Cuneo fiscale: ulteriore detrazione (L. 207/2024, c. 6)
  function calcUlterioreDetrazione(reddito) {
    if (reddito <= 20000 || reddito > 40000) return 0;
    if (reddito <= 32000) return 1000;
    return 1000 * (40000 - reddito) / 8000;
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
    const ulterioreDetrazione = calcUlterioreDetrazione(imponibileIrpef);
    const irpefNetta = Math.max(0, irpefLorda - detrazione - ulterioreDetrazione);
    // Somma esente cuneo fiscale: si aggiunge al netto, senza IRPEF né addizionali
    const sommaEsente = calcSommaEsente(imponibileIrpef);

    // Le addizionali sono dovute solo se, dopo le detrazioni, resta IRPEF da pagare
    const dovuteAddizionali = irpefNetta > 0;
    const addizionaleRegionale = dovuteAddizionali ? calcAddizionaleRegionale(imponibileIrpef, regione) : 0;
    // Addizionale comunale media stimata 0,80%
    const addizionaleComunale = dovuteAddizionali ? imponibileIrpef * 0.008 : 0;

    const totaleImposte = irpefNetta + addizionaleRegionale + addizionaleComunale;
    const nettoAnnuo = lordo - inpsLavoratore - totaleImposte + sommaEsente;
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
      ulterioreDetrazione,
      sommaEsente,
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
    calcSommaEsente,
    calcUlterioreDetrazione,
    ADDIZIONALE_REGIONALE,
    calcAddizionaleRegionale,
    COEFF_FORFETTARI,
    formatEuro,
    formatEuro2,
    formatPct,
  };
})(window);
