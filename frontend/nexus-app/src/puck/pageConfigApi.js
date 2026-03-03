import { apiClient } from "../refine/axios";
import { createDefaultPuckData } from "./config";

export const PAGE_KEY_DASHBOARD_LAYOUT = "dashboard-layout";
export const PAGE_CONFIG_UPDATED_EVENT = "page-config-updated";
const ALLOWED_BLOCK_TYPES = new Set([
  "HeroBanner",
  "DashboardStatsCards",
  "DashboardSummary",
  "SentimentChart",
  "SnippetHighlights",
  "Spacer",
]);

function notifyPageConfigUpdated(pageKey) {
  if (typeof window === "undefined") {
    return;
  }
  const stamp = String(Date.now());
  window.localStorage.setItem(`${PAGE_CONFIG_UPDATED_EVENT}:${pageKey}`, stamp);
  window.dispatchEvent(
    new CustomEvent(PAGE_CONFIG_UPDATED_EVENT, { detail: { pageKey, stamp } })
  );
}

function mapLegacyItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const type = item.type;
  const props = item.props && typeof item.props === "object" ? item.props : {};

  if (type === "Hero") {
    return {
      type: "HeroBanner",
      props: {
        title: props.title || "Nexus Dashboard",
        subtitle: props.subtitle || "",
      },
    };
  }

  if (type === "Stats") {
    const items = Array.isArray(props.items) ? props.items : [];
    return {
      type: "DashboardStatsCards",
      props: {
        data: items.map((x) => ({
          label: x?.label || "Metin",
          value: x?.value?.toString?.() || "0",
          badgeText: "",
        })),
      },
    };
  }

  if (type === "Callout") {
    return {
      type: "SnippetHighlights",
      props: {
        title: props.title || "Snippet Ozetleri",
        limit: 3,
      },
    };
  }

  if (ALLOWED_BLOCK_TYPES.has(type)) {
    return {
      ...item,
      props,
    };
  }

  return null;
}

export function normalizePuckData(payload) {
  const base = payload && typeof payload === "object" ? payload : createDefaultPuckData();
  const content = Array.isArray(base.content) ? base.content : [];
  const mapped = content
    .map(mapLegacyItem)
    .filter((item) => item && ALLOWED_BLOCK_TYPES.has(item.type));
  return {
    ...createDefaultPuckData(),
    ...base,
    content: mapped.length ? mapped : createDefaultPuckData().content,
    root: base.root && typeof base.root === "object" ? base.root : { props: {} },
  };
}

export async function fetchPageConfig(pageKey = PAGE_KEY_DASHBOARD_LAYOUT) {
  try {
    const response = await apiClient.get(`/page-configs/${pageKey}/`, {
      params: { _ts: Date.now() },
      headers: { "Cache-Control": "no-cache" },
    });
    const payload = response.data?.data;
    if (payload) {
      return normalizePuckData(payload);
    }
    return normalizePuckData(createDefaultPuckData());
  } catch (error) {
    if (error?.response?.status !== 404) {
      throw error;
    }

    // Migration fallback: previously saved layout might exist under "home"
    try {
      const legacyResponse = await apiClient.get("/page-configs/home/", {
        params: { _ts: Date.now() },
        headers: { "Cache-Control": "no-cache" },
      });
      const legacyPayload = legacyResponse.data?.data;
      return normalizePuckData(legacyPayload);
    } catch {
      return normalizePuckData(createDefaultPuckData());
    }
  }
}

export async function savePageConfig(data, pageKey = PAGE_KEY_DASHBOARD_LAYOUT) {
  const normalizedData = normalizePuckData(data);
  try {
    await apiClient.patch(`/page-configs/${pageKey}/`, { data: normalizedData });
    notifyPageConfigUpdated(pageKey);
    return;
  } catch (error) {
    if (error?.response?.status !== 404) {
      throw error;
    }
  }

  await apiClient.post("/page-configs/", {
    key: pageKey,
    data: normalizedData,
  });
  notifyPageConfigUpdated(pageKey);
}
