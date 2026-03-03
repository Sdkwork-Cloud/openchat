import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import "./index.css";
import "./i18n";

const SW_CLEANUP_RELOAD_FLAG = "openchat-sw-cleanup-reload-v1";

function normalizeSecurityMetaTags() {
  const httpEquivMetaTags = document.querySelectorAll<HTMLMetaElement>("meta[http-equiv]");

  httpEquivMetaTags.forEach((metaTag) => {
    const httpEquiv = metaTag.getAttribute("http-equiv")?.trim().toLowerCase();
    if (!httpEquiv) {
      return;
    }

    if (httpEquiv === "x-frame-options") {
      // This directive is only valid as an HTTP response header.
      metaTag.remove();
      return;
    }

    if (httpEquiv !== "content-security-policy") {
      return;
    }

    const currentPolicy = metaTag.getAttribute("content");
    if (!currentPolicy) {
      return;
    }

    const nextDirectives = currentPolicy
      .split(";")
      .map((directive) => directive.trim())
      .filter(Boolean)
      .filter((directive) => !directive.toLowerCase().startsWith("frame-ancestors"));

    if (nextDirectives.length === 0) {
      metaTag.remove();
      return;
    }

    metaTag.setAttribute("content", `${nextDirectives.join("; ")};`);
  });
}

async function cleanupLegacyServiceWorkers(): Promise<boolean> {
  if (!import.meta.env.DEV) {
    return false;
  }

  if (!("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length === 0) {
      return false;
    }

    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((key) => key.startsWith("openchat-"))
          .map((key) => caches.delete(key)),
      );
    }

    const shouldReload =
      Boolean(navigator.serviceWorker.controller) &&
      typeof sessionStorage !== "undefined" &&
      !sessionStorage.getItem(SW_CLEANUP_RELOAD_FLAG);

    if (shouldReload) {
      sessionStorage.setItem(SW_CLEANUP_RELOAD_FLAG, "1");
      window.location.reload();
      return true;
    }
  } catch (error) {
    console.warn("[bootstrap] Failed to cleanup legacy service workers:", error);
  }

  return false;
}

function renderApp() {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

async function bootstrap() {
  normalizeSecurityMetaTags();
  const reloading = await cleanupLegacyServiceWorkers();
  if (reloading) {
    return;
  }
  renderApp();
}

void bootstrap();
