export function ok(res, data = null, message = 'OK', status = 200) {
  return res.status(status).json({ success: true, data, message });
}

export function created(res, data = null, message = 'Created') {
  return ok(res, data, message, 201);
}

export function parsePagination(query, { defaultLimit = 12, maxLimit = 50 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export function paged(data, { page, limit, total }) {
  return { items: data, page, limit, total, hasMore: page * limit < total };
}
