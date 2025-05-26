import React from "react";

type Props = {
  nameOfUser: string;
  nameOfPartner: string;
  updateNames: (name: string, partnerName: string) => void;
};

const NameScreen = ({
  nameOfUser = "",
  nameOfPartner = "",
  updateNames
}: Props) => {
  const handleSubmit = (formData: FormData) => {
    updateNames(
      formData.get("name") as string,
      formData.get("partnerName") as string
    );
  };

  return (
    <form action={handleSubmit} className="h-full flex flex-col p-4">
      <div className="flex-1">
        <div className="flex flex-col items-center">
          <div>
            <h3 className="text-xl font-bold text-base-content">
              What is your name?
            </h3>
            <input
              type="text"
              name="name"
              defaultValue={nameOfUser}
              required
              className="input input-lg bg-white text-black"
            />
            <h3 className="text-xl font-bold text-base-content mt-16">
              What is your partners name?
            </h3>
            <input
              type="text"
              name="partnerName"
              defaultValue={nameOfPartner}
              required
              className="input input-lg bg-white text-black"
            />
          </div>
        </div>
      </div>
      <div className="w-full p-4 mt-auto text-center border-t border-base-300 ">
        <button className="btn btn-neutral btn-wide" type="submit">
          Next
        </button>
      </div>
    </form>
  );
};

export default NameScreen;
