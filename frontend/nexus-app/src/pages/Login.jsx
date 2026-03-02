import React, { useState } from "react";
import { useLogin } from "@refinedev/core";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { mutate: login, isLoading } = useLogin();

  const handleLogin = (e) => {
    e.preventDefault();
    login(
      { username, password },
      {
        onSuccess: (data) => {
          window.location.href = data?.redirectTo || "/";
        },
        onError: (error) => {
          const errorMsg =
            error?.response?.data?.non_field_errors?.[0] ||
            "KullanÄ±cÄ± adÄ± veya ÅŸifre hatalÄ±.";
          alert(errorMsg);
        },
      }
    );
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-lg bg-white p-8 shadow-md"
      >
        <h2 className="mb-6 text-center text-2xl font-bold text-indigo-600">
          Nexus GiriÅŸ
        </h2>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Kullanıcı Adı
          </label>
          <input
            type="text"
            className="w-full rounded border p-2 outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Şifre
          </label>
          <input
            type="password"
            className="w-full rounded border p-2 outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="w-full rounded bg-indigo-600 p-2 font-semibold text-white transition-colors hover:bg-indigo-700"
          disabled={isLoading}
        >
          {isLoading ? "Giriş Yapılıyor..." : "Giriş Yap"}
        </button>
      </form>
    </div>
  );
};

export default Login;
