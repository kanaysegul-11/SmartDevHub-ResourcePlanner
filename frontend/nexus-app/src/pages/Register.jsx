"use client";

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient } from "../refine/axios";
import { useI18n } from "../I18nContext.jsx";
import { applySessionPayload } from "../refine/session";

function Register() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    setFormData((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await apiClient.post("/register/", formData);
      applySessionPayload(response.data);

      navigate("/dashboard", { replace: true });
    } catch (error) {
      alert(error?.response?.data?.error || t("auth.registerError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_26%),linear-gradient(180deg,#f8fbff_0%,#eef4f8_100%)] px-4 py-10">
      <div className="grid w-full max-w-5xl grid-cols-1 overflow-hidden rounded-[36px] border border-white/60 bg-white/75 shadow-[0_32px_90px_rgba(15,23,42,0.14)] backdrop-blur lg:grid-cols-[1fr_1fr]">
        <div className="p-8 lg:p-10">
          <div className="mx-auto flex w-full max-w-md flex-col gap-6">
            <div>
              <h2 className="text-3xl font-black tracking-tight text-slate-950">
                {t("auth.registerHeading")}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {t("auth.firstName")}
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  value={formData.first_name}
                  onChange={handleChange("first_name")}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {t("auth.lastName")}
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  value={formData.last_name}
                  onChange={handleChange("last_name")}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {t("auth.username")}
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  value={formData.username}
                  onChange={handleChange("username")}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {t("auth.email")}
                </label>
                <input
                  type="email"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  value={formData.email}
                  onChange={handleChange("email")}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  {t("auth.password")}
                </label>
                <input
                  type="password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                  value={formData.password}
                  onChange={handleChange("password")}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="mt-2 w-full rounded-2xl bg-slate-950 p-3 font-semibold text-white transition-colors hover:bg-slate-800"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t("auth.signingUp") : t("auth.signUp")}
                </button>
              </div>
            </form>

            <p className="text-sm text-slate-500">
              {t("auth.hasAccount")}{" "}
              <Link to="/login" className="font-semibold text-slate-950 hover:underline">
                {t("auth.signInLink")}
              </Link>
            </p>
          </div>
        </div>

        <div className="dark-surface bg-slate-950 p-8 text-white lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            {t("auth.registerTag")}
          </p>
          <h1 className="mt-4 font-['Newsreader'] text-5xl font-medium leading-tight tracking-tight">
            {t("auth.registerTitle")}
          </h1>
        </div>
      </div>
    </div>
  );
}

export default Register;
