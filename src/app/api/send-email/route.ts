import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "dummy-key");

// HTMLテンプレート生成関数
function generateEmailHTML(params: {
  revenue: number;
  expense: number;
  profit: number;
  occupancyRate: number;
  businessType?: string;
  roomData: Array<{ name?: string; count?: number; area?: number; capacity?: number }>;
  perRoomResults: Array<{ revenue?: number; expenses?: number; profit?: number }>;
}): string {
  const { revenue, expense, profit, occupancyRate, businessType, roomData, perRoomResults } =
    params;

  return `
    <div style="max-width: 600px; margin: 0 auto; font-family: 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #AA9670; text-align: center; margin-bottom: 30px; font-size: 24px;">民泊シミュレーション結果</h2>

      <p style="margin-bottom: 30px; color: #373737; text-align: center;">
        ご利用いただきありがとうございます。<br/>今回ご入力いただいたデータをもとに算出されたシミュレーション結果をお送りいたします。
      </p>

      <!-- シミュレーション結果サマリー -->
      <div style="margin: 30px 0;">
        <h3 style="color: #AA9670; margin: 0 0 15px 0; font-size: 18px;">📊 シミュレーション結果サマリー</h3>
        <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="padding: 15px; border-bottom: 1px solid #eee;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="color: #666;">🏷️ 宿泊事業の種別</span>
              <span style="font-weight: bold;">${businessType || "未選択"}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="color: #666;">💰 年間売上</span>
              <span style="font-weight: bold; color: #28a745;">¥${revenue.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="color: #666;">💸 年間支出</span>
              <span style="font-weight: bold; color: #dc3545;">¥${expense.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="color: #666;">📈 年間利益</span>
              <span style="font-weight: bold; color: ${profit >= 0 ? "#28a745" : "#dc3545"};">¥${profit.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #666;">📊 平均稼働率</span>
              <span style="font-weight: bold; color: #007bff;">${occupancyRate.toFixed(1)}%</span>
            </div>
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #eee; color: #666; font-size: 12px;">
              ${
                businessType === "民泊新法"
                  ? "民泊新法に基づく最大稼働日数で算出しています。"
                  : businessType === "ホテル・旅館業"
                    ? "ホテル・旅館業の通常稼働日数（年間合計）に基づき算出しています。"
                    : businessType === "特区民泊"
                      ? "特区民泊の通常稼働日数（年間合計）に基づき算出しています。"
                      : "選択された宿泊事業の種別に基づき稼働率を算出しています。"
              }
            </div>
          </div>
        </div>
      </div>

      <!-- 注意事項 -->
      <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 30px 0;">
        <p style="margin: 0; color: #856404; font-size: 14px;">
          <strong>⚠️ 重要:</strong> このシミュレーション結果は参考値です。実際の運用では市場状況や運営方法により結果が変動する可能性があります。詳しくは以下よりお問い合わせください。
        </p>
      </div>

      <!-- お問い合わせ案内 -->
      <div style="text-align: center; margin: 30px 0;">
        <div style="background-color: #f8f9fa; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <a href="https://timerex.net/s/hayashi_b01c_854f/67ac43a0" style="display: inline-block; background-color: #FF9800; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            より詳しいデータを見る
          </a>
          <p style="color: #373737; font-size: 14px; margin-top: 15px;">弊社の実績データを基に、物件ごとの最適な収益シミュレーションをご案内します</p>
        </div>
      </div>

      ${
        roomData.length > 0
          ? `
      <!-- 部屋タイプ別詳細 -->
      <div style="margin: 30px 0;">
        <h3 style="color: #AA9670; margin: 0 0 15px 0; font-size: 18px;">🏠 部屋タイプ別詳細</h3>
        <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          ${perRoomResults
            .map(
              (room: { revenue?: number; expenses?: number; profit?: number }, index: number) => `
            <div style="padding: 15px; border-bottom: ${index < perRoomResults.length - 1 ? "1px solid #eee" : "none"};">
              <div style="font-weight: bold; color: #333; margin-bottom: 8px;">${roomData[index]?.name || `部屋タイプ ${index + 1}`}</div>
              <div style="margin-bottom: 10px; font-size: 13px; color: #888;">
                <span>🏠 部屋数: ${roomData[index]?.count || 0}部屋</span> |
                <span>📐 広さ: ${roomData[index]?.area || 0}㎡</span> |
                <span>👥 定員: ${roomData[index]?.capacity || 0}名</span>
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; font-size: 14px;">
                <div><span style="color: #666;">売上:</span> <span style="font-weight: bold; color: #28a745;">¥${room.revenue?.toLocaleString() || "0"}</span></div>
                <div><span style="color: #666;">支出:</span> <span style="font-weight: bold; color: #dc3545;">¥${room.expenses?.toLocaleString() || "0"}</span></div>
                <div><span style="color: #666;">利益:</span> <span style="font-weight: bold; color: ${(room.profit || 0) >= 0 ? "#28a745" : "#dc3545"};">¥${room.profit?.toLocaleString() || "0"}</span></div>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
      `
          : ""
      }
    </div>
  `;
}

// GETリクエストでプレビューを返す
export async function GET() {
  // サンプルデータでプレビューを生成
  const sampleData = {
    revenue: 5000000,
    expense: 2000000,
    profit: 3000000,
    occupancyRate: 65.5,
    businessType: "民泊新法",
    roomData: [
      { name: "スタンダードルーム", count: 2, area: 25, capacity: 2 },
      { name: "デラックスルーム", count: 1, area: 35, capacity: 4 },
    ],
    perRoomResults: [
      { revenue: 3000000, expenses: 1200000, profit: 1800000 },
      { revenue: 2000000, expenses: 800000, profit: 1200000 },
    ],
  };

  const html = generateEmailHTML(sampleData);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

export async function POST(req: Request) {
  try {
    // 環境変数のチェック
    if (!process.env.RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY is not set");
      return NextResponse.json(
        {
          error: "Resend API key is not configured",
          details: "Please set RESEND_API_KEY environment variable",
        },
        { status: 500 },
      );
    }

    const data = await req.formData();

    const email = data.get("email")?.toString();
    const revenue = parseFloat(data.get("revenue")?.toString() || "0");
    const expense = parseFloat(data.get("expense")?.toString() || "0");
    const profit = parseFloat(data.get("profit")?.toString() || "0");
    const occupancyRate = parseFloat(data.get("occupancyRate")?.toString() || "0");
    const roomData = JSON.parse(data.get("roomData")?.toString() || "[]");
    const facilityData = JSON.parse(data.get("facilityData")?.toString() || "{}");
    const businessType: string | undefined = facilityData?.businessType;
    const perRoomResults = JSON.parse(data.get("perRoomResults")?.toString() || "[]");

    // デバッグログ
    console.log("📧 メール送信データ:", {
      email,
      revenue,
      expense,
      profit,
      occupancyRate,
      roomCount: roomData.length,
    });

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailHTML = generateEmailHTML({
      revenue,
      expense,
      profit,
      occupancyRate,
      businessType,
      roomData,
      perRoomResults,
    });

    try {
      const { data: sendResult, error } = await resend.emails.send({
        from: process.env.RESEND_FROM || "onboarding@resend.dev",
        to: [email],
        subject: "民泊シミュレーション結果",
        html: emailHTML,
      });

      if (error || !sendResult?.id) {
        console.error("❌ Resend error:", error);

        // シンプルなエラーメッセージ
        return NextResponse.json(
          {
            error: "ご案内",
            details:
              "テスト環境では minpaku.sim.test@gmail.com をご利用頂くことでメールの送信テストも行えます。",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ message: "メール送信成功", id: sendResult.id }, { status: 200 });
    } catch (err: unknown) {
      console.error("❌ Unexpected error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } catch (err: unknown) {
    console.error("❌ Top-level error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
