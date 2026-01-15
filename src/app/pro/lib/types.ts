// src/app/pro/lib/types.ts

import type { buildingAges } from "../lib/buildingAges";
import type { buildingTypes } from "../lib/buildingTypes";
import type { prefectures } from "../lib/prefectures";

export type FormValues = {
  planName: string; // プラン名
  // 住所
  zipcode: string;
  prefecture?: keyof typeof prefectures;
  city: string;
  place: string;
  building: string;
  buildingType?: keyof typeof buildingTypes;

  // フラグ
  isLaw: boolean;
  isRenewed: boolean;

  // プラン
  area?: number;
  coverage?: number;
  fsi?: number;
  commonAreaRatio?: number;
  exclusiveAreaRatio?: number;
  rent?: number;

  // 築年数の選択
  ageType?: keyof typeof buildingAges;

  roomTypes: RoomType[];
};

export type RoomType = {
  name: string; // 部屋タイプ名（任意）
  ratio?: number; // タイプの割合（%）
  roomArea?: number; // 部屋面積（㎡）
  computedRooms?: number; // 算出部屋数
  capacity: number; // 定員数
  beds: number; // ベッド数
  cleaningUnitPrice?: number; // 清掃単価（円）
  consumablesPerNight?: number; // 消耗品費/泊（円）
  lodgingUnitPrice?: number; // 宿泊単価（円）
  avgStayNights?: number; // 平均宿泊数
};
