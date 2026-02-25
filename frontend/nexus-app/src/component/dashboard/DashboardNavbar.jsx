import React from "react";
import { useUser } from "../../UserContext.jsx";

function Navbar() {
  const { userData } = useUser();

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-4xl font-black text-slate-800 tracking-tight">
        Merhaba, {userData.username || "Kullanıcı"}! 👋
      </h1>
      <p className="text-slate-500 font-medium text-lg">
        İşte şirket durumunu görüntüleyebilirsiniz ve ekip yönetimi yapabilirsiniz. 
      </p>
    </div>
  );
}

export default Navbar;