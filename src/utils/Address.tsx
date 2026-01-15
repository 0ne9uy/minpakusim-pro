// 郵便番号から住所を取得して県名と市町村を返す関数
export async function fetchAddress(zip: string) {
  const res = await fetch(
    `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zip.replace("-", "")}`,
  );
  const data = await res.json();
  if (data.results && data.results[0]) {
    const { address1, address2 } = data.results[0]; // address1=都道府県, address2=市区町村
    return { prefecture: address1, city: address2 };
  }
  return null;
}
