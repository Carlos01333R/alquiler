"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type BackButtonProps = {
  href: string;
  label?: string;
};

export default function BackButton({ href, label = "Volver" }: BackButtonProps) {
  const router = useRouter();

  return (
    <div className="pb-2">
    <button
      className="bg-white px-3 py-1.5 rounded-lg text-black cursor-pointer flex items-center gap-x-1 "
      onClick={() => router.push(href)}
    >
      <ArrowLeft className="mr-1 h-4 w-4" />
      {label}
    </button>
    </div>
  );
}