"use client";

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useGo, useLogin } from "@refinedev/core";
import { FeatherShield, FeatherSparkles, FeatherZap } from "@subframe/core";
import { useI18n } from "../I18nContext.jsx";
import { getRememberedLogin } from "../refine/sessionStorage";

const LOGIN_FEATURE_ICONS = [FeatherShield, FeatherZap, FeatherSparkles];

const Login = () => {
  const rememberedLogin = useMemo(() => getRememberedLogin(), []);
  const [username, setUsername] = useState(rememberedLogin.username);
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(rememberedLogin.rememberMe);
  const [errorMessage, setErrorMessage] = useState("");
  const go = useGo();
  const { mutate: login, isLoading } = useLogin();
  const { t } = useI18n();

  const loginHighlights = useMemo(
    () => [
      t("auth.loginHighlightOne"),
      t("auth.loginHighlightTwo"),
      t("auth.loginHighlightThree"),
    ],
    [t]
  );

  const handleLogin = (event) => {
    event.preventDefault();
    setErrorMessage("");

    login(
      { username, password, rememberMe },
      {
        onSuccess: (data) => {
          go({
            to: data?.redirectTo || "/dashboard",
            type: "replace",
          });
        },
        onError: (error) => {
          const nextErrorMessage =
            error?.message ||
            error?.response?.data?.non_field_errors?.[0] ||
            t("auth.invalidCredentials");
          setErrorMessage(nextErrorMessage);
        },
      }
    );
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.2),transparent_30%),radial-gradient(circle_at_right,rgba(251,191,36,0.16),transparent_24%),linear-gradient(180deg,#f8fbff_0%,#edf4fa_100%)] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.54),transparent_42%,rgba(255,255,255,0.44)_100%)]" />

      <div className="relative grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-[40px] border border-white/70 bg-white/75 shadow-[0_36px_110px_rgba(15,23,42,0.16)] backdrop-blur lg:grid-cols-[1.08fr_0.92fr]">
        <section className="flex flex-col justify-between bg-slate-950 px-7 py-8 text-white sm:px-9 sm:py-10 lg:px-11 lg:py-12">
          <div>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 flex-none items-center justify-center rounded-[24px] bg-gradient-to-br from-sky-400 via-cyan-300 to-amber-200 shadow-[0_18px_36px_rgba(56,189,248,0.28)]">
                <FeatherZap className="text-[28px] text-white" />
              </div>
              <div>
                <p className="text-2xl font-black tracking-tight text-white">Nexus</p>
                <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-300">
                  {t("sidebar.resourcePlanner")}
                </p>
              </div>
            </div>

            <div className="mt-10 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-300">
              {t("auth.loginTag")}
            </div>

            <h1 className="mt-6 max-w-xl font-['Newsreader'] text-4xl font-medium leading-tight tracking-tight text-white sm:text-5xl lg:text-[60px]">
              {t("auth.loginTitle")}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              {t("auth.loginBody")}
            </p>
          </div>

          <div className="mt-10 grid gap-4">
            {loginHighlights.map((highlight, index) => {
              const Icon = LOGIN_FEATURE_ICONS[index] || FeatherSparkles;

              return (
                <div
                  key={highlight}
                  className="flex items-start gap-3 rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 backdrop-blur"
                >
                  <div className="mt-0.5 flex h-10 w-10 flex-none items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-slate-100">
                    <Icon size={18} />
                  </div>
                  <p className="text-sm leading-6 text-slate-200">{highlight}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex items-center bg-white/85 px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="mx-auto flex w-full max-w-md flex-col">
            <div className="rounded-[28px] border border-slate-200/80 bg-white/80 p-6 shadow-[0_18px_48px_rgba(148,163,184,0.12)]">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 flex-none items-center justify-center rounded-[18px] bg-gradient-to-br from-sky-100 via-cyan-50 to-amber-100 text-slate-950 shadow-[0_12px_24px_rgba(148,163,184,0.18)]">
                  <FeatherZap size={20} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-slate-400">
                    {t("auth.loginPanelTag")}
                  </p>
                  <p className="text-lg font-black tracking-tight text-slate-950">
                    {t("auth.loginHeading")}
                  </p>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-500">
                {t("auth.loginSubheading")}
              </p>

              {errorMessage ? (
                <div className="mt-5 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {t("auth.username")}
                  </label>
                  <input
                    type="text"
                    autoComplete="username"
                    className="w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    {t("auth.password")}
                  </label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    className="w-full rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-950 outline-none transition focus:border-sky-400 focus:bg-white"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    disabled={isLoading}
                    required
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3 rounded-[22px] border border-slate-200/80 bg-slate-50/80 px-4 py-3.5 transition hover:border-slate-300 hover:bg-white">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 rounded border-slate-300 text-slate-950 focus:ring-sky-500"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-slate-950">
                      {t("auth.rememberMe")}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-slate-500">
                      {t("auth.rememberMeBody")}
                    </span>
                  </span>
                </label>

                <button
                  type="submit"
                  className="mt-2 w-full rounded-[22px] bg-slate-950 px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={isLoading}
                >
                  {isLoading ? t("auth.signingIn") : t("auth.signIn")}
                </button>
              </form>

              <p className="mt-6 text-sm text-slate-500">
                {t("auth.noAccount")}{" "}
                <Link
                  to="/register"
                  className="font-semibold text-slate-950 transition hover:text-sky-700 hover:underline"
                >
                  {t("auth.createAccount")}
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
