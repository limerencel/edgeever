import AsyncStorage from "@react-native-async-storage/async-storage";

const MEMO_LIST_DENSITY_KEY = "edgeever.mobile.memoListDensity";

export type MobileMemoListDensity = "preview" | "compact";

export const readMobileMemoListDensity = async (): Promise<MobileMemoListDensity> => {
  const value = await AsyncStorage.getItem(MEMO_LIST_DENSITY_KEY);
  return value === "compact" ? "compact" : "preview";
};

export const writeMobileMemoListDensity = (density: MobileMemoListDensity) => AsyncStorage.setItem(MEMO_LIST_DENSITY_KEY, density);
