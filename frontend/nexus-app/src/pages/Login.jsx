import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
    // State isimlerini Django'nun beklediği isimlerle uyumlu hale getirdik (Opsiyonel ama iyi pratik)
    const [username, setUsername] = useState(""); 
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:8000/api/login/', {
                username: username, // Django ObtainAuthToken burayı 'username' olarak bekler
                password: password
            });

            // Token ve Username'i sakla
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('username', response.data.username);

            // Başarılı girişten sonra yönlendirme
            // App.jsx içindeki ana yolun '/' ise navigate('/') yapmalısın.
            navigate('/'); 
        } catch (error) {
            // Hata detayını yakalamak için:
            const errorMsg = error.response?.data?.non_field_errors?.[0] || 'Giriş başarısız.';
            console.error('Login failed:', error.response?.data);
            alert(errorMsg);
        }
    };

    return (
        <div className='flex h-screen items-center justify-center bg-slate-50'>
            <form onSubmit={handleLogin} className='w-full max-w-md bg-white p-8 rounded-lg shadow-md'>
                <h2 className='text-2xl font-bold mb-6 text-center text-indigo-600'>Nexus Giriş</h2>
                
                <div className='mb-4'>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Kullanıcı Adı / E-posta</label>
                    <input 
                        type="text" 
                        placeholder="Kullanıcı adınızı girin" 
                        className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                </div>

                <div className='mb-6'>
                    <label className='block text-sm font-medium text-gray-700 mb-1'>Şifre</label>
                    <input 
                        type="password"
                        placeholder='Şifrenizi girin'
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