import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type NavigateOptions = { replace?: boolean };
type RouterCtx = { path: string; navigate: (to: string, opts?: NavigateOptions) => void };

const RouterContext = createContext<RouterCtx | null>(null);

function getPath() {
	return window.location.pathname || "/";
}

function onPathChange(cb: () => void) {
	const handler = () => cb();
	window.addEventListener("popstate", handler);
	window.addEventListener("router:navigate", handler as any);
	return () => {
		window.removeEventListener("popstate", handler);
		window.removeEventListener("router:navigate", handler as any);
	};
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
	const [path, setPath] = useState(getPath());

	const navigate = (to: string, opts?: NavigateOptions) => {
		if (opts?.replace) history.replaceState({}, "", to);
		else history.pushState({}, "", to);
		window.dispatchEvent(new Event("router:navigate"));
	};

	useEffect(() => onPathChange(() => setPath(getPath())), []);

	const value = useMemo(() => ({ path, navigate }), [path]);
	return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
	const ctx = useContext(RouterContext);
	if (!ctx) throw new Error("useRouter must be used within <RouterProvider>");
	return ctx;
}

// function escapeRegex(s: string) {
//   	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// }

/** Match a pattern like "/canvas/:slug" against a path. */
export function matchRoute(pattern: string, path: string): null | Record<string, string> {
	const p = pattern.replace(/\/+$/, "");
	const x = path.replace(/\/+$/, "");
	if (p === "" && x === "") return {};
	const pSegs = p.split("/").filter(Boolean);
	const xSegs = x.split("/").filter(Boolean);
	if (pSegs.length !== xSegs.length) return null;

	const params: Record<string, string> = {};
	for (let i = 0; i < pSegs.length; i++) {
		const ps = pSegs[i];
		const xs = xSegs[i];
		if (ps.startsWith(":")) {
			params[ps.slice(1)] = decodeURIComponent(xs);
		} else if (ps !== xs) {
			return null;
		}
	}
	return params;
}

/** A lightweight <Link> that preserves new-tab/middle-click behavior. */
export function Link(
  	props: React.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; replace?: boolean }
) {
	const { to, replace, onClick, ...rest } = props;
	const { navigate } = useRouter();
	return (
		<a
			href={to}
			{...rest}
			onClick={(e) => {
				onClick?.(e);
				// Allow cmd/ctrl/middle-click to open in new tab
				if (
				e.defaultPrevented ||
				e.button !== 0 ||
				e.metaKey ||
				e.ctrlKey ||
				e.altKey ||
				e.shiftKey
				) {
				return;
				}
				e.preventDefault();
				navigate(to, { replace });
			}}
		/>
	);
}

export function useNavigate() {
  return useRouter().navigate;
}