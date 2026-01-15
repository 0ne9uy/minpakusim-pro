import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 全角文字を半角に変換する関数
 * - 全角数字（０-９）→ 半角数字（0-9）
 * - 全角英字（Ａ-Ｚ、ａ-ｚ）→ 半角英字（A-Z、a-z）
 * - 全角スペース → 半角スペース
 * - 全角記号の一部（。、，など）→ 半角記号
 */
export function toHalfWidth(str: string): string {
  return str
    .replace(/[Ａ-Ｚａ-ｚ０-９！-～]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - 0xfee0);
    })
    .replace(/　/g, " "); // 全角スペースを半角スペースに変換
}

// 部屋タイプの表示名を取得する関数
export function getRoomDisplayName(roomType: {
  name?: string;
  roomArea?: number;
  computedRooms?: number;
  capacity?: number;
}) {
  const name = roomType?.name?.trim();
  
  // 名前が入力されている場合はそのまま返す
  if (name) {
    return name;
  }
  
  // 名前が未入力の場合は数値情報を組み合わせて表示
  const roomArea = roomType?.roomArea || 0;
  const computedRooms = roomType?.computedRooms || 0;
  const capacity = roomType?.capacity || 0;
  
  if (roomArea > 0 && computedRooms > 0 && capacity > 0) {
    return `${roomArea}㎡・${computedRooms}部屋・${capacity}人`;
  } else if (roomArea > 0 && computedRooms > 0) {
    return `${roomArea}㎡・${computedRooms}部屋`;
  } else if (roomArea > 0 && capacity > 0) {
    return `${roomArea}㎡・${capacity}人`;
  } else if (roomArea > 0) {
    return `${roomArea}㎡`;
  }
  
  return "未設定";
}
