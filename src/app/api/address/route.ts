import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postalCode = searchParams.get("postalCode");

  if (!postalCode || postalCode.length !== 7) {
    return NextResponse.json({ error: "郵便番号は7桁で入力してください" }, { status: 400 });
  }

  try {
    // 郵便番号検索APIを使用して住所を取得
    const response = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${postalCode}`);
    const data = await response.json();

    if (data.status === 200 && data.results && data.results.length > 0) {
      const result = data.results[0];
      const address = {
        prefecture: result.address1, // 都道府県
        city: `${result.address2}${result.address3}`, // 市区町村 + 町名
        block: "", // 番地は手入力
      };

      return NextResponse.json({ address });
    } else {
      // 外部APIの詳細なエラー情報をログに出力
      console.log("外部API応答:", {
        status: data.status,
        results: data.results,
        message: data.message || "不明なエラー",
        postalCode: postalCode,
      });

      return NextResponse.json(
        {
          error: "住所が見つかりませんでした",
          details:
            "入力された郵便番号に対応する住所が見つかりませんでした。正しい郵便番号を入力してください。",
        },
        { status: 404 },
      );
    }
  } catch (error) {
    console.error("住所取得エラー:", error);
    return NextResponse.json({ error: "住所の取得に失敗しました" }, { status: 500 });
  }
}
