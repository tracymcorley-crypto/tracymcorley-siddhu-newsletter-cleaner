const STORAGE_KEY = "newsletter_cleaner_history";
const MAX_ENTRIES = 50;

export function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveHistoryEntry(entry) {
  const history = loadHistory();
  history.unshift(entry);
  const trimmed = history.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    return false;
  }
  return trimmed;
}

export function deleteHistoryEntry(id) {
  const history = loadHistory();
  const filtered = history.filter((h) => h.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    return false;
  }
  return filtered;
}

export function clearHistory() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    return false;
  }
  return true;
}

export function createHistoryEntry(original, cleaned, stats, options) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    date: new Date().toISOString(),
    original,
    cleaned,
    stats,
    options,
    preview: original.slice(0, 150),
  };
}
