import { StateCreator, create } from "zustand";
import { persist } from "zustand/middleware";
import { Summary, UserData } from "@/types";

export interface UserDataState {
  userData: UserData | null;
  setUserName: (name: string) => void;
  setPartnerName: (partnerName: string) => void;
}

const userDataStore: StateCreator<UserDataState> = (set) => ({
  userData: null,
  setUserName: (name: string) =>
    set((state) => ({ userData: { ...state.userData, name } as UserData })),
  setPartnerName: (partnerName: string) =>
    set((state) => ({
      userData: { ...state.userData, partnerName } as UserData
    }))
});

export interface SummaryState {
  summaries: Summary[];
  addSummary: (summary: Summary) => void;
  getSummary: (summaryId: string) => Summary | null;
}

const summaryStore: StateCreator<SummaryState> = (set, get) => ({
  summaries: [],
  addSummary: (summary: Summary) =>
    set((state) => ({ summaries: [...state.summaries, summary] as Summary[] })),
  getSummary: (summaryId: string) =>
    get().summaries.find((s) => s.id === summaryId) as Summary | null
});

export type RootState = UserDataState & SummaryState;

export const useStore = create<RootState>()(
  persist(
    (...a) => ({
      ...userDataStore(...a),
      ...summaryStore(...a)
    }),
    { name: "datepalm-store" }
  )
);
