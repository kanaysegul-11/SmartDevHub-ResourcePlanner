import { apiClient, getApiBaseUrl } from "./axios";

const ensureId = (item, index) => {
  if (item && (item.id !== undefined && item.id !== null)) {
    return item;
  }
  if (item && (item.pk !== undefined && item.pk !== null)) {
    return { ...item, id: item.pk };
  }
  if (item && (item.uuid !== undefined && item.uuid !== null)) {
    return { ...item, id: item.uuid };
  }
  return { ...item, id: index };
};

const normalizeArray = (items = []) => {
  const plain = JSON.parse(JSON.stringify(items));
  return plain.map((item, index) => {
    if (item && typeof item === "object") {
      return ensureId({ ...item }, index);
    }
    return ensureId({ value: item }, index);
  });
};

const normalizeListResponse = (response) => {
  const payload = response.data;
  if (Array.isArray(payload)) {
    return { data: normalizeArray(payload), total: payload.length };
  }
  if (payload && Array.isArray(payload.data)) {
    return {
      data: normalizeArray(payload.data),
      total:
        typeof payload.total === "number"
          ? payload.total
          : payload.data.length,
    };
  }
  if (payload && Array.isArray(payload.results)) {
    return {
      data: normalizeArray(payload.results),
      total:
        typeof payload.count === "number"
          ? payload.count
          : payload.results.length,
    };
  }
  return { data: [], total: 0 };
};

const buildQueryParams = ({ pagination, sorters, filters }) => {
  const params = {};

  if (pagination?.current) {
    params.page = pagination.current;
    params.page_size = pagination.pageSize;
  }

  if (sorters?.length) {
    params.ordering = sorters
      .map((sorter) =>
        sorter.order === "desc" ? `-${sorter.field}` : sorter.field
      )
      .join(",");
  }

  if (filters?.length) {
    filters.forEach((filter) => {
      if (!filter?.field) {
        return;
      }
      const value = filter.value;
      if (value === undefined || value === null || value === "") {
        return;
      }
      params[filter.field] = value;
    });
  }

  return params;
};

export const dataProvider = {
  getList: async ({ resource, pagination, filters, sorters }) => {
    const params = buildQueryParams({ pagination, filters, sorters });
    const response = await apiClient.get(`/${resource}/`, { params });
    console.log(`[Refine:getList] ${resource}`, response.data);
    console.log(
      `[Refine:getList:json] ${resource}`,
      JSON.stringify(response.data)
    );

    let payload = response.data;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = [];
      }
    }

    if (Array.isArray(payload)) {
      const data = normalizeArray(payload);
      const result = { data, total: data.length };
      console.log(`[Refine:getList:normalized] ${resource}`, result);
      return result;
    }

    const normalized = normalizeListResponse({ data: payload });
    console.log(`[Refine:getList:normalized] ${resource}`, normalized);
    return normalized;
  },
  getOne: async ({ resource, id }) => {
    const response = await apiClient.get(`/${resource}/${id}/`);
    console.log(`[Refine:getOne] ${resource}/${id}`, response.data);
    return { data: response.data };
  },
  create: async ({ resource, variables }) => {
    const response = await apiClient.post(`/${resource}/`, variables);
    return { data: response.data };
  },
  update: async ({ resource, id, variables }) => {
    const response = await apiClient.patch(`/${resource}/${id}/`, variables);
    return { data: response.data };
  },
  deleteOne: async ({ resource, id }) => {
    const response = await apiClient.delete(`/${resource}/${id}/`);
    return { data: response.data || { id } };
  },
  getApiUrl: () => getApiBaseUrl(),
};
