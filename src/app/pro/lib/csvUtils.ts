// src/app/pro/lib/csvUtils.ts
import Papa from "papaparse";
import type { FormValues, RoomType } from "./types";

/**
 * FormValuesをCSV文字列に変換する
 */
export function exportToCSV(data: FormValues): string {
  const rows: string[][] = [];

  // ヘッダー行
  rows.push([
    "データタイプ",
    "プラン名",
    "郵便番号",
    "都道府県",
    "市区町村",
    "町名・番地",
    "建物名",
    "建物タイプ",
    "法適合",
    "リノベーション済",
    "敷地面積",
    "建蔽率",
    "容積率",
    "共有面積率",
    "専有面積率",
    "家賃",
    "築年数",
    "部屋タイプ名",
    "タイプ割合(%)",
    "部屋面積(㎡)",
    "算出部屋数",
    "定員数",
    "ベッド数",
    "清掃単価(円)",
    "消耗品費/泊(円)",
    "宿泊単価(円)",
    "平均宿泊数",
    "送信日時",
    "ソースページ",
  ]);

  // ソースページ情報を取得（クライアントサイドのみ）
  const sourcePage =
    typeof window !== "undefined"
      ? localStorage.getItem("proSourcePage") || (data as any).sourcePage || "new"
      : (data as any).sourcePage || "new";

  // 施設情報行（部屋タイプなし）
  rows.push([
    "facility",
    data.planName || "",
    data.zipcode || "",
    data.prefecture || "",
    data.city || "",
    data.place || "",
    data.building || "",
    data.buildingType || "",
    data.isLaw ? "true" : "false",
    data.isRenewed ? "true" : "false",
    data.area?.toString() || "",
    data.coverage?.toString() || "",
    data.fsi?.toString() || "",
    data.commonAreaRatio?.toString() || "",
    data.exclusiveAreaRatio?.toString() || "",
    data.rent?.toString() || "",
    data.ageType || "",
    "", // 部屋タイプ名
    "", // タイプ割合
    "", // 部屋面積
    "", // 算出部屋数
    "", // 定員数
    "", // ベッド数
    "", // 清掃単価
    "", // 消耗品費
    "", // 宿泊単価
    "", // 平均宿泊数
    (data as any).submittedAt || new Date().toISOString(),
    sourcePage,
  ]);

  // 部屋タイプ行
  data.roomTypes.forEach((room) => {
    rows.push([
      "room",
      "", // プラン名
      "", // 郵便番号
      "", // 都道府県
      "", // 市区町村
      "", // 町名・番地
      "", // 建物名
      "", // 建物タイプ
      "", // 法適合
      "", // リノベーション済
      "", // 敷地面積
      "", // 建蔽率
      "", // 容積率
      "", // 共有面積率
      "", // 専有面積率
      "", // 家賃
      "", // 築年数
      room.name || "",
      room.ratio?.toString() || "",
      room.roomArea?.toString() || "",
      room.computedRooms?.toString() || "",
      room.capacity?.toString() || "",
      room.beds?.toString() || "",
      room.cleaningUnitPrice?.toString() || "",
      room.consumablesPerNight?.toString() || "",
      room.lodgingUnitPrice?.toString() || "",
      room.avgStayNights?.toString() || "",
      "", // 送信日時
      "", // ソースページ
    ]);
  });

  return Papa.unparse(rows);
}

/**
 * CSV文字列をFormValuesに変換する
 */
export function importFromCSV(csvText: string): FormValues {
  const parsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: true,
  });

  const rows = parsed.data;
  if (rows.length < 2) {
    throw new Error("CSVデータが不正です（最低2行必要）");
  }

  // ヘッダー行をスキップ
  const facilityRow = rows[1];
  if (facilityRow[0] !== "facility") {
    throw new Error("2行目は施設情報である必要があります");
  }

  // 施設情報を読み込む
  const facility: FormValues = {
    planName: facilityRow[1] || "",
    zipcode: facilityRow[2] || "",
    prefecture: (facilityRow[3] as any) || "",
    city: facilityRow[4] || "",
    place: facilityRow[5] || "",
    building: facilityRow[6] || "",
    buildingType: (facilityRow[7] as any) || "",
    isLaw: facilityRow[8] === "true",
    isRenewed: facilityRow[9] === "true",
    area: facilityRow[10] ? Number(facilityRow[10]) : undefined,
    coverage: facilityRow[11] ? Number(facilityRow[11]) : undefined,
    fsi: facilityRow[12] ? Number(facilityRow[12]) : undefined,
    commonAreaRatio: facilityRow[13] ? Number(facilityRow[13]) : undefined,
    exclusiveAreaRatio: facilityRow[14] ? Number(facilityRow[14]) : undefined,
    rent: facilityRow[15] ? Number(facilityRow[15]) : undefined,
    ageType: (facilityRow[16] as any) || "",
    roomTypes: [],
  };

  // 送信日時を保存
  if (facilityRow[27]) {
    (facility as any).submittedAt = facilityRow[27];
  }

  // ソースページを保存
  if (facilityRow[28]) {
    (facility as any).sourcePage = facilityRow[28];
  }

  // 部屋タイプを読み込む
  for (let i = 2; i < rows.length; i++) {
    const row = rows[i];
    if (row[0] !== "room") continue;

    const room: RoomType = {
      name: row[17] || "",
      ratio: row[18] ? Number(row[18]) : undefined,
      roomArea: row[19] ? Number(row[19]) : undefined,
      computedRooms: row[20] ? Number(row[20]) : undefined,
      capacity: row[21] ? Number(row[21]) : 1,
      beds: row[22] ? Number(row[22]) : 0,
      cleaningUnitPrice: row[23] ? Number(row[23]) : undefined,
      consumablesPerNight: row[24] ? Number(row[24]) : undefined,
      lodgingUnitPrice: row[25] ? Number(row[25]) : undefined,
      avgStayNights: row[26] ? Number(row[26]) : undefined,
    };

    facility.roomTypes.push(room);
  }

  return facility;
}

/**
 * CSVファイルをダウンロードする
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
