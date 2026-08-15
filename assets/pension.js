/*
 * pension.js — Motore di calcolo pensione contributiva INPS (simulatore indicativo)
 * FiscoPedia.it — assets/pension.js
 *
 * METODOLOGIA (sistema contributivo):
 * 1. Montante contributivo storico = anni di contributi già versati × RAL attuale
 *    corretta con un fattore 0,67 (approssima una RAL storica mediamente inferiore
 *    a quella attuale) × aliquota IVS 33%.
 * 2. Montante contributivo futuro = somma dei contributi (RAL proiettata con
 *    crescita 1,5%/anno × 33%) per ogni anno restante fino al pensionamento.
 * 3. Pensione annua lorda = montante totale × coefficiente di trasformazione
 *    corrispondente all'età di pensionamento.
 *
 * Coefficienti di trasformazione: tabella ufficiale INPS 2025-2026 (decreto
 * 20 novembre 2024). Valori noti da fonte ufficiale per le età 57, 60, 63, 65,
 * 67, 70, 71; le età intermedie sono interpolate linearmente tra i punti noti
 * (differenza trascurabile ai fini di un simulatore indicativo).
 *
 * NOTA: questo è un simulatore semplificato a scopo informativo. Non sostituisce
 * un calcolo ufficiale INPS (che tiene conto di rivalutazione reale del montante
 * su base PIL, periodi non continuativi, riscatti, ricongiunzioni, ecc.).
 */

