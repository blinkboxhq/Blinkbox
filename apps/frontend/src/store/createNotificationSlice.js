export const createNotificationSlice = (set, get) => ({
  notifications: [],

  addNotification: ({ type = "info", title, message = "", action = null, duration }) => {
    const id = `notif-${Date.now()}-${Math.random()}`;
    set((s) => ({ notifications: [...s.notifications.slice(-4), { id, type, title, message, action }] }));

    const ms = duration ?? (type === "error" ? 0 : type === "warning" ? 7000 : 5000);
    if (ms > 0) setTimeout(() => get().dismissNotification(id), ms);
    return id;
  },

  dismissNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),

  clearNotifications: () => set({ notifications: [] }),
});
