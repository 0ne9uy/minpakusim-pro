"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toHalfWidth } from "@/lib/utils";
import type { FormValues, RoomType } from "../lib/types";

export default function RoomTypesSection({
	isRatioRequired = false,
}: {
	isRatioRequired?: boolean;
}) {
	const form = useFormContext<FormValues>();
	const { control, trigger, getValues, setValue } = form;

	const { fields, append, remove } = useFieldArray({
		control,
		name: "roomTypes",
	});

	const recomputeRooms = (idx: number) => {
		const rt = getValues(`roomTypes.${idx}`) as RoomType;
		const landArea = getValues("area") as unknown as number;
		const fsi = getValues("fsi") as unknown as number;
		const exclusiveAreaRatio = getValues(
			"exclusiveAreaRatio",
		) as unknown as number;

		if (!landArea || !rt.roomArea || !rt.ratio) return;

		// 延床面積 = 土地面積 × 容積率
		const floorArea = landArea * (fsi / 100);

		// 専有面積 = 延床面積 × 専有部率
		const exclusiveArea = floorArea * (exclusiveAreaRatio / 100);

		// 該当タイプの専有面積 = 専有面積 × 割合
		const typeExclusiveArea = exclusiveArea * (rt.ratio / 100);

		// 部屋数 = 該当タイプの専有面積 / 部屋面積（小数点以下切り捨て）
		const rooms = Math.floor(typeExclusiveArea / rt.roomArea);

		// 最低1部屋は確保
		const finalRooms = Math.max(1, rooms);
		setValue(`roomTypes.${idx}.computedRooms`, finalRooms, {
			shouldDirty: true,
		});
	};

	// 建築プランに基づく最大部屋面積を計算
	const getMaxRoomArea = (idx: number) => {
		const landArea = getValues("area") as unknown as number;
		const fsi = getValues("fsi") as unknown as number;
		const exclusiveAreaRatio = getValues(
			"exclusiveAreaRatio",
		) as unknown as number;
		const rt = getValues(`roomTypes.${idx}`) as RoomType;

		// 必要な値がすべて入力されているかチェック
		if (!landArea || !fsi || !exclusiveAreaRatio || !rt?.ratio) return null;

		const floorArea = landArea * (fsi / 100);
		const exclusiveArea = floorArea * (exclusiveAreaRatio / 100);
		const typeExclusiveArea = exclusiveArea * (rt.ratio / 100);

		// 1部屋作るための最大面積
		return typeExclusiveArea;
	};

	// 最大部屋面積が計算可能かチェック
	const canCalculateMaxArea = (idx: number) => {
		const landArea = getValues("area") as unknown as number;
		const fsi = getValues("fsi") as unknown as number;
		const exclusiveAreaRatio = getValues(
			"exclusiveAreaRatio",
		) as unknown as number;
		const rt = getValues(`roomTypes.${idx}`) as RoomType;

		return !!(landArea && fsi && exclusiveAreaRatio && rt?.ratio);
	};

	// 割合の合計をチェック
	const getTotalRatio = () => {
		const roomTypes = getValues("roomTypes") || [];
		return roomTypes.reduce(
			(sum: number, rt: RoomType) => sum + (rt.ratio || 0),
			0,
		);
	};

	// 部屋面積のバリデーション
	const validateRoomArea = (value: number, idx: number) => {
		const maxArea = getMaxRoomArea(idx);
		if (maxArea !== null && value > maxArea) {
			return `部屋面積は最大${Math.floor(maxArea)}㎡までです`;
		}
		if (value < 1) {
			return "部屋面積は1㎡以上である必要があります";
		}
		return true;
	};

	// 割合のバリデーション
	const validateRatio = (value: number, idx: number) => {
		const currentTotal = getTotalRatio();
		const currentRatio = getValues(`roomTypes.${idx}.ratio`) || 0;
		const newTotal = currentTotal - currentRatio + value;

		if (newTotal > 100) {
			return "部屋タイプごとの合計を100%以下になるように調整してください";
		}
		if (value < 0) {
			return "割合は0%以上である必要があります";
		}
		return true;
	};

	// 部屋面積からランクを取得
	const getRoomRank = (roomArea: number) => {
		if (roomArea >= 1 && roomArea <= 25)
			return { rank: "A", minCapacity: 1, maxCapacity: 4 };
		if (roomArea >= 26 && roomArea <= 40)
			return { rank: "B", minCapacity: 1, maxCapacity: 5 };
		if (roomArea >= 41 && roomArea <= 65)
			return { rank: "C", minCapacity: 2, maxCapacity: 7 };
		if (roomArea >= 66 && roomArea <= 100)
			return { rank: "D", minCapacity: 3, maxCapacity: 29 };
		return null;
	};

	// 定員数のバリデーション
	const validateCapacity = (value: number, idx: number) => {
		const rt = getValues(`roomTypes.${idx}`) as RoomType;
		const roomArea = rt.roomArea || 0;

		if (value < 1) {
			return "定員数は1人以上である必要があります";
		}

		// ランクに基づく定員数制限
		const roomRank = getRoomRank(roomArea);
		if (roomRank) {
			if (value < roomRank.minCapacity || value > roomRank.maxCapacity) {
				return `定員数は${roomRank.minCapacity}人〜${roomRank.maxCapacity}人で入力してください（${roomRank.rank}ランク）`;
			}
		} else {
			// ランク外の場合は3.3㎡/人で計算
			const maxCapacity = Math.floor(roomArea / 3.3);
			if (value > maxCapacity) {
				return `定員数は最大${maxCapacity}人までです（部屋面積${roomArea}㎡÷3.3㎡）`;
			}
		}

		return true;
	};

	// ベッド数のバリデーション
	const validateBeds = (value: number, idx: number) => {
		const rt = getValues(`roomTypes.${idx}`) as RoomType;
		const capacity = rt.capacity || 0;
		const roomArea = rt.roomArea || 0;

		if (value < 1) {
			return "ベッド数は1台以上である必要があります";
		}

		// ベッド数は定員数以下である必要がある
		if (value > capacity) {
			return `ベッド数は定員数（${capacity}人）以下である必要があります`;
		}

		// ランクに基づくベッド数制限
		const roomRank = getRoomRank(roomArea);
		if (roomRank) {
			// cleaning-price.csvのデータに基づく制限
			let maxBeds = 0;
			switch (roomRank.rank) {
				case "A":
					maxBeds = 4; // Aランクは最大4台
					break;
				case "B":
					maxBeds = 5; // Bランクは最大5台
					break;
				case "C":
					maxBeds = 7; // Cランクは最大7台
					break;
				case "D":
					maxBeds = 29; // Dランクは最大29台
					break;
			}

			if (value > maxBeds) {
				return `ベッド数は最大${maxBeds}台までです（${roomRank.rank}ランク）`;
			}
		}

		return true;
	};

	const handleAdd = async () => {
		const lastIndex = fields.length - 1;
		const ok = await trigger([
			`roomTypes.${lastIndex}.ratio`,
			`roomTypes.${lastIndex}.roomArea`,
			`roomTypes.${lastIndex}.capacity`,
			`roomTypes.${lastIndex}.beds`,
			`roomTypes.${lastIndex}.cleaningUnitPrice`,
			`roomTypes.${lastIndex}.consumablesPerNight`,
		]);
		if (!ok) return;

		append({
			name: "",
			ratio: 0,
			roomArea: 0,
			computedRooms: 0,
			capacity: 0,
			beds: 0,
			cleaningUnitPrice: 0,
			consumablesPerNight: 0,
			lodgingUnitPrice: 0,
			avgStayNights: 0,
		});
	};

	return (
		<div className="w-full">
			<div className="grid w-full grid-cols-2 justify-center gap-x-10 gap-y-20">
				{fields.map((f, idx) => (
					<div
						key={f.id}
						className="relative grid w-full grid-cols-6 gap-5 rounded-[12px] border border-[#E4E4E7] bg-white p-10"
					>
						{/* タイトル */}
						<FormField
							control={control}
							name={`roomTypes.${idx}.name`}
							render={({ field }) => {
								return (
									<FormItem className="col-span-6">
										<FormControl>
											<Input
												{...field}
												placeholder="部屋名を入力"
												onChange={(e) => {
													// リアルタイムでフォーム値を更新（ローカルストレージ保存のため）
													field.onChange(e.target.value);
												}}
												onBlur={(e) => {
													// フォーカスが外れた時に値をトリムして確定
													const val = e.target.value.trim();
													setValue(`roomTypes.${idx}.name`, val, {
														shouldDirty: true,
													});
												}}
												className="!text-xl h-auto cursor-text border-0 bg-transparent p-0 shadow-none focus-visible:outline-none focus-visible:ring-0"
											/>
										</FormControl>
									</FormItem>
								);
							}}
						/>
						{isRatioRequired && (
							<>
								{/* タイプAの割合（%） */}
								<FormField
									control={control}
									name={`roomTypes.${idx}.ratio`}
									rules={{
										required: false,
										min: 0,
										max: 100,
										validate: (value) => validateRatio(value || 0, idx),
										onChange: () => recomputeRooms(idx),
									}}
									render={({ field, fieldState }) => (
										<FormItem className="col-span-2">
											<FormLabel>
												タイプの割合<span className="text-[#DC2626]">*</span>
											</FormLabel>
											<FormControl>
												<Input
													inputMode="numeric"
													placeholder="30"
													{...field}
													onFocus={(e) => e.target.select()}
													value={field.value ? `${field.value}%` : ""}
													onChange={(e) => {
														// 全角を半角に変換してから単位を除去して数値のみを取得
														const halfWidth = toHalfWidth(e.target.value);
														const numericValue = halfWidth.replace(/[%]/g, "");
														if (
															numericValue === "" ||
															!Number.isNaN(Number(numericValue))
														) {
															field.onChange(
																numericValue === ""
																	? undefined
																	: Number(numericValue),
															);
														}
													}}
													className={fieldState.error ? "border-red-500" : ""}
												/>
											</FormControl>
											{fieldState.error && (
												<p className="text-red-500 text-sm">
													{fieldState.error.message}
												</p>
											)}
										</FormItem>
									)}
								/>
							</>
						)}

						{/* 部屋面積（㎡） */}
						<FormField
							control={control}
							name={`roomTypes.${idx}.roomArea`}
							rules={{
								required: true,
								min: 1,
								validate: (value) => validateRoomArea(value || 0, idx),
								onChange: () => recomputeRooms(idx),
							}}
							render={({ field, fieldState }) => (
								<FormItem className={`col-span-${isRatioRequired ? "2" : "3"}`}>
									<FormLabel>
										部屋面積<span className="text-[#DC2626]">*</span>
									</FormLabel>
									<FormControl>
										<Input
											inputMode="numeric"
											placeholder="30㎡"
											{...field}
											onFocus={(e) => e.target.select()}
											value={field.value ? `${field.value}㎡` : ""}
											onChange={(e) => {
												// 全角を半角に変換してから単位を除去して数値のみを取得
												const halfWidth = toHalfWidth(e.target.value);
												const numericValue = halfWidth.replace(/[㎡]/g, "");
												if (
													numericValue === "" ||
													!Number.isNaN(Number(numericValue))
												) {
													field.onChange(
														numericValue === ""
															? undefined
															: Number(numericValue),
													);
												}
											}}
											className={fieldState.error ? "border-red-500" : ""}
										/>
									</FormControl>
									{fieldState.error && (
										<p className="text-red-500 text-sm">
											{fieldState.error.message}
										</p>
									)}
									{!fieldState.error &&
										isRatioRequired &&
										canCalculateMaxArea(idx) &&
										(() => {
											const maxArea = getMaxRoomArea(idx);
											return maxArea !== null ? (
												<p className="text-gray-500 text-xs">
													{Math.floor(maxArea)}㎡まで入力可能です
												</p>
											) : null;
										})()}
								</FormItem>
							)}
						/>
						{/* 算出部屋数（読み取り専用） */}
						<FormField
							control={control}
							name={`roomTypes.${idx}.computedRooms`}
							render={({ field }) => (
								<FormItem className={`col-span-${isRatioRequired ? "2" : "3"}`}>
									<FormLabel>算出部屋数</FormLabel>
									<FormControl>
										<Input
											inputMode="numeric"
											placeholder="3部屋"
											{...field}
											onFocus={(e) => e.target.select()}
											value={field.value ? `${field.value}部屋` : ""}
											onChange={(e) => {
												// 全角を半角に変換してから単位を除去して数値のみを取得
												const halfWidth = toHalfWidth(e.target.value);
												const numericValue = halfWidth.replace(/[部屋]/g, "");
												if (
													numericValue === "" ||
													!Number.isNaN(Number(numericValue))
												) {
													field.onChange(
														numericValue === ""
															? undefined
															: Number(numericValue),
													);
												}
											}}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
						{/* 定員数 */}
						<FormField
							control={control}
							name={`roomTypes.${idx}.capacity`}
							rules={{
								required: true,
								min: 1,
								validate: (value) => validateCapacity(value || 0, idx),
							}}
							render={({ field, fieldState }) => (
								<FormItem className="col-span-3">
									<FormLabel>
										定員数<span className="text-[#DC2626]">*</span>
									</FormLabel>
									<FormControl>
										<Input
											inputMode="numeric"
											placeholder="4人"
											{...field}
											onFocus={(e) => e.target.select()}
											value={field.value ? `${field.value}人` : ""}
											onChange={(e) => {
												// 全角を半角に変換してから単位を除去して数値のみを取得
												const halfWidth = toHalfWidth(e.target.value);
												const numericValue = halfWidth.replace(/[人]/g, "");
												if (
													numericValue === "" ||
													!Number.isNaN(Number(numericValue))
												) {
													field.onChange(
														numericValue === ""
															? undefined
															: Number(numericValue),
													);
												}
											}}
											className={fieldState.error ? "border-red-500" : ""}
										/>
									</FormControl>
									{fieldState.error && (
										<p className="text-red-500 text-sm">
											{fieldState.error.message}
										</p>
									)}
									{!fieldState.error &&
										(() => {
											const rt = getValues(`roomTypes.${idx}`) as RoomType;
											const roomArea = rt.roomArea || 0;
											const roomRank = getRoomRank(roomArea);

											if (roomArea > 0) {
												if (roomRank) {
													return (
														<p className="text-gray-500 text-xs">
															{roomRank.minCapacity}人〜{roomRank.maxCapacity}
															人（{roomRank.rank}
															ランク）
														</p>
													);
												} else {
													const maxCapacity = Math.floor(roomArea / 3.3);
													return (
														<p className="text-gray-500 text-xs">
															最大: {maxCapacity}人（{roomArea}㎡÷3.3㎡）
														</p>
													);
												}
											}
											return null;
										})()}
								</FormItem>
							)}
						/>
						{/* ベッド数 */}
						<FormField
							control={control}
							name={`roomTypes.${idx}.beds`}
							rules={{
								required: true,
								min: 1,
								validate: (value) => validateBeds(value || 0, idx),
							}}
							render={({ field, fieldState }) => (
								<FormItem className="col-span-3">
									<FormLabel>
										ベッド数<span className="text-[#DC2626]">*</span>
									</FormLabel>
									<FormControl>
										<Input
											inputMode="numeric"
											placeholder="4台"
											{...field}
											onFocus={(e) => e.target.select()}
											value={field.value ? `${field.value}台` : ""}
											onChange={(e) => {
												// 全角を半角に変換してから単位を除去して数値のみを取得
												const halfWidth = toHalfWidth(e.target.value);
												const numericValue = halfWidth.replace(/[台]/g, "");
												if (
													numericValue === "" ||
													!Number.isNaN(Number(numericValue))
												) {
													field.onChange(
														numericValue === ""
															? undefined
															: Number(numericValue),
													);
												}
											}}
											className={fieldState.error ? "border-red-500" : ""}
										/>
									</FormControl>
									{fieldState.error && (
										<p className="text-red-500 text-sm">
											{fieldState.error.message}
										</p>
									)}
									{!fieldState.error &&
										(() => {
											const rt = getValues(`roomTypes.${idx}`) as RoomType;
											const roomArea = rt.roomArea || 0;
											const capacity = rt.capacity || 0;
											const roomRank = getRoomRank(roomArea);

											if (roomArea > 0 && capacity > 0) {
												return (
													<p className="text-gray-500 text-xs">
														{roomRank ? (
															<>
																最大: {roomRank.maxCapacity}台（{roomRank.rank}
																ランク）
															</>
														) : (
															<>定員数以下で入力してください</>
														)}
													</p>
												);
											}
											return null;
										})()}
								</FormItem>
							)}
						/>
						{/* 清掃単価 */}
						<FormField
							control={control}
							name={`roomTypes.${idx}.cleaningUnitPrice`}
							rules={{ required: true, min: 0 }}
							render={({ field }) => (
								<FormItem className="col-span-3">
									<FormLabel>
										清掃単価<span className="text-[#DC2626]">*</span>
									</FormLabel>
									<FormControl>
										<Input
											inputMode="numeric"
											placeholder="0,000円"
											{...field}
											onFocus={(e) => e.target.select()}
											value={
												field.value ? `${field.value.toLocaleString()}円` : ""
											}
											onChange={(e) => {
												// 全角を半角に変換してからカンマと単位を除去して数値のみを取得
												const halfWidth = toHalfWidth(e.target.value);
												const numericValue = halfWidth.replace(/[,円]/g, "");
												// 数値のみの場合のみ更新
												if (
													numericValue === "" ||
													!Number.isNaN(Number(numericValue))
												) {
													field.onChange(
														numericValue === ""
															? undefined
															: Number(numericValue),
													);
												}
											}}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
						{/* 消耗品費/泊 */}
						<FormField
							control={control}
							name={`roomTypes.${idx}.consumablesPerNight`}
							rules={{ min: 0 }}
							render={({ field }) => (
								<FormItem className="col-span-3">
									<FormLabel>消耗品費（一泊あたり）</FormLabel>
									<FormControl>
										<Input
											inputMode="numeric"
											placeholder="300円"
											{...field}
											onFocus={(e) => e.target.select()}
											value={
												field.value ? `${field.value.toLocaleString()}円` : ""
											}
											onChange={(e) => {
												// 全角を半角に変換してからカンマと単位を除去して数値のみを取得
												const halfWidth = toHalfWidth(e.target.value);
												const numericValue = halfWidth.replace(/[,円]/g, "");
												// 数値のみの場合のみ更新
												if (
													numericValue === "" ||
													!Number.isNaN(Number(numericValue))
												) {
													field.onChange(
														numericValue === ""
															? undefined
															: Number(numericValue),
													);
												}
											}}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
						{/* 宿泊単価 */}
						<FormField
							control={control}
							name={`roomTypes.${idx}.lodgingUnitPrice`}
							rules={{ required: true, min: 1 }}
							render={({ field }) => (
								<FormItem className="col-span-3">
									<FormLabel>
										宿泊単価<span className="text-[#DC2626]">*</span>
									</FormLabel>
									<FormControl>
										<Input
											inputMode="numeric"
											placeholder="0,000円"
											{...field}
											onFocus={(e) => e.target.select()}
											value={
												field.value ? `${field.value.toLocaleString()}円` : ""
											}
											onChange={(e) => {
												// 全角を半角に変換してからカンマと単位を除去して数値のみを取得
												const halfWidth = toHalfWidth(e.target.value);
												const numericValue = halfWidth.replace(/[,円]/g, "");
												// 数値のみの場合のみ更新
												if (
													numericValue === "" ||
													!Number.isNaN(Number(numericValue))
												) {
													field.onChange(
														numericValue === ""
															? undefined
															: Number(numericValue),
													);
												}
											}}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
						{/* 平均宿泊数 */}
						<FormField
							control={control}
							name={`roomTypes.${idx}.avgStayNights`}
							rules={{ min: 0 }}
							render={({ field }) => (
								<FormItem className="col-span-3">
									<FormLabel>平均宿泊数</FormLabel>
									<FormControl>
										<Input
											inputMode="decimal"
											placeholder="1.5泊（例：1.5、1,5、2.0）"
											value={field.value ? `${field.value}泊` : ""}
											onFocus={(e) => {
												// フォーカス時は数値部分のみを選択
												const currentValue = e.target.value;
												const numericPart = currentValue.replace(/[泊]/g, "");
												const startPos = 0;
												const endPos = numericPart.length;
												e.target.setSelectionRange(startPos, endPos);
											}}
											onChange={(e) => {
												// 全角を半角に変換
												const halfWidth = toHalfWidth(e.target.value);

												// 全角小数点「．」を半角小数点「.」に変換
												let normalizedValue = halfWidth.replace(/[．]/g, ".");

												// 日本語のカンマ「、」を小数点「.」に変換
												normalizedValue = normalizedValue.replace(/[,]/g, ".");

												// 単位「泊」を除去して数値部分のみを取得
												const numericValue = normalizedValue.replace(
													/[泊]/g,
													"",
												);

												// 有効な数値入力パターンをチェック
												// 空文字、数字のみ、小数点のみ、数字+小数点、数字+小数点+数字を許可
												const isValidInput =
													numericValue === "" ||
													/^(\d*\.?\d*)$/.test(numericValue);

												if (isValidInput) {
													if (numericValue === "") {
														field.onChange(undefined);
													} else if (numericValue === ".") {
														// 小数点のみの場合は0に変換
														field.onChange(0);
													} else {
														const numValue = Number(numericValue);
														if (!Number.isNaN(numValue) && numValue >= 0) {
															field.onChange(numValue);
														}
													}
												}
											}}
											onBlur={(e) => {
												// フォーカスが外れた時に値を確定
												let currentValue = e.target.value.replace(/[泊]/g, "");

												// カンマを小数点に変換
												currentValue = currentValue.replace(/[,]/g, ".");

												if (currentValue === "") {
													field.onChange(undefined);
												} else if (currentValue === ".") {
													// 小数点のみの場合は0に変換
													field.onChange(0);
												} else {
													const numValue = Number(currentValue);
													if (!Number.isNaN(numValue) && numValue >= 0) {
														field.onChange(numValue);
													}
												}
											}}
										/>
									</FormControl>
								</FormItem>
							)}
						/>
						{idx !== 0 && (
							<Button
								type="button"
								variant="secondary"
								className="absolute top-10 right-10 bg-red-100 text-white"
								onClick={() => remove(idx)}
								disabled={fields.length === 1}
							>
								削除
							</Button>
						)}
					</div>
				))}

				{/* 末尾にも追加ボタン（最後のカード内と同じ挙動） */}
			</div>
			<div className="mt-16 flex justify-center">
				<Button type="button" variant="ghost" onClick={handleAdd}>
					＋ 部屋タイプを追加
				</Button>
			</div>
		</div>
	);
}
