"use client";

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useGo, useLogin } from "@refinedev/core";
import { useI18n } from "../I18nContext.jsx";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const go = useGo();
  const { mutate: login, isLoading } = useLogin();
  const { t } = useI18n();

  const handleLogin = (event) => {
    event.preventDefault();

    login(
      { username, password },
      {
        onSuccess: (data) => {
          go({
            to: data?.redirectTo || "/dashboard",
            type: "replace",
          });
        },
        onError: (error) => {
          const errorMessage =
            error?.response?.data?.non_field_errors?.[0] ||
            t("auth.invalidCredentials");
          alert(errorMessage);
        },
      }
    );
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_26%),linear-gradient(180deg,#f8fbff_0%,#eef4f8_100%)] px-4 py-10">
      <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-[36px] border border-white/60 bg-white/75 shadow-[0_32px_90px_rgba(15,23,42,0.14)] backdrop-blur lg:grid-cols-[1.1fr_0.9fr]">
        <div className="bg-slate-950 p-8 text-white lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            {t("auth.loginTag")}
          </p>
          <h1 className="mt-4 font-['Newsreader'] text-5xl font-medium leading-tight tracking-tight">
            {t("auth.loginTitle")}
          </h1>
        </div>

        <div className="p-8 lg:p-10">
          <div className="mx-auto flex w-full max-w-md flex-col gap-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950">
                {t("auth.loginHeading")}
              </h2>
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {t("auth.username")}
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {t("auth.password")}
                </label>
                <input
                  type="password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="mt-2 w-full rounded-2xl bg-slate-950 p-3 font-semibold text-white transition-colors hover:bg-slate-800"
                disabled={isLoading}
              >
                {isLoading ? t("auth.signingIn") : t("auth.signIn")}
              </button>
            </form>

            <p className="text-sm text-slate-500">
              {t("auth.noAccount")}{" "}
              <Link to="/register" className="font-semibold text-slate-950 hover:underline">
                {t("auth.createAccount")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
