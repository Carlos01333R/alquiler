import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import Sidebar from "./sidebar";
import { Menu, X } from "lucide-react";


interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  MenuArry: any;
}


export default function SheetNew({activeSection, onSectionChange,
  MenuArry,}: SidebarProps) {

    const {logout} = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Botón para abrir el sheet */}
      <button
        onClick={() => setIsOpen(true)}
       
      >
     <Menu className="w-6 h-6 text-[#101828]" />
    </button>

      {/* Fondo oscuro */}
      {isOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm bg-opacity-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

  <div
  className={`fixed top-0 left-0 h-screen w-auto bg-gray-900 shadow-xl transform transition-transform duration-300 overflow-y-scroll ${
    isOpen ? "translate-x-0" : "-translate-x-full"
  }`}
>
        <div className="flex justify-end items-center p-2 ">
          <button
            onClick={() => setIsOpen(false)}
           
          >
            <X  className="w-6 h-6 text-white" />
          </button>
        </div>
        <div className="w-full overflow-y-scroll scrollbar-webkit scrollbar-firefox">
         <Sidebar
         logout={logout}
          activeSection={activeSection}
          onSectionChange={onSectionChange}
          Menu={MenuArry}
        />
        
        </div>
      </div>
    </div>
  );
}
