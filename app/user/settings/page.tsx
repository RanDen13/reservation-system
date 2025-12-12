"use client";

import ErrorPopup from "@/app/components/Popup/ErrorPopup";
import { useRouter } from "next/navigation";

const page = () => {
  const router = useRouter();

  return (
    <ErrorPopup
      message="Setting Page is under construction."
      onClose={() => router.back()}
    />
  );
};

export default page;
