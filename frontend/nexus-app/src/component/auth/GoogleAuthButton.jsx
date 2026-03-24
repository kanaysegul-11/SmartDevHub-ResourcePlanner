"use client";

import React, { useEffect, useRef, useState } from "react";
import { apiClient } from "../../refine/axios";
import { useI18n } from "../../I18nContext.jsx";

const GOOGLE_SCRIPT_ID = "google-identity-service";

function bootstrapAuthSession(payload) {
  const token = payload?.token;

  if (!token) {
    return false;
  }

  localStorage.setItem("token", token);
  apiClient.defaults.headers.common.Authorization = `Token ${token}`;

  if (payload?.username) {
    localStorage.setItem("username", payload.username);
  }
  if (payload?.user_id) {
    localStorage.setItem("user_id", String(payload.user_id));
  }
  if (payload?.language) {
    localStorage.setItem("language", payload.language);
  }
  localStorage.setItem("is_admin", payload?.is_admin ? "true" : "false");

  return true;
}

function GoogleAuthButton({ mode = "login", onSuccess }) {
  const buttonRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState("");
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const { t } = useI18n();

  useEffect(() => {
    if (!clientId || !buttonRef.current) {
      return undefined;
    }

    const renderButton = () => {
      const google = window.google;
      if (!google?.accounts?.id || !buttonRef.current) {
        return;
      }

      google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          setErrorMessage("");
          try {
            const apiResponse = await apiClient.post("/google-auth/", {
              id_token: response.credential,
            });

            const ok = bootstrapAuthSession(apiResponse.data);
            if (ok) {
              onSuccess?.();
            }
          } catch (error) {
            console.error("Google auth error:", error);
            setErrorMessage(
              error?.response?.data?.error ||
                t("auth.googleError")
            );
          }
        },
      });

      buttonRef.current.innerHTML = "";
      google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: mode === "register" ? "signup_with" : "signin_with",
        width: 320,
      });
    };

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript && window.google) {
      renderButton();
      return undefined;
    }

    const script = existingScript || document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;

    if (!existingScript) {
      document.body.appendChild(script);
    }

    return undefined;
  }, [clientId, mode, onSuccess]);

  if (!clientId) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-500">
        {t("auth.googleMissing")}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={buttonRef}
        className="flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-200 bg-white"
      />
      {errorMessage ? (
        <p className="text-sm text-red-600">{errorMessage}</p>
      ) : null}
    </div>
  );
}

export default GoogleAuthButton;
