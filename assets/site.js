/* ─── Shared site behaviors ─────────────────────────────────────────── */

// Mobile nav toggle
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-mobile-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
  }

  // Annunci AdSense: lo script è caricato nel <head> di ogni pagina.
  // Il consenso cookie è gestito dal messaggio GDPR di Google (Privacy e messaggi
  // di AdSense, piattaforma certificata IAB TCF), che si attiva automaticamente.
  document.querySelectorAll(".ad-slot ins.adsbygoogle").forEach(() => {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
  });

  // Link "Modifica preferenze cookie" (Cookie Policy): riapre il messaggio di consenso di Google
  document.querySelectorAll("[data-cookie-settings]").forEach(el => {
    el.addEventListener("click", e => {
      e.preventDefault();
      window.googlefc = window.googlefc || {};
      window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
      window.googlefc.callbackQueue.push(() => window.googlefc.showRevocationMessage());
    });
  });
});

