/** Prefix a root-relative path with the configured base (e.g. GitHub Pages subpath). */
export const url = (path = '/') => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};
