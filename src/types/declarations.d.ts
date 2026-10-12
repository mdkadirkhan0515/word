declare module "react-native-vector-icons/*" {
  import { ComponentType } from "react";
  import { TextProps } from "react-native";

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
    allowFontScaling?: boolean;
  }

  const Icon: ComponentType<IconProps>;
  export default Icon;
}

declare module "react-native-vector-icons/MaterialCommunityIcons" {
  import { ComponentType } from "react";
  import { TextProps } from "react-native";

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
    allowFontScaling?: boolean;
  }

  const Icon: ComponentType<IconProps>;
  export default Icon;
}

declare module "react-native-sqlite-storage" {
  export interface DatabaseParams {
    name: string;
    location?: string;
    createFromLocation?: string | number;
    displayName?: string;
    size?: number;
    version?: string;
  }

  export interface SQLiteDatabase {
    transaction(
      scope: (tx: any) => void,
      error?: (error: any) => void,
      success?: () => void
    ): void;
    readTransaction(
      scope: (tx: any) => void,
      error?: (error: any) => void,
      success?: () => void
    ): void;
    close(): Promise<void>;
    executeSql(sqlStatement: string, args?: any[]): Promise<[any]>;
  }

  export function openDatabase(
    params: DatabaseParams,
    success?: (db: SQLiteDatabase) => void,
    error?: (e: any) => void
  ): SQLiteDatabase;

  export function enablePromise(enable: boolean): void;
  export function DEBUG(enable: boolean): void;
}

declare module "react-native-tts";
