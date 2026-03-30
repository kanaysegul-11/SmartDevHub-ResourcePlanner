const SIDEBAR_ORDER_STORAGE_PREFIX = "nexus:sidebar-order";

const sanitizeSidebarOrder = (savedOrder, availableIds) => {
  const normalizedAvailableIds = availableIds.filter(Boolean);
  const uniqueSavedIds = Array.isArray(savedOrder)
    ? savedOrder.filter(
        (id, index) =>
          normalizedAvailableIds.includes(id) && savedOrder.indexOf(id) === index
      )
    : [];

  return [
    ...uniqueSavedIds,
    ...normalizedAvailableIds.filter((id) => !uniqueSavedIds.includes(id)),
  ];
};

export function getSidebarOrderStorageKey(sectionKey, userKey) {
  return `${SIDEBAR_ORDER_STORAGE_PREFIX}:${userKey}:${sectionKey}`;
}

export function readSidebarOrder(sectionKey, userKey, availableIds) {
  if (typeof window === "undefined") {
    return sanitizeSidebarOrder([], availableIds);
  }

  try {
    const storageKey = getSidebarOrderStorageKey(sectionKey, userKey);
    const savedOrder = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return sanitizeSidebarOrder(savedOrder, availableIds);
  } catch {
    return sanitizeSidebarOrder([], availableIds);
  }
}

export function writeSidebarOrder(sectionKey, userKey, orderedIds) {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = getSidebarOrderStorageKey(sectionKey, userKey);
  localStorage.setItem(storageKey, JSON.stringify(orderedIds));
}

export function reorderSidebarItems(orderedIds, sourceId, targetId, placement = "after") {
  if (!sourceId || sourceId === targetId) {
    return orderedIds;
  }

  const nextOrder = [...orderedIds];
  const sourceIndex = nextOrder.indexOf(sourceId);

  if (sourceIndex === -1) {
    return orderedIds;
  }

  nextOrder.splice(sourceIndex, 1);

  if (!targetId) {
    nextOrder.push(sourceId);
    return nextOrder;
  }

  const targetIndex = nextOrder.indexOf(targetId);

  if (targetIndex === -1) {
    nextOrder.push(sourceId);
    return nextOrder;
  }

  const insertIndex = placement === "before" ? targetIndex : targetIndex + 1;
  nextOrder.splice(insertIndex, 0, sourceId);

  return nextOrder;
}
