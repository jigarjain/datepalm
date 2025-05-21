interface UserData {
  name: string;
  partnerName: string;
}

export function getUserData() {
  const userDateStr = window.localStorage.getItem("userData");
  return userDateStr ? JSON.parse(userDateStr) : null;
}

function updateUserData(updatedUserData: Partial<UserData>) {
  const userData = getUserData();

  const newUserData = {
    ...userData,
    ...updatedUserData
  };

  window.localStorage.setItem("userData", JSON.stringify(newUserData));
}

export type { UserData };
export { updateUserData };
