// In-memory storage acting as a database repository
const notifications = new Map();

export async function createNotification(data) {
  const newNotif = {
    id: String(Date.now()) + Math.floor(Math.random() * 1000),
    studentId: data.studentId,
    type: data.type,
    message: data.message,
    isRead: false,
    createdAt: Date.now()
  };
  notifications.set(newNotif.id, newNotif);
  return newNotif;
}

export async function findById(id) {
  return notifications.get(id);
}

export async function update(id, updates) {
  const notif = notifications.get(id);
  if (!notif) return null;
  
  const updated = { ...notif, ...updates };
  notifications.set(id, updated);
  return updated;
}

export async function findAll() {
  return Array.from(notifications.values());
}
