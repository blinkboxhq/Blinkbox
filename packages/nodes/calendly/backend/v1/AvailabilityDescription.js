/**
 * Calendly — User Availability Schedules & Busy Times.
 */
import { need, me, uuidOf } from "../GenericFunctions.js";

async function opListUserAvailabilitySchedules(config, { api }) {
  const user = config.userUri || (await me(api)).uri;
  const { data } = await api.get("/user_availability_schedules", { params: { user } });
  return { success: true, schedules: data.collection };
}

async function opGetAvailabilitySchedule(config, { api }) {
  const g = need(config, "scheduleUri", "getAvailabilitySchedule"); if (g) return g;
  const { data } = await api.get(`/user_availability_schedules/${uuidOf(config.scheduleUri)}`);
  return { success: true, ...data.resource };
}

async function opGetUserBusyTimes(config, { api }) {
  const s = need(config, "startTime", "getUserBusyTimes"); if (s) return s;
  const e = need(config, "endTime", "getUserBusyTimes"); if (e) return e;
  const user = config.userUri || (await me(api)).uri;
  const { data } = await api.get("/user_busy_times", {
    params: { user, start_time: config.startTime, end_time: config.endTime },
  });
  return { success: true, busyTimes: data.collection };
}

export const availabilityOperations = {
  listUserAvailabilitySchedules: opListUserAvailabilitySchedules,
  getAvailabilitySchedule: opGetAvailabilitySchedule,
  getUserBusyTimes: opGetUserBusyTimes,
};
