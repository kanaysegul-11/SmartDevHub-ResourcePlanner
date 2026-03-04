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

function makeFallbackId(type, index) {
  return `${type}-${index}-${Math.random().toString(36).slice(2, 8)}`;
}

function sanitizePropsByType(type, props) {
  if (type === "HeroBanner") {
    return {
      title: typeof props?.title === "string" ? props.title : "Nexus Dashboard",
      subtitle: typeof props?.subtitle === "string" ? props.subtitle : "",
    };
  }

  if (type === "DashboardStatsCards") {
    const list = Array.isArray(props?.data) ? props.data : [];
    return {
      data: list
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          label: item?.label?.toString?.() || "Metin",
          value: item?.value?.toString?.() || "0",
          badgeText: item?.badgeText?.toString?.() || "",
        })),
    };
  }

  if (type === "SnippetHighlights") {
    const limitNum = Number(props?.limit);
    return {
      title: typeof props?.title === "string" ? props.title : "Snippet Ozetleri",
      limit: Number.isFinite(limitNum) ? limitNum : 3,
    };
  }

  if (type === "Spacer") {
    const sizeNum = Number(props?.size);
    return {
      size: Number.isFinite(sizeNum) ? sizeNum : 24,
    };
  }

  return props && typeof props === "object" ? props : {};
}

function mapLegacyItem(item, index) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const type = item.type;
  const rawProps = item.props && typeof item.props === "object" ? item.props : {};

  if (type === "Hero") {
    return {
      type: "HeroBanner",
      props: {
        ...sanitizePropsByType("HeroBanner", rawProps),
      },
      id: item.id || makeFallbackId("HeroBanner", index),
    };
  }

  if (type === "Stats") {
    const items = Array.isArray(rawProps.items) ? rawProps.items : [];
    return {
      type: "DashboardStatsCards",
      props: sanitizePropsByType("DashboardStatsCards", {
        data: items.map((x) => ({
          label: x?.label || "Metin",
          value: x?.value?.toString?.() || "0",
          badgeText: "",
        })),
      }),
      id: item.id || makeFallbackId("DashboardStatsCards", index),
    };
  }

  if (type === "Callout") {
    return {
      type: "SnippetHighlights",
      props: {
        ...sanitizePropsByType("SnippetHighlights", { title: rawProps.title, limit: 3 }),
      },
      id: item.id || makeFallbackId("SnippetHighlights", index),
    };
  }

  if (ALLOWED_BLOCK_TYPES.has(type)) {
    return {
      ...item,
      type,
      props: sanitizePropsByType(type, rawProps),
      id: item.id || makeFallbackId(type, index),
    };
  }

  return null;
}

export function normalizePuckData(payload) {
  const fallback = createDefaultPuckData();
  const base = payload && typeof payload === "object" ? payload : fallback;
  const content = Array.isArray(base.content) ? base.content : [];
  const mapped = content
    .map((item, index) => mapLegacyItem(item, index))
    .filter((item) => item && ALLOWED_BLOCK_TYPES.has(item.type));

  return {
    ...fallback,
    ...base,
    content: mapped.length ? mapped : fallback.content,
    root: base.root && typeof base.root === "object" ? base.root : { props: {} },
    zones: {},
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