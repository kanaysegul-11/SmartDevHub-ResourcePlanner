import React, { useState } from "react";
import { useGo, useLogin } from "@refinedev/core";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const go = useGo();
  const { mutate: login, isLoading } = useLogin();

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
            "Kullanici adi veya sifre hatali.";
          alert(errorMessage);
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
          Nexus Giris
        </h2>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Kullanici Adi
          </label>
          <input
            type="text"
            className="w-full rounded border p-2 outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Sifre
          </label>
          <input
            type="password"
            className="w-full rounded border p-2 outline-none focus:ring-2 focus:ring-indigo-500"
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full rounded bg-indigo-600 p-2 font-semibold text-white transition-colors hover:bg-indigo-700"
          disabled={isLoading}
        >
          {isLoading ? "Giris Yapiliyor..." : "Giris Yap"}
        </button>
      </form>
    </div>
  );
};

export default Login;
