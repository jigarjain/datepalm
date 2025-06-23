"use client";

import { useRouter } from "next/navigation";
import { RootState, useStore } from "@/stores";

export default function Home() {
  const userData = useStore((state: RootState) => state.userData);
  const setUserName = useStore((state: RootState) => state.setUserName);
  const setPartnerName = useStore((state: RootState) => state.setPartnerName);

  const router = useRouter();

  const handleSubmit = (formData: FormData) => {
    const name = formData.get("name") as string;
    const partnerName = formData.get("partnerName") as string;
    setUserName(name);
    setPartnerName(partnerName);

    // Redirect to the session page
    router.push("/session");
  };

  return (
    <form action={handleSubmit} className="h-full flex flex-col p-4 relative">
      <div className="flex-1 pb-32">
        <div className="flex flex-col items-center">
          <div>
            <h3 className="text-xl font-bold text-base-content">
              What is your name?
            </h3>
            <input
              type="text"
              name="name"
              defaultValue={userData?.name || ""}
              required
              className="input input-lg bg-white text-black"
            />
            <h3 className="text-xl font-bold text-base-content mt-16">
              What is your partners name?
            </h3>
            <input
              type="text"
              name="partnerName"
              defaultValue={userData?.partnerName || ""}
              required
              className="input input-lg bg-white text-black"
            />
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-lg bg-base-100 border-t border-base-300 p-4 text-center">
        <button className="btn btn-neutral btn-wide" type="submit">
          Next
        </button>
      </div>
    </form>
  );
}
