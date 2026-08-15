/*
 * tfr.js — Motore di calcolo TFR (Trattamento di Fine Rapporto)
 * FiscoPedia.it — assets/tfr.js
 *
 * METODOLOGIA:
 * 1. Ogni anno si accantona una quota pari a RAL lorda annua / 13,5.
 * 2. Al 31/12 di ogni anno (esclusa la quota dell'anno in corso, che non ha
 *    ancora maturato un anno pieno) il TFR accumulato si rivaluta al tasso
 *    di legge: 1,5% fisso + 75% dell'inflazione ISTAT (indice FOI).
 * 3. Il TFR netto si ottiene applicando la tassazione separata: per
 *    semplificazione, questo simulatore calcola un'aliquota media IRPEF sul
 *    reddito annuo attuale (RAL) usando gli scaglioni 2026 (23% / 33% / 43%)
 *    e la applica al TFR lordo totale.
 *
 * NOTA IMPORTANTE: la tassazione reale del TFR è più complessa — si basa sul
 * reddito di riferimento medio degli ultimi 5 anni (non solo l'ultimo) e su
 * un meccanismo di riliquidazione da parte dell'Agenzia delle Entrate.
 * Questo calcolatore fornisce una stima indicativa dell'aliquota media, non
 * il valore esatto che risulterà in busta paga/CU.
 */

(function (global) {
  'use strict';

  const DIVISORE_TFR = 13.5;
  const RIVALUTAZIONE_FISSA = 0.015;
  const QUOTA_INFLAZIONE_RIVALUTAZIONE = 0.75;

  // Scaglioni IRPEF 2026 (corretti: 23% / 33% / 43% — NON 35% sul secondo scaglione)
  const SCAGLIONI_IRPEF = [
    { fino: 28000, aliquota: 0.23 },
    { fino: 50000, aliquota: 0.33 },
    { fino: Infinity, aliquota: 0.43 }
  ];

  function calcolaImpostaIrpef(redditoImponibile) {
    let imposta = 0;
    let sogliaPrec = 0;
    for (const scaglione of SCAGLIONI_IRPEF) {
      if (redditoImponibile > sogliaPrec) {
        const imponibileScaglione = Math.min(redditoImponibile, scaglione.fino) - sogliaPrec;
        imposta += imponibileScaglione * scaglione.aliquota;
        sogliaPrec = scaglione.fino;
      } else {
        break;
      }
    }
    return imposta;
  }

  function aliquotaMediaStimata(redditoAnnuo) {
    if (redditoAnnuo <= 0) return 0;
    const imposta = calcolaImpostaIrpef(redditoAnnuo);
    return imposta / redditoAnnuo;
  }

  /**
   * Calcola il TFR maturato nel tempo.
   * @param {Object} input
   * @param {number} input.ralAnnua - RAL lorda annua attuale (€)
   * @param {number} input.anniServizio - anni di anzianità di servizio (può avere decimali)
   * @param {number} input.inflazioneMediaAttesa - tasso di inflazione medio atteso annuo, in % (es. 2 per 2%)
   * @param {number} [input.crescitaRalAnnua] - crescita attesa della RAL nel tempo, in % (default 0)
   */
  function calcolaTFR(input) {
    const ralAnnua = input.ralAnnua;
    const anniInteri = Math.floor(input.anniServizio);
    const frazioneUltimoAnno = input.anniServizio - anniInteri;
    const inflazione = (input.inflazioneMediaAttesa || 0) / 100;
    const crescitaRal = (input.crescitaRalAnnua || 0) / 100;
    const tassoRivalutazione = RIVALUTAZIONE_FISSA + QUOTA_INFLAZIONE_RIVALUTAZIONE * inflazione;

    let tfrAccumulato = 0;
    let ralCorrente = ralAnnua;
    const dettaglioAnni = [];

    // Anni pieni di servizio
    for (let anno = 1; anno <= anniInteri; anno++) {
      // Rivalutazione del monte accumulato fino all'anno precedente (non si applica al primo anno)
      if (anno > 1) {
        tfrAccumulato = tfrAccumulato * (1 + tassoRivalutazione);
      }
      const quotaAnno = ralCorrente / DIVISORE_TFR;
      tfrAccumulato += quotaAnno;
      dettaglioAnni.push({ anno, ral: ralCorrente, quota: quotaAnno, totaleFineAnno: tfrAccumulato });
      ralCorrente = ralCorrente * (1 + crescitaRal);
    }

    // Frazione di anno residua (se anniServizio non è un intero), proporzionale, senza rivalutazione
    if (frazioneUltimoAnno > 0) {
      const quotaParziale = (ralCorrente / DIVISORE_TFR) * frazioneUltimoAnno;
      tfrAccumulato += quotaParziale;
    }

    const tfrLordo = tfrAccumulato;
    const aliquotaMedia = aliquotaMediaStimata(ralAnnua);
    const tfrNettoStimato = tfrLordo * (1 - aliquotaMedia);

    return {
      tfrLordo,
      tfrNettoStimato,
      aliquotaMediaStimata: aliquotaMedia,
      tassoRivalutazioneApplicato: tassoRivalutazione,
      dettaglioAnni
    };
  }

  global.TfrCalc = {
    calcolaTFR,
    calcolaImpostaIrpef,
    aliquotaMediaStimata
  };

})(window);