(function (global) {
  'use strict';

  const ALIQUOTA_IVS = 0.33;
  const FATTORE_STORICO = 0.67;
  const CRESCITA_RAL_ANNUA = 0.015;

  // Coefficienti di trasformazione 2025-2026 (%), noti da fonte INPS ufficiale
  // per 57, 60, 63, 65, 67, 70, 71 — interpolati linearmente per le età intermedie.
  const COEFFICIENTI_NOTI = {
    57: 4.204,
    60: 4.647,
    63: 5.098,
    65: 5.415,
    67: 5.608,
    70: 6.320,
    71: 6.510
  };

  function coefficienteTrasformazione(eta) {
    const etaClamped = Math.max(57, Math.min(71, Math.round(eta)));
    if (COEFFICIENTI_NOTI[etaClamped] !== undefined) return COEFFICIENTI_NOTI[etaClamped];

    const etaNote = Object.keys(COEFFICIENTI_NOTI).map(Number).sort((a, b) => a - b);
    let inf = etaNote[0], sup = etaNote[etaNote.length - 1];
    for (let i = 0; i < etaNote.length - 1; i++) {
      if (etaClamped >= etaNote[i] && etaClamped <= etaNote[i + 1]) {
        inf = etaNote[i];
        sup = etaNote[i + 1];
        break;
      }
    }
    const cInf = COEFFICIENTI_NOTI[inf];
    const cSup = COEFFICIENTI_NOTI[sup];
    const frazione = (etaClamped - inf) / (sup - inf);
    return cInf + (cSup - cInf) * frazione;
  }

  /**
   * Calcola il montante contributivo stimato a una certa età di pensionamento.
   * @param {number} ralAttuale - RAL lorda annua attuale (€)
   * @param {number} etaAttuale
   * @param {number} anniContributiVersati - anni di contributi già versati fino ad oggi
   * @param {number} etaPensionamento - età target di uscita
   * @returns {{montanteStorico:number, montanteFuturo:number, montanteTotale:number, anniAlPensionamento:number}}
   */
  function calcolaMontante(ralAttuale, etaAttuale, anniContributiVersati, etaPensionamento) {
    const anniAlPensionamento = Math.max(0, etaPensionamento - etaAttuale);

    // Contributi già versati: nessuna ulteriore capitalizzazione oltre al fattore storico,
    // approssimazione lineare volutamente semplice per un simulatore indicativo.
    const montanteStorico = anniContributiVersati * ralAttuale * FATTORE_STORICO * ALIQUOTA_IVS;

    // Contributi futuri: RAL proiettata con crescita annua composta, sommata anno per anno.
    let sommaCrescita = 0;
    for (let i = 1; i <= anniAlPensionamento; i++) {
      sommaCrescita += Math.pow(1 + CRESCITA_RAL_ANNUA, i);
    }
    const montanteFuturo = ALIQUOTA_IVS * ralAttuale * sommaCrescita;

    const montanteTotale = montanteStorico + montanteFuturo;

    return { montanteStorico, montanteFuturo, montanteTotale, anniAlPensionamento };
  }

  /**
   * Calcola la pensione annua lorda stimata dato un montante e un'età di pensionamento.
   */
  function calcolaPensione(montanteTotale, etaPensionamento) {
    const coefficiente = coefficienteTrasformazione(etaPensionamento);
    const pensioneAnnuaLorda = montanteTotale * (coefficiente / 100);
    return { coefficiente, pensioneAnnuaLorda, pensioneMensileLorda: pensioneAnnuaLorda / 13 };
  }

  /**
   * Calcola i requisiti e gli scenari di pensionamento (anticipata, quota 103, vecchiaia)
   * @param {Object} input
   * @param {number} input.ralAttuale
   * @param {number} input.etaAttuale
   * @param {number} input.anniContributiVersati
   * @param {'M'|'F'} input.sesso
   */
  function calcolaScenari(input) {
    const { ralAttuale, etaAttuale, anniContributiVersati, sesso } = input;

    const risultati = {};

    // --- Pensione anticipata: 42 anni e 10 mesi (uomini) / 41 anni e 10 mesi (donne) di contributi,
    // indipendentemente dall'età anagrafica.
    const sogliaContributiAnticipata = sesso === 'F' ? 41 + 10 / 12 : 42 + 10 / 12;
    const anniMancantiAnticipata = Math.max(0, sogliaContributiAnticipata - anniContributiVersati);
    const etaAnticipata = etaAttuale + anniMancantiAnticipata;
    if (etaAnticipata <= 75) {
      const anniContributiAnticipata = anniContributiVersati + anniMancantiAnticipata;
      const m = calcolaMontante(ralAttuale, etaAttuale, anniContributiVersati, etaAnticipata);
      const p = calcolaPensione(m.montanteTotale, etaAnticipata);
      risultati.anticipata = {
        raggiungibile: true,
        eta: etaAnticipata,
        anniContributi: anniContributiAnticipata,
        ...m,
        ...p
      };
    } else {
      risultati.anticipata = { raggiungibile: false };
    }

    // --- Quota 103: 62 anni di età + 41 anni di contributi (entrambi i requisiti)
    const anniMancantiContributi103 = Math.max(0, 41 - anniContributiVersati);
    const etaRaggiungeContributi103 = etaAttuale + anniMancantiContributi103;
    const etaQuota103 = Math.max(62, etaRaggiungeContributi103);
    if (etaQuota103 <= 75) {
      const anniContributiQuota103 = anniContributiVersati + (etaQuota103 - etaAttuale);
      const m = calcolaMontante(ralAttuale, etaAttuale, anniContributiVersati, etaQuota103);
      const p = calcolaPensione(m.montanteTotale, etaQuota103);
      risultati.quota103 = {
        raggiungibile: anniContributiQuota103 >= 41 && etaQuota103 >= 62,
        eta: etaQuota103,
        anniContributi: anniContributiQuota103,
        ...m,
        ...p
      };
    } else {
      risultati.quota103 = { raggiungibile: false };
    }

    // --- Pensione di vecchiaia: 67 anni + almeno 20 anni di contributi
    const etaVecchiaia = 67;
    const anniContributiVecchiaia = anniContributiVersati + Math.max(0, etaVecchiaia - etaAttuale);
    {
      const m = calcolaMontante(ralAttuale, etaAttuale, anniContributiVersati, etaVecchiaia);
      const p = calcolaPensione(m.montanteTotale, etaVecchiaia);
      risultati.vecchiaia = {
        raggiungibile: anniContributiVecchiaia >= 20,
        eta: etaVecchiaia,
        anniContributi: anniContributiVecchiaia,
        ...m,
        ...p
      };
    }

    return risultati;
  }

  global.PensionCalc = {
    coefficienteTrasformazione,
    calcolaMontante,
    calcolaPensione,
    calcolaScenari
  };

})(window);
