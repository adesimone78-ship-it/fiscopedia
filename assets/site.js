/* ─── Shared site behaviors ─────────────────────────────────────────── */

// Mobile nav toggle
document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.querySelector(".nav-mobile-toggle");
  const links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", () => links.classList.toggle("open"));
  }

  // Cookie banner
  const banner = document.getElementById("cookie-banner");
  if (banner) {
    if (localStorage.getItem("fp_cookie_choice")) {
      banner.classList.add("hidden");
    } else {
      banner.classList.remove("hidden");
    }
    banner.querySelectorAll("[data-cookie]").forEach(btn => {
      btn.addEventListener("click", () => {
        localStorage.setItem("fp_cookie_choice", btn.dataset.cookie);
        banner.classList.add("hidden");
        // Caricamento AdSense solo dopo consenso "accept"
        if (btn.dataset.cookie === "accept") {
          loadAdSense();
        }
      });
    });
    // Se già accettato, carica adsense
    if (localStorage.getItem("fp_cookie_choice") === "accept") loadAdSense();
  }
});

function loadAdSense() {
  // In produzione: sostituire ca-pub-1145255592067202 con il proprio Publisher ID
  if (document.getElementById("adsense-script")) return;
  const s = document.createElement("script");
  s.id = "adsense-script";
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1145255592067202";
  // s.setAttribute("data-ad-client", "ca-pub-1145255592067202");
  document.head.appendChild(s);
  // Inietta gli ads
  document.querySelectorAll(".ad-slot ins.adsbygoogle").forEach(() => {
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
  });
}
