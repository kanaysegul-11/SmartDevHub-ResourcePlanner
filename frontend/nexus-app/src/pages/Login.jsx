import React, { useState } from 'react';

import axios from 'axios';

const Login = () => {
    const [username, setUsername] = useState(""); 
    const [password, setPassword] = useState("");
    

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://127.0.0.1:8000/api/login/', {
                username: username,
                password: password
            });

            // Gelen veriyi konsolda görerek emin olalım
            console.log("Sunucu yanıtı:", response.data);

            // Bilgileri sakla
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('username', response.data.username);

            // Token başarıyla kaydedildiyse yönlendir
            if (response.data.token) {
                console.log("Token bulundu, yönlendiriliyor...");
                window.location.href = "/";// Ana sayfaya git
                // Eğer navigate çalışmazsa alternatif olarak şunu deneyebilirsin:
                // window.location.href = "/";
            }
        } catch (error) {
            console.error('Login failed:', error.response?.data);
            const errorMsg = error.response?.data?.non_field_errors?.[0] || 'Kullanıcı adı veya şifre hatalı.';
            alert(errorMsg);
        }
    };

    return (
        <div className='flex h-screen items-center justify-center bg-slate-50'>
            <form onSubmit={handleLogin} className='w-full max-w-md bg-white p-8 rounded-lg shadow-md'>
                <h2 className='text-2xl font-bold mb-6 text-center text-indigo-600'>Nexus Giriş</h2>
                <div className='mb-4'>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Kullanıcı Adı</label>
                    <input 
                        type="text" 
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>
                <div className='mb-6'>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Şifre</label>
                    <input 
                        type="password"
                        className='w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none' 
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type='submit' className='w-full bg-indigo-600 text-white p-2 rounded font-semibold hover:bg-indigo-700 transition-colors'>
                    Giriş Yap
                </button> 
            </form>
        </div>
    );
};

export default Login;