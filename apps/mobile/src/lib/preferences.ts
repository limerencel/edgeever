import AsyncStorage from "@react-native-async-storage/async-storage";

const MEMO_LIST_DENSITY_KEY = "edgeever.mobile.memoListDensity";
const NOTEBOOK_SORT_KEY = "edgeever.mobile.notebookSort";

export type MobileMemoListDensity = "preview" | "compact";
export type MobileNotebookSortPreference = "manual" | "name-asc" | "memo-count-desc" | "updated-desc";

export const readMobileMemoListDensity = async (): Promise<MobileMemoListDensity> => {
  const value = await AsyncStorage.getItem(MEMO_LIST_DENSITY_KEY);
  return value === "compact" ? "compact" : "preview";
};

export const writeMobileMemoListDensity = (density: MobileMemoListDensity) => AsyncStorage.setItem(MEMO_LIST_DENSITY_KEY, density);

export const readMobileNotebookSort = async (): Promise<MobileNotebookSortPreference> => {
  const value = await AsyncStorage.getItem(NOTEBOOK_SORT_KEY);
  return isMobileNotebookSortPreference(value) ? value : "manual";
};

export const writeMobileNotebookSort = (sortMode: MobileNotebookSortPreference) => AsyncStorage.setItem(NOTEBOOK_SORT_KEY, sortMode);

const isMobileNotebookSortPreference = (value: unknown): value is MobileNotebookSortPreference =>
  value === "manual" || value === "name-asc" || value === "memo-count-desc" || value === "updated-desc";
