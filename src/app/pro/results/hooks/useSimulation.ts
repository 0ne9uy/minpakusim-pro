"use client";

import { useCallback, useEffect, useState } from "react";
import { type SimulateOptions, simulate } from "../../lib/simulate";
import type { FormValues, RoomType } from "../../lib/types";

type SimState<T> =
  | { loading: true; error?: undefined; data?: undefined }
  | { loading: false; error?: string; data?: undefined }
  | { loading: false; error?: undefined; data: T };

export function useSimulation(
  facility: FormValues,
  rooms: RoomType[],
  simulateOptions?: SimulateOptions,
) {
  const [state, setState] = useState<SimState<Awaited<ReturnType<typeof simulate>>>>({
    loading: true,
  });

  const run = useCallback(async () => {
    try {
      setState({ loading: true });
      const data = await simulate(facility, rooms, simulateOptions);
      setState({ loading: false, data });
    } catch (e: any) {
      setState({ loading: false, error: e?.message ?? "Failed to simulate" });
    }
  }, [facility, rooms, simulateOptions]);

  useEffect(() => {
    run();
  }, [run]);

  return state;
}
